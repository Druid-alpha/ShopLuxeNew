import type { NextRequest } from "next/server";
import { resetPassword } from "@/lib/services/auth";
import { enforceRateLimit } from "@/app/api/_utils/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "auth:reset-password",
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: "Too many reset requests. Please wait and try again.",
  });
  if (limited) return limited;
  return resetPassword(request, (await params).token);
}
