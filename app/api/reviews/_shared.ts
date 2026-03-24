import mongoose from "mongoose";
import { z } from "zod";
import Review from "@/lib/db/models/review";
import Product from "@/lib/db/models/product";

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  body: z.string().optional(),
});

export const escapeRegex = (value: string) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const recalcProductRating = async (productId: string) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const product = await Product.findById(productId);
  if (!product) return;

  if (stats.length) {
    product.avgRating = Number(stats[0].avgRating.toFixed(1));
    product.reviewsCount = stats[0].count;
  } else {
    product.avgRating = 0;
    product.reviewsCount = 0;
  }

  await product.save();
};

