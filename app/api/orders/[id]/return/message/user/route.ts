import { type NextRequest } from "next/server";
import { postReturnMessageUser } from "@/lib/services/orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return postReturnMessageUser(request, (await params).id);
}
