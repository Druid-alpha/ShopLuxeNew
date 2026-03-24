import ClientProductPage from "./ClientPage";
import { connectDB } from "@/lib/db";
import Product from "@/lib/db/models/product";
import mongoose from "mongoose";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { title: "Product Not Found | ShopLuxe" };
  }

  await connectDB();
  const product = await Product.findOne({ _id: id, isDeleted: false })
    .select("title description")
    .lean();

  if (!product) {
    return { title: "Product Not Found | ShopLuxe" };
  }

  const description = product.description
    ? String(product.description).slice(0, 160)
    : "Explore premium products on ShopLuxe.";

  return {
    title: `${product.title} | ShopLuxe`,
    description,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  return (
    <ClientProductPage />
  );
}
