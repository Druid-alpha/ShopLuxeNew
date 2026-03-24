"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Product from "@/lib/db/models/product";
import User from "@/lib/db/models/user";

const requireAdminAction = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) throw new Error("Unauthorized");

  let decoded: { id?: string; role?: string } | null = null;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "") as { id?: string; role?: string };
  } catch {
    throw new Error("Invalid token");
  }

  if (!decoded?.id) throw new Error("Invalid token");
  await connectDB();
  const user = await User.findById(decoded.id).select("role").lean();
  if (!user || String(user.role || "").toLowerCase() !== "admin") {
    throw new Error("Admin only");
  }
};

export async function toggleFeaturedAction(formData: FormData) {
  await requireAdminAction();
  const id = String(formData.get("id") || "");
  const nextFeatured = String(formData.get("nextFeatured") || "false") === "true";
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return;

  await Product.findByIdAndUpdate(id, { $set: { featured: nextFeatured } });
  revalidateTag("featured-products", "default");
  revalidatePath("/admin/actions/products");
  revalidatePath("/products/featured");
}

export async function softDeleteProductAction(formData: FormData) {
  await requireAdminAction();
  const id = String(formData.get("id") || "");
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return;

  await Product.findByIdAndUpdate(id, { $set: { isDeleted: true } });
  revalidateTag("featured-products", "default");
  revalidatePath("/admin/actions/products");
  revalidatePath("/products/featured");
}
