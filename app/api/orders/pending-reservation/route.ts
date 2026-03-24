import { type NextRequest } from "next/server";
import { getPendingReservation } from "@/lib/services/orders";

export async function GET(request: NextRequest) {
  return getPendingReservation(request);
}
