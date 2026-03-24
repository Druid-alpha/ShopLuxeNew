import { type NextRequest } from "next/server";
import { paystackWebhook } from "@/lib/services/payments";

export async function POST(request: NextRequest) {
  return paystackWebhook(request);
}
