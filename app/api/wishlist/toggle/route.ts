import type { NextRequest } from "next/server";
import { toggleWishlist } from "@/lib/services/wishlist";

export async function POST(request: NextRequest) {
  return toggleWishlist(request);
}
