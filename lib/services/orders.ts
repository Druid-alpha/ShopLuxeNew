
import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Order from "@/lib/db/models/order";
import User from "@/lib/db/models/user";
import Product from "@/lib/db/models/product";
import { runOrderReservationCleanupOnce } from "@/lib/jobs/orderReservationCleanupJob";
import { releaseOrderReservations } from "@/lib/utils/reservation";
import sendEmail from "@/lib/utils/sendEmail";
import { uploadToCloudinary } from "@/lib/middleware/upload";
import { parseBodyAndFiles } from "@/app/api/_utils/request";
import { requireAuth, requireAdmin } from "@/app/api/_utils/auth";
import {
  RESERVATION_WINDOW_MS,
  resolveColorLabel,
  resolveVariantForCartItem,
  statusEmailContent,
  canRequestReturn,
  buildPublicInvoiceUrl,
  generateInvoiceForOrder,
  generateInvoiceBuffer,
} from "@/app/api/orders/_shared";

export async function listAllOrders(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[ORDER ADMIN LIST] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const orders = await Order.find({})
      .populate("user", "email name")
      .populate("items.product", "title price")
      .sort({ createdAt: -1 });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function createOrder(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[ORDER] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const body = await request.json().catch(() => ({}));
    const { shippingAddress } = body || {};

    if (
      !shippingAddress?.fullName ||
      !shippingAddress?.address ||
      !shippingAddress?.city ||
      !shippingAddress?.state ||
      !shippingAddress?.phone
    ) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { message: "Shipping address is required (fullName, phone, address, city, state)" },
        { status: 400 }
      );
    }

    const user = await User.findById(auth.userId).session(session);
    if (!user || !user.cart.length) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    const pendingOrders = await Order.find({
      user: auth.userId,
      status: "pending",
      paymentStatus: "pending",
    }).select("_id items");

    if (pendingOrders.length) {
      for (const order of pendingOrders) {
        await releaseOrderReservations(order, session);
        await Order.updateOne(
          { _id: order._id },
          { $set: { status: "cancelled", paymentStatus: "failed" } },
          { session }
        );
      }
    }

    let total = 0;
    const orderItems: any[] = [];

    for (const cartItem of user.cart as any[]) {
      const product = await Product.findById(cartItem.product).session(session);
      if (!product) {
        console.warn(`[CREATE ORDER] Product ${cartItem.product} not found, skipping ghost item.`);
        continue;
      }

      let price = product.price;
      const baseDiscount = Number(product.discount || 0);
      if (baseDiscount > 0) {
        price = price * (1 - baseDiscount / 100);
      }

      let variantData: any = null;
      const cartVariant = cartItem.variant || {};
      const resolvedVariant = await resolveVariantForCartItem(product, cartVariant);
      const hasVariantIntent = !!(
        cartVariant?._id ||
        cartVariant?.sku ||
        cartVariant?.size ||
        cartVariant?.color ||
        typeof cartVariant === "string"
      );
      if (!resolvedVariant && product.variants?.length && hasVariantIntent) {
        throw new Error("Variant not found");
      }

      if (resolvedVariant) {
        const availableVariant = Number(resolvedVariant.stock || 0) - Number(resolvedVariant.reserved || 0);
        if (availableVariant < cartItem.qty) {
          throw new Error("Insufficient variant stock");
        }

        const variantDiscount = Number(resolvedVariant.discount ?? product.discount ?? 0);
        price = variantDiscount > 0 ? resolvedVariant.price * (1 - variantDiscount / 100) : resolvedVariant.price;
        const colorLabel = await resolveColorLabel(resolvedVariant.options?.color || cartVariant?.color);
        variantData = {
          _id: resolvedVariant._id,
          sku: resolvedVariant.sku,
          price: resolvedVariant.price,
          discount: variantDiscount,
          size: resolvedVariant.options?.size || cartVariant?.size || null,
          color: colorLabel || null,
        };
      } else {
        const availableBase = Number(product.stock || 0) - Number(product.reserved || 0);
        if (availableBase < cartItem.qty) {
          throw new Error("Insufficient product stock");
        }

        if (cartVariant?.size || cartVariant?.color) {
          const colorLabel = await resolveColorLabel(cartVariant?.color);
          variantData = {
            size: cartVariant?.size || null,
            color: colorLabel || null,
          };
        }
      }

      total += price * cartItem.qty;

      orderItems.push({
        product: product._id,
        title: product.title,
        qty: cartItem.qty,
        priceAtPurchase: price,
        clothingType: product.clothingType || null,
        variant: variantData || null,
      });
    }

    const order = await Order.create(
      [
        {
          user: auth.userId,
          items: orderItems,
          totalAmount: total,
          shippingAddress,
          status: "pending",
          expiresAt: new Date(Date.now() + RESERVATION_WINDOW_MS),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ order: order[0], message: "Order created. Proceed to payment." }, { status: 201 });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    const msg = String(error?.message || "").toLowerCase();
    if (msg.includes("insufficient")) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (msg.includes("variant not found")) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: error?.message || "Server error" }, { status: 500 });
  }
}
export async function listMyOrders(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[ORDER LIST] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const orders = await Order.find({ user: auth.userId }).sort({ createdAt: -1 });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function validateOrder(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[ORDER VALIDATE] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const user = await User.findById(auth.userId);
    if (!user || !user.cart.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    const pendingOrders = await Order.find({
      user: auth.userId,
      status: "pending",
      paymentStatus: "pending",
    }).select("_id items");

    if (pendingOrders.length) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        for (const order of pendingOrders) {
          await releaseOrderReservations(order, session);
          await Order.updateOne(
            { _id: order._id },
            { $set: { status: "cancelled", paymentStatus: "failed" } },
            { session }
          );
        }
        await session.commitTransaction();
      } catch (releaseErr: any) {
        await session.abortTransaction();
        console.warn("[ORDER VALIDATE] Reservation release failed:", releaseErr?.message || releaseErr);
      } finally {
        session.endSession();
      }
    }

    const errors: any[] = [];

    for (const cartItem of user.cart as any[]) {
      const product = await Product.findById(cartItem.product);
      if (!product) {
        errors.push({ productId: cartItem.product, message: "Product not found" });
        continue;
      }

      const cartVariant = cartItem.variant || {};
      const resolvedVariant = await resolveVariantForCartItem(product, cartVariant);
      const hasVariantIntent = !!(
        cartVariant?._id ||
        cartVariant?.sku ||
        cartVariant?.size ||
        cartVariant?.color ||
        typeof cartVariant === "string"
      );
      if (!resolvedVariant && product.variants?.length && hasVariantIntent) {
        errors.push({
          productId: product._id,
          title: product.title,
          message: "Variant not found",
          available: 0,
        });
        continue;
      }

      if (resolvedVariant) {
        const available = Number(resolvedVariant.stock || 0) - Number(resolvedVariant.reserved || 0);
        if (available < cartItem.qty) {
          errors.push({
            productId: product._id,
            title: product.title,
            message: "Insufficient variant stock",
            available,
            stock: Number(resolvedVariant.stock || 0),
            reserved: Number(resolvedVariant.reserved || 0),
          });
        }
      } else {
        const available = Number(product.stock || 0) - Number(product.reserved || 0);
        if (available < cartItem.qty) {
          errors.push({
            productId: product._id,
            title: product.title,
            message: "Insufficient product stock",
            available,
            stock: Number(product.stock || 0),
            reserved: Number(product.reserved || 0),
          });
        }
      }
    }

    if (errors.length) {
      return NextResponse.json({ message: "Some items are out of stock", items: errors }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Validation failed" }, { status: 500 });
  }
}

export async function cancelOrderReservations(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const orders = await Order.find({
      user: auth.userId,
      status: { $in: ["pending", "failed", "cancelled"] },
      paymentStatus: { $in: ["pending", "failed"] },
    }).select("_id items");

    if (!orders.length) {
      return NextResponse.json({ cleared: 0 });
    }

    let cleared = 0;
    for (const order of orders) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await releaseOrderReservations(order, session);
        await Order.updateOne(
          { _id: order._id },
          { $set: { status: "cancelled", paymentStatus: "failed" } },
          { session }
        );
        await session.commitTransaction();
        cleared += 1;
      } catch (error: any) {
        await session.abortTransaction();
        console.error("[ORDER RESERVATION] Cancel failed:", error?.message || error);
      } finally {
        session.endSession();
      }
    }

    return NextResponse.json({ cleared });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to cancel reservations" }, { status: 500 });
  }
}

export async function getPendingReservation(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[ORDER RESERVATION CHECK] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const now = new Date();
    const order = await Order.findOne({
      user: auth.userId,
      status: "pending",
      paymentStatus: "pending",
      expiresAt: { $exists: true, $gt: now },
    })
      .sort({ expiresAt: -1, createdAt: -1 })
      .select("_id expiresAt");

    if (!order) return NextResponse.json({ reservation: null });
    return NextResponse.json({ reservation: { orderId: order._id, expiresAt: order.expiresAt } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to fetch reservation" }, { status: 500 });
  }
}
export async function getOrderById(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[ORDER GET] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const order = await Order.findById(id).populate("items.product").populate("user", "email name");

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const isAdmin = auth.role === "admin";
    const isOwner = String((order.user as any)?._id || order.user) === String(auth.userId);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function deleteOrder(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const isAdmin = auth.role === "admin";
    const isOwner = String(order.user) === String(auth.userId);

    if (!isAdmin) {
      if (!isOwner) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ message: "Access denied" }, { status: 403 });
      }
      if (order.paymentStatus !== "pending" || order.status !== "pending") {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { message: "Only pending unpaid orders can be cancelled" },
          { status: 400 }
        );
      }
    }

    if (order.status === "pending" && order.paymentStatus === "pending") {
      await releaseOrderReservations(order, session);
    }

    await Order.deleteOne({ _id: order._id }, { session });
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ message: isAdmin ? "Order successfully deleted" : "Order cancelled" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Delete order error:", error);
    return NextResponse.json({ message: "Server error deleting order" }, { status: 500 });
  }
}

export async function updateOrderStatus(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { status, paymentStatus } = body || {};
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (typeof paymentStatus !== "undefined") {
      return NextResponse.json(
        {
          message: "paymentStatus is managed automatically after payment verification and cannot be changed manually",
        },
        { status: 400 }
      );
    }

    const allowedStatuses = ["pending", "processing", "shipped", "delivered"];
    if (!status) {
      return NextResponse.json({ message: "status is required" }, { status: 400 });
    }
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { message: "Invalid order status value. Allowed: pending, processing, shipped, delivered" },
        { status: 400 }
      );
    }

    order.status = status;
    if (status === "delivered") {
      order.deliveredAt = new Date();
    }
    await order.save();

    try {
      const user = await User.findById(order.user).select("email name");
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Order Update: ${status}`,
          title: `Order ${status}`,
          htmlContent: statusEmailContent(order, status),
          preheader: `Your order is now ${status}`,
        });
      }
    } catch (emailErr: any) {
      console.error("[ORDER STATUS EMAIL] Failed:", emailErr?.message || emailErr);
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
export async function requestReturn(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { reason } = body || {};
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const isOwner = String(order.user) === String(auth.userId);
    if (!isOwner) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const eligibility = canRequestReturn(order);
    if (!eligibility.ok) {
      return NextResponse.json({ message: eligibility.reason }, { status: 400 });
    }

    const trimmedReason = String(reason || "").trim();
    if (!trimmedReason) {
      return NextResponse.json({ message: "Return reason is required" }, { status: 400 });
    }

    order.returnStatus = "requested";
    order.returnRequestedAt = new Date();
    order.returnReason = trimmedReason.slice(0, 500);
    order.returnMessages = [
      ...(order.returnMessages || []),
      { by: "customer", message: order.returnReason, status: "requested" },
    ];
    await order.save();

    return NextResponse.json({ order, message: "Return request submitted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to request return" }, { status: 500 });
  }
}

export async function updateReturnStatus(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { status, note, refundAmount } = body || {};
    const allowed = ["approved", "rejected", "refunded"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ message: "Invalid return status" }, { status: 400 });
    }

    const order = await Order.findById(id).populate("user", "email name");
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    order.returnStatus = status;
    order.returnNote = String(note || "").slice(0, 500);
    if (order.returnNote) {
      order.returnMessages = [
        ...(order.returnMessages || []),
        { by: "admin", message: order.returnNote, status },
      ];
    }

    if (status === "refunded") {
      order.refundStatus = "processed";
      order.refundAmount = Number(refundAmount || order.totalAmount || 0);
      order.refundProcessedAt = new Date();
      order.paymentStatus = "refunded";
    }
    await order.save();

    try {
      if ((order.user as any)?.email) {
        const reasonLine = order.returnReason ? `<p>Reason: ${order.returnReason}</p>` : "";
        const noteLine = order.returnNote ? `<p>Note from support: ${order.returnNote}</p>` : "";
        await sendEmail({
          to: (order.user as any).email,
          subject: `Return ${status} - ShopLuxe`,
          title: `Return ${status}`,
          text: `Your return request was ${status}. Order ID: ${order._id}.${order.returnReason ? ` Reason: ${order.returnReason}.` : ""}${order.returnNote ? ` Note from support: ${order.returnNote}.` : ""}${status === "refunded" ? ` Refund amount: ${order.refundAmount || order.totalAmount || 0}.` : ""}`,
          htmlContent: `
            <h1>Return ${status}</h1>
            <p>Hi ${(order.user as any)?.name?.split(" ")[0] || "there"}, here is the latest update on your return.</p>
            <div class="card">
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Status:</strong> ${status}</p>
              ${reasonLine}
              ${noteLine}
              ${status === "refunded" ? `<p><strong>Refund amount:</strong> ${order.refundAmount || order.totalAmount || 0}</p>` : ""}
            </div>
            <div class="divider"></div>
            <p class="muted">You can view the full timeline and messages in your order details.</p>
            <div style="text-align:center; margin:20px 0;">
              <a class="button" href="${process.env.CLIENT_URL}/orders/${order._id}">View return details</a>
            </div>
          `,
          preheader: `Return ${status}`,
        });
      }
    } catch (emailErr: any) {
      console.error("[RETURN EMAIL] Failed:", emailErr?.message || emailErr);
    }

    return NextResponse.json({ order, message: `Return ${status}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to update return status" }, { status: 500 });
  }
}

export async function uploadReturnAttachments(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const isOwner = String(order.user) === String(auth.userId);
    if (!isOwner) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (!["requested", "approved"].includes(order.returnStatus)) {
      return NextResponse.json(
        { message: "Attachments are only allowed while a return is under review" },
        { status: 400 }
      );
    }

    const { files } = await parseBodyAndFiles(request);
    const uploadFiles = Array.isArray(files) ? files.slice(0, 5) : [];
    if (uploadFiles.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    const uploads: string[] = [];
    for (const file of uploadFiles) {
      const uploaded: any = await uploadToCloudinary(file.buffer, "returns");
      uploads.push(uploaded.secure_url);
    }

    return NextResponse.json({ attachments: uploads });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to upload attachments" }, { status: 500 });
  }
}
export async function postReturnMessageAdmin(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { message } = body || {};
    const trimmed = String(message || "").trim();
    if (!trimmed) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 });
    }

    const order = await Order.findById(id).populate("user", "email name");
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    order.returnNote = trimmed.slice(0, 500);
    order.returnMessages = [
      ...(order.returnMessages || []),
      { by: "admin", message: order.returnNote, status: order.returnStatus || "requested" },
    ];
    await order.save();

    try {
      if ((order.user as any)?.email) {
        await sendEmail({
          to: (order.user as any).email,
          subject: "Return update - ShopLuxe",
          title: "Your return update",
          text: `Order ID: ${order._id}. Return status: ${order.returnStatus || "requested"}. Message: ${order.returnNote}`,
          htmlContent: `
            <h1>Your return update</h1>
            <p>Hi ${(order.user as any)?.name?.split(" ")[0] || "there"}, we reviewed your return request.</p>
            <div class="card">
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Return status:</strong> ${order.returnStatus || "requested"}</p>
              <p><strong>Message from support:</strong> ${order.returnNote}</p>
            </div>
            <div class="divider"></div>
            <p class="muted">If you need to add more details or attachments, reply inside your order page.</p>
            <div style="text-align:center; margin:20px 0;">
              <a class="button" href="${process.env.CLIENT_URL}/orders/${order._id}">View return details</a>
            </div>
          `,
          preheader: "Support replied to your return request",
        });
      }
    } catch (emailErr: any) {
      console.error("[RETURN MESSAGE EMAIL] Failed:", emailErr?.message || emailErr);
    }

    return NextResponse.json({ order, message: "Message sent" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 });
  }
}

export async function postReturnMessageUser(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { body, files } = await parseBodyAndFiles(request);
    const { message, attachments } = body || {};
    const trimmed = String(message || "").trim();

    const order = await Order.findById(id).populate("user", "email name");
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const isOwner = String((order.user as any)?._id || order.user) === String(auth.userId);
    if (!isOwner) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (!["requested", "approved"].includes(order.returnStatus)) {
      return NextResponse.json(
        { message: "Messages are only allowed while a return is under review" },
        { status: 400 }
      );
    }

    let fileUrls: string[] = Array.isArray(attachments)
      ? attachments.map((u) => String(u || "").trim()).filter(Boolean).slice(0, 5)
      : [];

    if (Array.isArray(files) && files.length > 0) {
      const uploadedUrls: string[] = [];
      for (const file of files.slice(0, 5)) {
        const uploaded: any = await uploadToCloudinary(file.buffer, "returns");
        uploadedUrls.push(uploaded.secure_url);
      }
      fileUrls = uploadedUrls;
    }

    if (!trimmed && fileUrls.length === 0) {
      return NextResponse.json({ message: "Message or attachment is required" }, { status: 400 });
    }
    const safeMessage = trimmed || "Attachment(s) provided";

    order.returnMessages = [
      ...(order.returnMessages || []),
      { by: "customer", message: safeMessage.slice(0, 500), status: order.returnStatus || "", attachments: fileUrls },
    ];
    await order.save();

    try {
      if (process.env.ADMIN_EMAIL) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: "New customer return message - ShopLuxe",
          title: "New return message",
          text: `Order ID: ${order._id}. Customer: ${(order.user as any)?.name || "Unknown"}. Message: ${
            trimmed || "Attachment(s) provided"
          }`,
          htmlContent: `
            <h1>New return message</h1>
            <p>A customer sent a new message on a return request.</p>
            <div class="card">
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Customer:</strong> ${(order.user as any)?.name || "Unknown"}</p>
              <p><strong>Message:</strong> ${trimmed || "Attachment(s) provided"}</p>
              ${fileUrls.length ? `<p><strong>Attachments:</strong> ${fileUrls.length}</p>` : ""}
            </div>
            <div style="text-align:center; margin:20px 0;">
              <a class="button" href="${process.env.CLIENT_URL}/admin">Open Admin</a>
            </div>
          `,
          preheader: "A customer sent a return message",
        });
      }
    } catch (emailErr: any) {
      console.error("[RETURN USER MESSAGE EMAIL] Failed:", emailErr?.message || emailErr);
    }

    return NextResponse.json({ order, message: "Message sent" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 });
  }
}
export async function generateInvoice(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const order = await Order.findById(id).populate("user", "email name");
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const isAdmin = auth.role === "admin";
    const isOwner = String((order.user as any)?._id || order.user) === String(auth.userId);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (order.paymentStatus !== "paid") {
      return NextResponse.json({ message: "Invoice is available after successful payment" }, { status: 400 });
    }

    if (order.invoiceUrl) {
      if (order.invoiceUrl.includes("/fl_attachment/") || order.invoiceUrl.includes("/s--")) {
        order.invoiceUrl = buildPublicInvoiceUrl(order._id);
        await order.save();
      }
      return NextResponse.json({ invoiceUrl: order.invoiceUrl, generated: false });
    }

    const invoiceUrl = await generateInvoiceForOrder(order);
    return NextResponse.json({ invoiceUrl, generated: true });
  } catch (error) {
    console.error("Generate invoice error:", error);
    return NextResponse.json({ message: "Failed to generate invoice" }, { status: 500 });
  }
}

export async function downloadInvoice(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const order = await Order.findById(id).populate("user", "email name");
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const isAdmin = auth.role === "admin";
    const isOwner = String((order.user as any)?._id || order.user) === String(auth.userId);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (order.paymentStatus !== "paid") {
      return NextResponse.json({ message: "Invoice is available after successful payment" }, { status: 400 });
    }

    if (!order.invoiceUrl) {
      try {
        await generateInvoiceForOrder(order);
      } catch (err) {
        const buffer = await generateInvoiceBuffer(order);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="ShopLuxe_Invoice_${order._id}.pdf"`,
          },
        });
      }
    }

    if (order.invoiceUrl.includes("/fl_attachment/") || order.invoiceUrl.includes("/s--")) {
      order.invoiceUrl = buildPublicInvoiceUrl(order._id);
      await order.save();
    }

    const invoiceUrl = order.invoiceUrl;
    try {
      const response = await fetch(invoiceUrl);
      if (!response.ok) {
        throw new Error(`Invoice fetch failed: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ShopLuxe_Invoice_${order._id}.pdf"`,
        },
      });
    } catch (fetchErr) {
      const buffer = await generateInvoiceBuffer(order);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ShopLuxe_Invoice_${order._id}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error("Download invoice error:", error);
    return NextResponse.json({ message: "Failed to download invoice" }, { status: 500 });
  }
}
