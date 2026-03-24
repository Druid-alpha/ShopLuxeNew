import { type NextRequest } from "next/server";
import { refundPaystack } from "@/lib/services/payments";

export async function POST(request: NextRequest) {
  return refundPaystack(request);
}
