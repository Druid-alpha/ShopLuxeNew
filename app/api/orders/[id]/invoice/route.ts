import { type NextRequest } from "next/server";
import { generateInvoice } from "@/lib/services/orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return generateInvoice(request, (await params).id);
}
