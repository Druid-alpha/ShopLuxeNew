import type { NextRequest } from "next/server";
import { getMe } from "@/lib/services/users";

export async function GET(request: NextRequest) {
  return getMe(request);
}
