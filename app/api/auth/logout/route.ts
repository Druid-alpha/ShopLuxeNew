import type { NextRequest } from "next/server";
import { logout } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  return logout(request);
}
