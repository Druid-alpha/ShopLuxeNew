"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function refreshFeaturedProducts() {
  revalidateTag("featured-products", "default");
  revalidatePath("/products/featured");
}
