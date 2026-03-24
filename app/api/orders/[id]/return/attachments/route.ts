import { type NextRequest } from "next/server";
import { uploadReturnAttachments } from "@/lib/services/orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return uploadReturnAttachments(request, (await params).id);
}
