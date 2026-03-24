import { type NextRequest } from "next/server";
import { listProducts } from "@/lib/services/products";

export async function GET(request: NextRequest) {
  return listProducts(request);
}
