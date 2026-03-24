import type { NextRequest } from "next/server";
import { updateCartItem } from "@/lib/services/cart";

export async function PUT(request: NextRequest) {
  return updateCartItem(request);
}
