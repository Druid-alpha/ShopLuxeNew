import type { NextRequest } from "next/server";
import { getCart } from "@/lib/services/cart";

export async function GET(request: NextRequest) {
  return getCart(request);
}
