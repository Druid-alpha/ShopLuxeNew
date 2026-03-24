import type { NextRequest } from "next/server";
import { updateAvatar } from "@/lib/services/users";

export async function PUT(request: NextRequest) {
  return updateAvatar(request);
}
