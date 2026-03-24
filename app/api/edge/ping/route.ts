import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Hello from the Edge runtime",
    at: new Date().toISOString(),
  });
}
