import { type NextRequest } from "next/server";
import { getProductFilters } from "@/lib/services/products";

export async function GET(request: NextRequest) {
  return getProductFilters(request);
}
