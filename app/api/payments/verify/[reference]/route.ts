import { type NextRequest } from "next/server";
import { verifyPayment } from "@/lib/services/payments";

export async function GET(request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  return verifyPayment(request, (await params).reference);
}
