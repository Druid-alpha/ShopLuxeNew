import type { NextRequest } from "next/server";
import { refresh } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  return refresh(request);
}
