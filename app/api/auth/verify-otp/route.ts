import type { NextRequest } from "next/server";
import { verifyOtp } from "@/lib/services/auth";
import { enforceRateLimit } from "@/app/api/_utils/rate-limit";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "auth:verify-otp",
    windowMs: 10 * 60 * 1000,
    max: 8,
    message: "Too many OTP attempts. Please wait and try again.",
  });
  if (limited) return limited;
  return verifyOtp(request);
}
