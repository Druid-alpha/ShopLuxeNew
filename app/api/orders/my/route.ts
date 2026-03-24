import { type NextRequest } from "next/server";
import { listMyOrders } from "@/lib/services/orders";

export async function GET(request: NextRequest) {
  return listMyOrders(request);
}
