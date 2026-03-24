import type { NextRequest } from "next/server";
import { syncCart } from "@/lib/services/cart";

export async function POST(request: NextRequest) {
  return syncCart(request);
}
