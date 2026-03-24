import { type NextRequest } from "next/server";
import { postReturnMessageAdmin } from "@/lib/services/orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return postReturnMessageAdmin(request, (await params).id);
}
