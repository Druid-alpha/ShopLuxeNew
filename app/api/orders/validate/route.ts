import { type NextRequest } from "next/server";
import { validateOrder } from "@/lib/services/orders";

export async function POST(request: NextRequest) {
  return validateOrder(request);
}
