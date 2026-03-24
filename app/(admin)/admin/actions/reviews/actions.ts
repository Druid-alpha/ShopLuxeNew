"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Review from "@/lib/db/models/review";

export async function toggleFeaturedReviewAction(formData: FormData) {
  await connectDB();
  const id = String(formData.get("id") || "");
  const nextFeatured = String(formData.get("nextFeatured") || "false") === "true";
  if (!id) return;

  await Review.findByIdAndUpdate(id, { $set: { isFeatured: nextFeatured } });
  revalidatePath("/admin/actions/reviews");
}
