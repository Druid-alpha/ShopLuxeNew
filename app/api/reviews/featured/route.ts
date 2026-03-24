import { getFeaturedReviews } from "@/lib/services/reviews";

export async function GET() {
  return getFeaturedReviews();
}
