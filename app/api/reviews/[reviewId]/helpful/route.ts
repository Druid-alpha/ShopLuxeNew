import type { NextRequest } from "next/server";
import { toggleHelpful } from "@/lib/services/reviews";

export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  return toggleHelpful(request, (await params).reviewId);
}
