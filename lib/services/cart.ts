import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/db/models/user";
import Product from "@/lib/db/models/product";
import { runOrderReservationCleanupOnce } from "@/lib/jobs/orderReservationCleanupJob";
import { requireAuth } from "@/app/api/_utils/auth";
import {
  attachColorMeta,
  findVariantByOptions,
  normalizeVariant,
  resolveVariantForInput,
} from "@/app/api/cart/_shared";

export async function getCart(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[CART] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const user = await User.findById(auth.userId).populate({
      path: "cart.product",
      populate: [{ path: "color" }, { path: "variants.options.color" }, { path: "category", select: "name" }],
    });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const originalCount = user.cart.length;
    user.cart = user.cart.filter((item: any) => item.product !== null);

    if (user.cart.length !== originalCount) {
      await user.save();
      console.log(`[CART CLEANUP] Removed ${originalCount - user.cart.length} dead items for user ${user._id}`);
    }

    await attachColorMeta(user.cart as any);

    let cartUpdated = false;
    for (const item of user.cart as any[]) {
      const product = item?.product;
      if (!product || !product.variants?.length) continue;
      if (!item.variant) continue;
      const resolved = await resolveVariantForInput(product, item.variant);
      if (resolved?._id) {
        const nextVariant = {
          _id: resolved._id,
          sku: resolved.sku || item.variant?.sku || undefined,
          size: resolved.options?.size || item.variant?.size || undefined,
          color:
            resolved.options?.color?._id || resolved.options?.color || item.variant?.color || undefined,
        };
        const changed = JSON.stringify(item.variant) !== JSON.stringify(nextVariant);
        if (changed) {
          item.variant = nextVariant;
          cartUpdated = true;
        }
      }
    }
    if (cartUpdated) {
      await user.save();
    }

    (user.cart as any[]).forEach((item) => {
      const product = item?.product;
      if (!product) return;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const baseStock = Number(product.stock || 0);
      const baseReserved = Number(product.reserved || 0);
      const variantStock = variants.reduce((sum: number, v: any) => sum + Number(v?.stock || 0), 0);
      const variantReserved = variants.reduce((sum: number, v: any) => sum + Number(v?.reserved || 0), 0);
      product.totalStock = baseStock + variantStock;
      product.totalReserved = baseReserved + variantReserved;
      product.availableStock = Math.max(0, product.totalStock - product.totalReserved);
    });

    return NextResponse.json({ cart: user.cart });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function addToCart(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { productId, qty = 1, variant = null } = body || {};
    const reqVariant = normalizeVariant(variant);
    let variantId = reqVariant._id || null;
    let variantSku = reqVariant.sku || null;
    const variantSize = reqVariant.size || null;
    const variantColor = reqVariant.color || null;

    const user = await User.findById(auth.userId);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    if (!user.cart) user.cart = [];

    user.cart = user.cart.filter((i: any) => i.product != null);

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

    const idx = user.cart.findIndex((i: any) => {
      const cartProdId = String(i.product);
      const reqProdId = String(productId);

      const cartVariant = normalizeVariant(i.variant);
      if (reqVariant._id) {
        return cartProdId === reqProdId && cartVariant._id === reqVariant._id;
      }
      if (reqVariant.sku) {
        return cartProdId === reqProdId && cartVariant.sku === reqVariant.sku;
      }
      const isReqEmpty = !reqVariant.size && !reqVariant.color;
      const isCartColorOnly = !cartVariant.sku && !cartVariant.size && !!cartVariant.color;
      if (isReqEmpty && isCartColorOnly) return cartProdId === reqProdId;
      return cartProdId === reqProdId && cartVariant.size === reqVariant.size && cartVariant.color === reqVariant.color;
    });

    let stockLimit = product.stock;
    let vObj: any = null;
    if (variantId) {
      vObj = product.variants.find((v: any) => String(v._id) === String(variantId));
    }
    if (!vObj && variantSku) {
      vObj = product.variants.find((v: any) => v.sku === String(variantSku));
    }
    if (!vObj && (variantId || variantSku || variantSize || variantColor) && product.variants?.length) {
      vObj = await resolveVariantForInput(product, {
        ...(variantId ? { _id: variantId } : {}),
        ...(variantSku ? { sku: variantSku } : {}),
        ...(variantSize ? { size: variantSize } : {}),
        ...(variantColor ? { color: variantColor } : {}),
      });
      if (vObj) {
        variantId = vObj._id || variantId;
        variantSku = vObj.sku || variantSku;
      } else {
        return NextResponse.json({ message: "Variant not found" }, { status: 400 });
      }
    }
    if (vObj) stockLimit = vObj.stock;

    if (idx >= 0) {
      user.cart[idx].qty = Math.min(stockLimit, user.cart[idx].qty + Number(qty));
    } else {
      let variantPayload: any = null;
      if (variantSku || variantId) {
        if (!vObj) {
          vObj = variantId
            ? product.variants.find((v: any) => String(v._id) === String(variantId))
            : product.variants.find((v: any) => v.sku === String(variantSku));
        }
        variantPayload = {
          _id: vObj?._id || variantId || undefined,
          sku: vObj?.sku || variantSku || undefined,
          size: vObj?.options?.size || variantSize || undefined,
          color: vObj?.options?.color?._id || vObj?.options?.color || variantColor || undefined,
        };
      } else if (variantSize || variantColor) {
        const resolved = vObj || (await findVariantByOptions(product, variantSize, variantColor));
        if (resolved) {
          variantPayload = {
            _id: resolved._id || undefined,
            sku: resolved.sku || undefined,
            size: resolved.options?.size || variantSize || undefined,
            color: resolved.options?.color?._id || resolved.options?.color || variantColor || undefined,
          };
        } else {
          variantPayload = {
            size: variantSize || undefined,
            color: variantColor || undefined,
          };
        }
      }
      user.cart.push({
        product: productId,
        qty: Math.min(stockLimit, Math.max(1, Number(qty))),
        variant: variantPayload,
        addedAt: new Date(),
      });
    }

    await user.save();
    await user.populate({
      path: "cart.product",
      populate: [{ path: "color" }, { path: "variants.options.color" }, { path: "category", select: "name" }],
    });

    await attachColorMeta(user.cart as any);
    return NextResponse.json({ cart: user.cart });
  } catch (error) {
    console.error("Add to cart error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function updateCartItem(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { productId, qty, variant = null } = body || {};
    const reqVariant = normalizeVariant(variant);
    let variantId = reqVariant._id || null;
    let variantSku = reqVariant.sku || null;
    const variantSize = reqVariant.size || null;
    const variantColor = reqVariant.color || null;

    const user = await User.findById(auth.userId);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const idx = user.cart.findIndex((i: any) => {
      const cartProdId = String(i.product);
      const reqProdId = String(productId);
      const cartVariant = normalizeVariant(i.variant);
      if (reqVariant._id) {
        return cartProdId === reqProdId && cartVariant._id === reqVariant._id;
      }
      if (reqVariant.sku) {
        return cartProdId === reqProdId && cartVariant.sku === reqVariant.sku;
      }
      const isReqEmpty = !reqVariant.size && !reqVariant.color;
      const isCartColorOnly = !cartVariant.sku && !cartVariant.size && !!cartVariant.color;
      if (isReqEmpty && isCartColorOnly) return cartProdId === reqProdId;
      return cartProdId === reqProdId && cartVariant.size === reqVariant.size && cartVariant.color === reqVariant.color;
    });

    if (idx === -1) return NextResponse.json({ message: "Item not found in cart" }, { status: 404 });

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

    let stockLimit = product.stock;
    let vObj: any = null;
    if (variantId) {
      vObj = product.variants.find((v: any) => String(v._id) === String(variantId));
    }
    if (!vObj && variantSku) {
      vObj = product.variants.find((v: any) => v.sku === String(variantSku));
    }
    if (!vObj && (variantId || variantSku || variantSize || variantColor) && product.variants?.length) {
      vObj = await resolveVariantForInput(product, {
        ...(variantId ? { _id: variantId } : {}),
        ...(variantSku ? { sku: variantSku } : {}),
        ...(variantSize ? { size: variantSize } : {}),
        ...(variantColor ? { color: variantColor } : {}),
      });
      if (vObj) {
        variantId = vObj._id || variantId;
        variantSku = vObj.sku || variantSku;
      } else {
        return NextResponse.json({ message: "Variant not found" }, { status: 400 });
      }
    }
    if (vObj) stockLimit = vObj.stock;

    user.cart[idx].qty = Math.min(Math.max(1, qty), stockLimit);
    if ((variantSize || variantColor) && vObj) {
      user.cart[idx].variant = {
        _id: vObj._id || variantId || undefined,
        sku: vObj.sku || variantSku || undefined,
        size: vObj.options?.size || variantSize || undefined,
        color: vObj.options?.color?._id || vObj.options?.color || variantColor || undefined,
      };
    }

    await user.save();
    await user.populate({
      path: "cart.product",
      populate: [{ path: "color" }, { path: "variants.options.color" }, { path: "category", select: "name" }],
    });

    await attachColorMeta(user.cart as any);
    return NextResponse.json({ cart: user.cart });
  } catch (error) {
    console.error("Update cart item error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function removeCartItem(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { productId, variant = null } = body || {};
    const reqVariant = normalizeVariant(variant);

    const user = await User.findById(auth.userId);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    user.cart = user.cart.filter((i: any) => {
      const isSameProd = String(i.product) === String(productId);
      const cartVariant = normalizeVariant(i.variant);
      const isReqEmpty = !reqVariant._id && !reqVariant.sku && !reqVariant.size && !reqVariant.color;
      const isCartColorOnly = !cartVariant.sku && !cartVariant.size && !!cartVariant.color;
      const isSameVariant = reqVariant._id
        ? cartVariant._id === reqVariant._id
        : reqVariant.sku
        ? cartVariant.sku === reqVariant.sku
        : isReqEmpty && isCartColorOnly
        ? true
        : cartVariant.size === reqVariant.size && cartVariant.color === reqVariant.color;
      return !(isSameProd && isSameVariant);
    });

    await user.save();
    await user.populate({
      path: "cart.product",
      populate: [{ path: "color" }, { path: "variants.options.color" }, { path: "category", select: "name" }],
    });

    await attachColorMeta(user.cart as any);
    return NextResponse.json({ cart: user.cart });
  } catch (error) {
    console.error("Remove cart item failed:", error);
    return NextResponse.json({ message: "Remove cart item failed" }, { status: 500 });
  }
}

export async function clearCart(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const user = await User.findById(auth.userId);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    user.cart = [];
    await user.save();

    return NextResponse.json({ cart: [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Clear cart failed" }, { status: 500 });
  }
}

export async function syncCart(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { items = [] } = body || {};

    const user = await User.findById(auth.userId);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    if (!user.cart) user.cart = [];

    for (const item of items) {
      const productId = item.product || item.productId;
      const qty = Number(item.qty) || 1;
      const variantPayload = item.variant || null;
      const reqVariant = normalizeVariant(variantPayload);
      let variantId = reqVariant._id || null;
      let variantSku = reqVariant.sku || null;
      const variantSize = reqVariant.size || null;
      const variantColor = reqVariant.color || null;

      const product = await Product.findById(productId);
      if (!product) continue;

      const idx = user.cart.findIndex((i: any) => {
        const cartProdId = String(i.product);
        const reqProdId = String(productId);
        const cartVariant = normalizeVariant(i.variant);
        if (reqVariant._id) {
          return cartProdId === reqProdId && cartVariant._id === reqVariant._id;
        }
        if (reqVariant.sku) {
          return cartProdId === reqProdId && cartVariant.sku === reqVariant.sku;
        }
        const isReqEmpty = !reqVariant.size && !reqVariant.color;
        const isCartColorOnly = !cartVariant.sku && !cartVariant.size && !!cartVariant.color;
        if (isReqEmpty && isCartColorOnly) return cartProdId === reqProdId;
        return cartProdId === reqProdId && cartVariant.size === reqVariant.size && cartVariant.color === reqVariant.color;
      });

      let stockLimit = product.stock;
      let vObj: any = null;
      if (variantId) {
        vObj = product.variants.find((v: any) => String(v._id) === String(variantId));
      }
      if (!vObj && variantSku) {
        vObj = product.variants.find((v: any) => v.sku === String(variantSku));
      }
      if (!vObj && (variantId || variantSku || variantSize || variantColor) && product.variants?.length) {
        vObj = await resolveVariantForInput(product, {
          ...(variantId ? { _id: variantId } : {}),
          ...(variantSku ? { sku: variantSku } : {}),
          ...(variantSize ? { size: variantSize } : {}),
          ...(variantColor ? { color: variantColor } : {}),
        });
        if (vObj) {
          variantId = vObj._id || variantId;
          variantSku = vObj.sku || variantSku;
        } else {
          return NextResponse.json({ message: "Variant not found" }, { status: 400 });
        }
      }
      if (vObj) stockLimit = vObj.stock;

      if (idx >= 0) {
        user.cart[idx].qty = Math.min(stockLimit, user.cart[idx].qty + qty);
      } else {
        let variantPayloadToSave: any = null;
        if (variantSku || variantId) {
          if (!vObj) {
            vObj = variantId
              ? product.variants.find((v: any) => String(v._id) === String(variantId))
              : product.variants.find((v: any) => v.sku === String(variantSku));
          }
          variantPayloadToSave = {
            _id: vObj?._id || variantId || undefined,
            sku: vObj?.sku || variantSku || undefined,
            size: vObj?.options?.size || variantSize || undefined,
            color: vObj?.options?.color?._id || vObj?.options?.color || variantColor || undefined,
          };
        } else if (variantSize || variantColor) {
          const resolved = vObj || (await findVariantByOptions(product, variantSize, variantColor));
          if (resolved) {
            variantPayloadToSave = {
              _id: resolved._id || undefined,
              sku: resolved.sku || undefined,
              size: resolved.options?.size || variantSize || undefined,
              color: resolved.options?.color?._id || resolved.options?.color || variantColor || undefined,
            };
          } else {
            variantPayloadToSave = {
              size: variantSize || undefined,
              color: variantColor || undefined,
            };
          }
        }
        user.cart.push({
          product: productId,
          qty: Math.min(stockLimit, Math.max(1, qty)),
          variant: variantPayloadToSave,
          addedAt: new Date(),
        });
      }
    }

    await user.save();
    await user.populate({
      path: "cart.product",
      populate: [{ path: "color" }, { path: "variants.options.color" }, { path: "category", select: "name" }],
    });

    await attachColorMeta(user.cart as any);
    return NextResponse.json({ cart: user.cart });
  } catch (error) {
    console.error("Sync cart error:", error);
    return NextResponse.json({ message: "Cart sync failed" }, { status: 500 });
  }
}
