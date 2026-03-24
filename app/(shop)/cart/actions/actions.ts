"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function clearDemoCartAction() {
  const jar = await cookies();
  jar.set("demoCart", "", { expires: new Date(0) });
  revalidatePath("/cart/actions");
}
