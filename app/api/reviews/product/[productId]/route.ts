import type { NextRequest } from "next/server";
import { getReviewsForProduct } from "@/lib/services/reviews";

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  return getReviewsForProduct(request, (await params).productId);
}
