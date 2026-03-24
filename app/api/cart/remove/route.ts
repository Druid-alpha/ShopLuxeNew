import type { NextRequest } from "next/server";
import { removeCartItem } from "@/lib/services/cart";

export async function DELETE(request: NextRequest) {
  return removeCartItem(request);
}
