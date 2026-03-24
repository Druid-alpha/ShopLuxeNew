import type { NextRequest } from "next/server";
import { adminListProducts } from "@/lib/services/products";

export async function GET(request: NextRequest) {
  return adminListProducts(request);
}
