
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Order from "@/lib/db/models/order";
import Product from "@/lib/db/models/product";
import User from "@/lib/db/models/user";
import paystack from "@/lib/config/paystack";
import sendEmail from "@/lib/utils/sendEmail";
import { clampReservedToZero, releaseOrderReservations, resolveColorId } from "@/lib/utils/reservation";
import { requireAuth, requireAdmin } from "@/app/api/_utils/auth";
import { normalizeRefundAmount, resolveVariantForItem, generateInvoice } from "@/app/api/payments/_shared";

const PAYMENT_RESERVATION_EXTENSION_MS = 10 * 60 * 1000;

export async function verifyPayment(request: NextRequest, reference: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const userId = auth.userId;

  if (!reference) {
    return NextResponse.json({ message: "Payment reference is required" }, { status: 400 });
  }

  try {
    const response = await paystack.get(`/transaction/verify/${reference}`);
    const paystackData = response.data.data;

    if (!paystackData || paystackData.status !== "success") {
      return NextResponse.json({ message: "Payment not successful on Paystack" }, { status: 400 });
    }

    const order = await Order.findOne({ paymentRef: reference }).populate("user", "email name");

    if (!order) {
      return NextResponse.json({ message: "Order not found for this payment reference" }, { status: 404 });
    }

    if (String((order.user as any)._id) !== String(userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json({ order, message: "Payment already verified" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of order.items as any[]) {
        const product = await Product.findById(item.product).session(session);
        if (!product) continue;

        let variantUpdated = false;
        const hasVariant =
          Array.isArray(product?.variants) &&
          product.variants.length > 0 &&
          !!(item.variant?._id || item.variant?.sku || item.variant?.size || item.variant?.color);
        const allowBaseFallback =
          !item.variant?._id && !item.variant?.sku && !item.variant?.size && !item.variant?.color;
        const resolvedInfo = await resolveVariantForItem(product, item);
        const resolvedVariant = resolvedInfo.variant;

        if (resolvedVariant?._id) {
          const result = await Product.updateOne(
            {
              _id: product._id,
              variants: { $elemMatch: { _id: resolvedVariant._id, stock: { $gte: item.qty } } },
            },
            { $inc: { "variants.$[v].stock": -item.qty, "variants.$[v].reserved": -item.qty } },
            { session, arrayFilters: [{ "v._id": resolvedVariant._id }] }
          );
          if (result.modifiedCount > 0) variantUpdated = true;
        }

        if (!variantUpdated && hasVariant) {
          if (!allowBaseFallback || Number(product.stock || 0) < item.qty) {
            throw new Error(`Variant not found or insufficient stock (${resolvedInfo.reason})`);
          }
        }

        if (!variantUpdated) {
          await Product.updateOne(
            { _id: product._id, stock: { $gte: item.qty } },
            { $inc: { stock: -item.qty, reserved: -item.qty } },
            { session }
          );
        }

        await clampReservedToZero(product._id, session);
      }

      order.status = "paid";
      order.paymentStatus = "paid";
      await order.save({ session });

      await User.updateOne({ _id: (order.user as any)._id }, { $set: { cart: [] } }, { session });

      await session.commitTransaction();
      session.endSession();
    } catch (stockErr: any) {
      await session.abortTransaction();
      session.endSession();
      console.error("[VERIFY] Stock reduction failed:", stockErr?.message || stockErr);
      order.status = "paid";
      order.paymentStatus = "paid";
      await order.save();
    }

    generateInvoice(order).catch((err: any) => console.error("[VERIFY PDF]", err?.message || err));

    return NextResponse.json({ order, message: "Payment verified successfully" });
  } catch (error: any) {
    console.error("Verify error:", error?.response?.data || error?.message || error);
    return NextResponse.json({ message: "Payment verification failed" }, { status: 500 });
  }
}

const findVariantsByOptions = async (product: any, size: any, color: any) => {
  if (!product?.variants?.length) return [];
  const sizeKey = String(size || "").trim();
  const colorProvided = color !== null && color !== undefined && String(color).trim() !== "";
  const colorId = await resolveColorId(color);
  const hasColoredVariants = product.variants.some((v: any) => v?.options?.color);

  if (!sizeKey && !colorId) return [];
  if (colorProvided && !colorId && hasColoredVariants) return [];

  return product.variants.filter((v: any) => {
    const vSize = String(v?.options?.size || "").trim();
    const vColor = String(v?.options?.color?._id || v?.options?.color || "");
    if (sizeKey && colorId) return vSize === sizeKey && vColor === colorId;
    if (colorId) return vColor === colorId;
    if (sizeKey && !colorProvided) return vSize === sizeKey;
    if (sizeKey && !colorId && !hasColoredVariants) return vSize === sizeKey;
    return false;
  });
};

const resolveVariantForInitItem = async (product: any, item: any) => {
  if (!product?.variants?.length) return { variant: null, reason: "no_variants" };
  const variant = item?.variant || {};
  const hasId = !!variant?._id;
  const hasSku = !!variant?.sku;
  const hasOptions = !!(variant?.size || variant?.color);

  if (hasId) {
    const match = product.variants.find((v: any) => String(v._id) === String(variant._id)) || null;
    if (!match) return { variant: null, reason: "missing_id" };
    return { variant: match, reason: "id" };
  }

  if (hasSku) {
    const matches = product.variants.filter((v: any) => v.sku === variant.sku);
    if (matches.length === 1) return { variant: matches[0], reason: "sku" };
    if (matches.length > 1) return { variant: null, reason: "ambiguous_sku" };
    return { variant: null, reason: "missing_sku" };
  }

  if (hasOptions) {
    const matches = await findVariantsByOptions(product, variant.size, variant.color);
    if (matches.length === 1) return { variant: matches[0], reason: "options" };
    if (matches.length > 1) return { variant: null, reason: "ambiguous_options" };
    return { variant: null, reason: "missing_options" };
  }

  return { variant: null, reason: "no_variant" };
};

export async function initPaystack(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const { orderId } = body || {};
    const userId = auth.userId;

    if (!orderId) {
      return NextResponse.json({ message: "Order ID is required" }, { status: 400 });
    }

    const order = await Order.findById(orderId).populate("user", "email name");

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (String((order.user as any)._id) !== String(userId)) {
      return NextResponse.json({ message: "Unauthorized order access" }, { status: 403 });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ message: "Order already processed" }, { status: 400 });
    }

    const reference = `ORD_${order._id}_${Date.now()}`;

    const otherPending = await Order.find({
      _id: { $ne: order._id },
      user: userId,
      status: "pending",
      paymentStatus: "pending",
    }).select("_id items");

    if (otherPending.length) {
      const cleanupSession = await mongoose.startSession();
      cleanupSession.startTransaction();
      try {
        for (const pending of otherPending) {
          await releaseOrderReservations(pending, cleanupSession);
          await Order.updateOne(
            { _id: pending._id },
            { $set: { status: "cancelled", paymentStatus: "failed" } },
            { session: cleanupSession }
          );
        }
        await cleanupSession.commitTransaction();
      } catch (cleanupErr: any) {
        await cleanupSession.abortTransaction();
        console.warn("[PAYSTACK INIT] Pending reservation cleanup failed:", cleanupErr?.message || cleanupErr);
      } finally {
        cleanupSession.endSession();
      }
    }

    const reserveSession = await mongoose.startSession();
    reserveSession.startTransaction();
    try {
      for (const item of order.items as any[]) {
        const product = await Product.findById(item.product).session(reserveSession);
        if (!product) continue;

        let reserved = false;
        const hasVariant =
          Array.isArray(product?.variants) &&
          product.variants.length > 0 &&
          !!(item.variant?._id || item.variant?.sku || item.variant?.size || item.variant?.color);
        const allowBaseFallback =
          !item.variant?._id && !item.variant?.sku && !item.variant?.size && !item.variant?.color;
        const resolvedInfo = await resolveVariantForInitItem(product, item);
        const resolvedVariant = resolvedInfo.variant;

        if (resolvedVariant?._id) {
          const result = await Product.updateOne(
            {
              _id: product._id,
              variants: {
                $elemMatch: {
                  _id: resolvedVariant._id,
                  stock: { $gte: item.qty },
                  reserved: { $lte: (resolvedVariant?.stock || 0) - item.qty },
                },
              },
            },
            { $inc: { "variants.$[v].reserved": item.qty } },
            { session: reserveSession, arrayFilters: [{ "v._id": resolvedVariant._id }] }
          );
          if (result.modifiedCount > 0) reserved = true;
        }

        if (!reserved && hasVariant) {
          if (!allowBaseFallback || Number(product.stock || 0) < item.qty) {
            throw new Error(`Variant not found or insufficient stock (${resolvedInfo.reason})`);
          }
        }

        if (!reserved) {
          const result = await Product.updateOne(
            {
              _id: product._id,
              stock: { $gte: item.qty },
              reserved: { $lte: product.stock - item.qty },
            },
            { $inc: { reserved: item.qty } },
            { session: reserveSession }
          );
          if (result.modifiedCount === 0) {
            throw new Error("Insufficient product stock");
          }
        }

        await clampReservedToZero(product._id, reserveSession);
      }

      order.paymentRef = reference;
      order.expiresAt = new Date(Date.now() + PAYMENT_RESERVATION_EXTENSION_MS);
      await order.save({ session: reserveSession });

      await reserveSession.commitTransaction();
    } catch (reserveErr: any) {
      await reserveSession.abortTransaction();
      reserveSession.endSession();
      if (String(reserveErr?.message || "").toLowerCase().includes("insufficient")) {
        return NextResponse.json({ message: reserveErr.message }, { status: 409 });
      }
      return NextResponse.json({ message: reserveErr?.message || "Failed to reserve stock" }, { status: 500 });
    } finally {
      reserveSession.endSession();
    }

    const response = await paystack.post("/transaction/initialize", {
      email: (order.user as any).email,
      amount: Math.round(order.totalAmount * 100),
      reference,
      callback_url: `${process.env.CLIENT_URL}/payment/success`,
      metadata: {
        orderId: order._id.toString(),
        customerName: order.shippingAddress?.fullName || (order.user as any).name,
      },
    });

    return NextResponse.json({
      authorizationUrl: response.data.data.authorization_url,
      reference,
      expiresAt: order.expiresAt,
    });
  } catch (error: any) {
    console.error("Paystack init error:", error?.response?.data || error?.message || error);
    if (body?.orderId) {
      try {
        const order = await Order.findById(body.orderId).select("_id items");
        if (order) {
          const cleanupSession = await mongoose.startSession();
          cleanupSession.startTransaction();
          try {
            await releaseOrderReservations(order, cleanupSession);
            await Order.updateOne(
              { _id: order._id },
              { $set: { status: "cancelled", paymentStatus: "failed" } },
              { session: cleanupSession }
            );
            await cleanupSession.commitTransaction();
          } catch {
            await cleanupSession.abortTransaction();
          } finally {
            cleanupSession.endSession();
          }
        }
      } catch {
        // ignore cleanup errors
      }
    }
    return NextResponse.json({ message: "Payment initialization failed" }, { status: 500 });
  }
}
export async function refundPaystack(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, amount, reason } = body || {};
    if (!orderId) {
      return NextResponse.json({ message: "orderId is required" }, { status: 400 });
    }

    const order = await Order.findById(orderId).populate("user", "email name");
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (!order.paymentRef) {
      return NextResponse.json({ message: "Order has no payment reference" }, { status: 400 });
    }

    if (order.paymentStatus !== "paid") {
      return NextResponse.json({ message: "Order is not paid" }, { status: 400 });
    }

    const refundAmount = normalizeRefundAmount(order.totalAmount, amount);
    const payload: any = {
      transaction: order.paymentRef,
      ...(refundAmount ? { amount: Math.round(refundAmount * 100) } : {}),
      ...(reason ? { reason: String(reason).slice(0, 200) } : {}),
    };

    const response = await paystack.post("/refund", payload);
    const refundData = response?.data?.data;

    order.paymentStatus = "refunded";
    order.refundStatus = "processed";
    order.refundAmount = refundAmount || order.totalAmount || 0;
    order.refundProcessedAt = new Date();
    if (order.returnStatus && order.returnStatus !== "none") {
      order.returnStatus = "refunded";
    }
    if (reason) {
      order.returnNote = String(reason).slice(0, 500);
      order.returnMessages = [
        ...(order.returnMessages || []),
        { by: "admin", message: order.returnNote, status: "refunded" },
      ];
    }
    await order.save();

    try {
      if ((order.user as any)?.email) {
        await sendEmail({
          to: (order.user as any).email,
          subject: "Refund processed - ShopLuxe",
          title: "Refund processed",
          text: `Your refund is complete. Order ID: ${order._id}. Amount: ?${(order.refundAmount || 0).toLocaleString()}.${
            order.returnNote ? ` Note from support: ${order.returnNote}.` : ""
          }`,
          htmlContent: `
            <h1>Your refund is complete</h1>
            <div class="card">
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Amount:</strong> ?${(order.refundAmount || 0).toLocaleString()}</p>
              ${order.returnNote ? `<p><strong>Note:</strong> ${order.returnNote}</p>` : ""}
            </div>
            <div style="text-align:center; margin:20px 0;">
              <a class="button" href="${process.env.CLIENT_URL}/orders/${order._id}">View Order</a>
            </div>
            <p class="muted">If you have any questions, reply to this email.</p>
          `,
          preheader: "Your refund has been processed",
        });
      }
    } catch (emailErr: any) {
      console.error("[REFUND EMAIL] Failed:", emailErr?.message || emailErr);
    }

    return NextResponse.json({ order, refund: refundData, message: "Refund processed" });
  } catch (error: any) {
    console.error("[REFUND ERROR]", error?.response?.data || error?.message || error);
    return NextResponse.json({ message: error?.response?.data?.message || "Refund failed" }, { status: 500 });
  }
}

export async function paystackWebhook(request: NextRequest) {
  await connectDB();

  const rawBody = await request.text();
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(rawBody)
    .digest("hex");

  if (hash !== request.headers.get("x-paystack-signature")) {
    return new NextResponse(null, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.failed") {
    const order = await Order.findOne({ paymentRef: event.data.reference });
    if (order) {
      const failedSession = await mongoose.startSession();
      failedSession.startTransaction();
      try {
        await releaseOrderReservations(order, failedSession);
        order.paymentStatus = "failed";
        order.status = "failed";
        await order.save({ session: failedSession });
        await failedSession.commitTransaction();
      } catch (error: any) {
        await failedSession.abortTransaction();
        console.error("[WEBHOOK FAILED] Reservation release failed:", error?.message || error);
      } finally {
        failedSession.endSession();
      }
    }
    return new NextResponse(null, { status: 200 });
  }

  if (event.event !== "charge.success") return new NextResponse(null, { status: 200 });

  const reference = event.data.reference;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      paymentRef: reference,
      paymentStatus: { $ne: "paid" },
    })
      .populate("user")
      .session(session);

    if (!order || order.paymentStatus === "paid") {
      await session.abortTransaction();
      return new NextResponse(null, { status: 200 });
    }

    for (const item of order.items as any[]) {
      const product = await Product.findById(item.product).session(session);
      if (!product) continue;

      let variantUpdated = false;
      const hasVariant =
        Array.isArray(product?.variants) &&
        product.variants.length > 0 &&
        !!(item.variant?._id || item.variant?.sku || item.variant?.size || item.variant?.color);
      const allowBaseFallback =
        !item.variant?._id && !item.variant?.sku && !item.variant?.size && !item.variant?.color;
      const resolvedInfo = await resolveVariantForItem(product, item);
      const resolvedVariant = resolvedInfo.variant;

      if (resolvedVariant?._id) {
        const result = await Product.updateOne(
          {
            _id: product._id,
            variants: { $elemMatch: { _id: resolvedVariant._id, stock: { $gte: item.qty } } },
          },
          { $inc: { "variants.$[v].stock": -item.qty, "variants.$[v].reserved": -item.qty } },
          { session, arrayFilters: [{ "v._id": resolvedVariant._id }] }
        );
        if (result.modifiedCount === 0) throw new Error("Stock conflict (variant sold out)");
        variantUpdated = true;
      }

      if (!variantUpdated && hasVariant) {
        if (!allowBaseFallback || Number(product.stock || 0) < item.qty) {
          throw new Error(`Variant not found or insufficient stock (${resolvedInfo.reason})`);
        }
      }

      if (!variantUpdated) {
        const result = await Product.updateOne(
          { _id: product._id, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty, reserved: -item.qty } },
          { session }
        );
        if (result.modifiedCount === 0) throw new Error("Stock conflict (product sold out)");
      }

      await clampReservedToZero(product._id, session);
    }

    order.status = "paid";
    order.paymentStatus = "paid";
    await order.save({ session });

    await User.updateOne({ _id: (order.user as any)._id }, { $set: { cart: [] } }, { session });

    await session.commitTransaction();
    session.endSession();

    generateInvoice(order).catch((err: any) => console.error("Webhook PDF failed:", err?.message || err));

    try {
      await sendEmail({
        to: (order.user as any).email,
        subject: "Payment successful - ShopLuxe",
        title: "Payment successful",
        preheader: "We’ve received your payment and are preparing your order.",
        text: `Your payment for order #${order._id} was successful. Thank you for shopping with ShopLuxe!\n\nShipping to: ${
          order.shippingAddress?.fullName || "N/A"
        }, ${order.shippingAddress?.address || ""}, ${order.shippingAddress?.city || ""}, ${
          order.shippingAddress?.state || ""
        }.`,
        htmlContent: `
          <h1>Payment received</h1>
          <div class="card">
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total:</strong> ?${(order.totalAmount || 0).toLocaleString()}</p>
            <p><strong>Shipping:</strong> ${order.shippingAddress?.fullName || "N/A"}, ${
          order.shippingAddress?.address || ""
        }, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}</p>
          </div>
          <div style="text-align:center; margin:20px 0;">
            <a class="button" href="${process.env.CLIENT_URL}/orders/${order._id}">Track Order</a>
          </div>
          <p class="muted">We’ll notify you when your order ships.</p>
        `,
      });
    } catch (e: any) {
      console.error("Email failed:", e?.message || e);
    }

    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("[WEBHOOK ERROR]", error?.message || error);
    return new NextResponse(null, { status: 500 });
  }
}

