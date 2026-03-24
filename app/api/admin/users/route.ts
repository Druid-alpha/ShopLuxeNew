import type { NextRequest } from "next/server";
import { adminListUsers } from "@/lib/services/users";

export async function GET(request: NextRequest) {
  return adminListUsers(request);
}
