import { type NextRequest } from "next/server";
import { getProductById } from "@/lib/services/products";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return getProductById(request, (await params).id);
}
