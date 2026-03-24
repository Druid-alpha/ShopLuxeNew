import { type NextRequest } from "next/server";
import { adminHardDeleteAllProducts } from "@/lib/services/products";

export async function DELETE(request: NextRequest) {
  return adminHardDeleteAllProducts(request);
}
