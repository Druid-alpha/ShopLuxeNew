import type { NextRequest } from "next/server";
import { addToCart } from "@/lib/services/cart";

export async function POST(request: NextRequest) {
  return addToCart(request);
}
