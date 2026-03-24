import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import User from "@/lib/db/models/user";
import Order from "@/lib/db/models/order";

export type AdminActivity = {
  recentOrders: Array<{
    id: string;
    orderId: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
};

async function fetchAdminActivity(): Promise<AdminActivity> {
  await connectDB();

  const [orders, users] = await Promise.all([
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id totalAmount status createdAt")
      .lean(),
    User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id name email createdAt")
      .lean(),
  ]);

  return {
    recentOrders: orders.map((order: any) => ({
      id: String(order._id),
      orderId: String(order._id),
      total: Number(order.totalAmount || 0),
      status: String(order.status || "pending"),
      createdAt: new Date(order.createdAt).toISOString(),
    })),
    recentUsers: users.map((user: any) => ({
      id: String(user._id),
      name: String(user.name || "New user"),
      email: String(user.email || ""),
      createdAt: new Date(user.createdAt).toISOString(),
    })),
  };
}

export const getAdminActivity = unstable_cache(fetchAdminActivity, ["admin-activity"], {
  revalidate: 30,
  tags: ["admin-activity"],
});
