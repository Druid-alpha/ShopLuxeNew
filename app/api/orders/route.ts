import { type NextRequest } from "next/server";
import { createOrder, listAllOrders } from "@/lib/services/orders";

export async function GET(request: NextRequest) {
  return listAllOrders(request);
}

export async function POST(request: NextRequest) {
  return createOrder(request);
}
