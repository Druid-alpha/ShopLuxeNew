import type { NextRequest } from "next/server";
import { getMe, updateMe } from "@/lib/services/users";

export async function GET(request: NextRequest) {
  return getMe(request);
}

export async function PUT(request: NextRequest) {
  return updateMe(request);
}
