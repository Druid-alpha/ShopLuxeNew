import { type NextRequest } from "next/server";
import { adminCreateProduct, adminListProducts } from "@/lib/services/products";

export async function GET(request: NextRequest) {
  return adminListProducts(request);
}

export async function POST(request: NextRequest) {
  return adminCreateProduct(request);
}
