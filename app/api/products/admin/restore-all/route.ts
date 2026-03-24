import { type NextRequest } from "next/server";
import { adminRestoreAllProducts } from "@/lib/services/products";

export async function PATCH(request: NextRequest) {
  return adminRestoreAllProducts(request);
}
