import type { NextRequest } from "next/server";
import { register } from "@/lib/services/auth";
import { enforceRateLimit } from "@/app/api/_utils/rate-limit";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "auth:register",
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many attempts. Please try again later.",
  });
  if (limited) return limited;
  return register(request);
}
