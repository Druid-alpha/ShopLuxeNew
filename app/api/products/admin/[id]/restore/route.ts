import { type NextRequest } from "next/server";
import { adminRestoreProduct } from "@/lib/services/products";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminRestoreProduct(request, (await params).id);
}
