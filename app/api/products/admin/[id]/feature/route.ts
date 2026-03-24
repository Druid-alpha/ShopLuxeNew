import { type NextRequest } from "next/server";
import { adminToggleProductFeatured } from "@/lib/services/products";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminToggleProductFeatured(request, (await params).id);
}
