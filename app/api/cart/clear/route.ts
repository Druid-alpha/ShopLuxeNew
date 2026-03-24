import type { NextRequest } from "next/server";
import { clearCart } from "@/lib/services/cart";

export async function DELETE(request: NextRequest) {
  return clearCart(request);
}
