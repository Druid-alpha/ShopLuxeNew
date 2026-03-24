import type { NextRequest } from "next/server";
import { getWishlist, toggleWishlist } from "@/lib/services/wishlist";

export async function GET(request: NextRequest) {
  return getWishlist(request);
}

export async function POST(request: NextRequest) {
  return toggleWishlist(request);
}
