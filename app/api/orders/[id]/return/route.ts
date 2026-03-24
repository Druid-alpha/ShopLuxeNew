import { type NextRequest } from "next/server";
import { requestReturn, updateReturnStatus } from "@/lib/services/orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requestReturn(request, (await params).id);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateReturnStatus(request, (await params).id);
}
