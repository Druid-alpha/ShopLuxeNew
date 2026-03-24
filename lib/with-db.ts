import { connectDB } from "@/lib/db";

export async function withDB<T>(handler: () => Promise<T>) {
  await connectDB();
  return handler();
}
