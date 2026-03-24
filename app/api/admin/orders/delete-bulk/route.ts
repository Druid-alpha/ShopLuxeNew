import { type NextRequest } from "next/server";
import { bulkDeleteOrders } from "@/lib/services/admin";

export async function POST(request: NextRequest) {
  return bulkDeleteOrders(request);
}
