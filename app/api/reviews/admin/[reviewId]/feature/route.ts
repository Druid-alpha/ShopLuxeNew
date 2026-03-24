import type { NextRequest } from "next/server";
import { toggleFeaturedReview } from "@/lib/services/reviews";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  return toggleFeaturedReview(request, (await params).reviewId);
}
