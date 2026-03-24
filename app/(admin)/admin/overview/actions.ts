"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function refreshAdminOverview() {
  revalidateTag("admin-stats", "default");
  revalidateTag("admin-activity", "default");
  revalidatePath("/admin/overview");
}
