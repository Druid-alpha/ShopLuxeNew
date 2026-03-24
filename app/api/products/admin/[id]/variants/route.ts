import { type NextRequest } from "next/server";
import { adminUpdateProductVariants } from "@/lib/services/products";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminUpdateProductVariants(request, (await params).id);
}
