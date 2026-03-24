import cookieOption from "@/lib/utils/cookieOptions";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const buildCookieOptions = (maxAgeMs?: number) => {
  const raw = cookieOption(maxAgeMs) as Partial<ResponseCookie>;
  const normalized: Partial<ResponseCookie> = { ...raw };

  if (normalized.maxAge) {
    normalized.maxAge = Math.floor(normalized.maxAge / 1000);
  }

  return normalized;
};

