import type { NextRequest } from "next/server";
import { listAllReviews } from "@/lib/services/reviews";

export async function GET(request: NextRequest) {
  return listAllReviews(request);
}
