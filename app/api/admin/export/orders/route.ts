import { type NextRequest } from "next/server";
import { exportOrdersCsv } from "@/lib/services/admin";

export async function GET(request: NextRequest) {
  return exportOrdersCsv(request);
}
