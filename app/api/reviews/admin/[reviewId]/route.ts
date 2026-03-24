import type { NextRequest } from "next/server";
import { adminDeleteReview } from "@/lib/services/reviews";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  return adminDeleteReview(request, (await params).reviewId);
}
