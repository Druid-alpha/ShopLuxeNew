import { type NextRequest } from "next/server";
import { downloadInvoice } from "@/lib/services/orders";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return downloadInvoice(request, (await params).id);
}
