import { type NextRequest } from "next/server";
import { adminHardDeleteProduct } from "@/lib/services/products";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminHardDeleteProduct(request, (await params).id);
}
