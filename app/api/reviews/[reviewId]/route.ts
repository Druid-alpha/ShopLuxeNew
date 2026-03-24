import type { NextRequest } from "next/server";
import { createReview, deleteReview, updateReview } from "@/lib/services/reviews";

type Params = { params: Promise<{ reviewId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { reviewId } = await params;
  return createReview(request, reviewId);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { reviewId } = await params;
  return updateReview(request, reviewId);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { reviewId } = await params;
  return deleteReview(request, reviewId);
}
