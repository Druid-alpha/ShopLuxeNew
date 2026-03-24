import { type NextRequest } from "next/server";
import { deleteOrder, getOrderById } from "@/lib/services/orders";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return getOrderById(request, (await params).id);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return deleteOrder(request, (await params).id);
}
