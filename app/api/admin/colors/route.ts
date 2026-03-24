import type { NextRequest } from "next/server";
import { createAdminColor } from "@/lib/services/admin";

export async function POST(request: NextRequest) {
  return createAdminColor(request);
}
