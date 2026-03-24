import { type NextRequest } from "next/server";
import { updateOrderStatus } from "@/lib/services/orders";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateOrderStatus(request, (await params).id);
}
