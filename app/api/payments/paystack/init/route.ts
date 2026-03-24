import { type NextRequest } from "next/server";
import { initPaystack } from "@/lib/services/payments";

export async function POST(request: NextRequest) {
  return initPaystack(request);
}
