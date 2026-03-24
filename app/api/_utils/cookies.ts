import cookieOption from "@/lib/utils/cookieOptions";

export const buildCookieOptions = (maxAgeMs?: number) => {
  const raw = cookieOption(maxAgeMs);
  const normalized: typeof raw = { ...raw };

  if (normalized.maxAge) {
    normalized.maxAge = Math.floor(normalized.maxAge / 1000);
  }

  return normalized;
};

