import type { NextRequest } from "next/server";
import { forgotPassword } from "@/lib/services/auth";
import { enforceRateLimit } from "@/app/api/_utils/rate-limit";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "auth:forgot-password",
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: "Too many reset requests. Please wait and try again.",
  });
  if (limited) return limited;
  return forgotPassword(request);
}
