import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Wishlist from "@/lib/db/models/wishlist";
import Product from "@/lib/db/models/product";
import { requireAuth } from "@/app/api/_utils/auth";

export async function getWishlist(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const wishlist = await Wishlist.findOne({ user: auth.userId }).populate("products");
    return NextResponse.json({ wishlist: wishlist?.products || [] });
  } catch (err) {
    console.error("getWishList error:", err);
    return NextResponse.json({ message: "Failed to get wishlist" }, { status: 500 });
  }
}

export async function toggleWishlist(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { productId } = body || {};

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    let wishlist = await Wishlist.findOne({ user: auth.userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: auth.userId, products: [productId] });
      return NextResponse.json({ wishlist: wishlist.products });
    }

    const exists = wishlist.products.some((p: any) => p.toString() === productId);

    wishlist.products = exists
      ? wishlist.products.filter((p: any) => p.toString() !== productId)
      : [...wishlist.products, productId];

    await wishlist.save();

    return NextResponse.json({ wishlist: wishlist.products });
  } catch (err) {
    console.error("toggleWishList error:", err);
    return NextResponse.json({ message: "Failed to toggle wishlist" }, { status: 500 });
  }
}
