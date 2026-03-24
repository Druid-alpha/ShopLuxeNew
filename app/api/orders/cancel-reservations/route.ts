import { type NextRequest } from "next/server";
import { cancelOrderReservations } from "@/lib/services/orders";

export async function POST(request: NextRequest) {
  return cancelOrderReservations(request);
}
