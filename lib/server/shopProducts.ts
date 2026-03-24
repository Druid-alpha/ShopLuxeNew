import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import "@/lib/db/models/Brand";
import "@/lib/db/models/Category";
import "@/lib/db/models/Color";
import Product from "@/lib/db/models/product";

async function fetchFeaturedProducts() {
  await connectDB();
  const products = await Product.find({ isDeleted: false, featured: true })
    .populate("brand category variants.options.color color")
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  if (products.length > 0) {
    return JSON.parse(JSON.stringify(products));
  }

  const fallback = await Product.find({ isDeleted: false })
    .populate("brand category variants.options.color color")
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  return JSON.parse(JSON.stringify(fallback));
}

export const getFeaturedProducts = unstable_cache(fetchFeaturedProducts, ["featured-products"], {
  revalidate: 120,
  tags: ["featured-products"],
});
