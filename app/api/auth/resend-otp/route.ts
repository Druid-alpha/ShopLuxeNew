import type { NextRequest } from "next/server";
import { resendOtp } from "@/lib/services/auth";
import { enforceRateLimit } from "@/app/api/_utils/rate-limit";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "auth:resend-otp",
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: "Too many OTP resend requests. Please wait and try again.",
  });
  if (limited) return limited;
  return resendOtp(request);
}
