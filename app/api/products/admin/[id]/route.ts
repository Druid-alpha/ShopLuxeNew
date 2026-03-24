import { type NextRequest } from "next/server";
import { adminDeleteProduct, adminUpdateProduct } from "@/lib/services/products";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminUpdateProduct(request, (await params).id);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminDeleteProduct(request, (await params).id);
}
