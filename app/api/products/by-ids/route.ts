import { type NextRequest } from "next/server";
import { getProductsByIds } from "@/lib/services/products";

export async function GET(request: NextRequest) {
  return getProductsByIds(request);
}
