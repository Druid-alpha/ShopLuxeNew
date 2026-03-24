import { type NextRequest } from "next/server";
import { exportProductsCsv } from "@/lib/services/admin";

export async function GET(request: NextRequest) {
  return exportProductsCsv(request);
}
