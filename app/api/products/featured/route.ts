import { type NextRequest } from "next/server";
import { getFeaturedProducts } from "@/lib/services/products";

export async function GET(request: NextRequest) {
  return getFeaturedProducts(request);
}
