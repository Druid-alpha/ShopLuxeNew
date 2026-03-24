import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import User from "@/lib/db/models/user";
import Order from "@/lib/db/models/order";
import Product from "@/lib/db/models/product";

export type AdminStats = {
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
};

async function fetchAdminStats(): Promise<AdminStats> {
  await connectDB();

  const [totalUsers, totalOrders, pendingOrders, totalProducts] = await Promise.all([
    User.countDocuments({}),
    Order.countDocuments({}),
    Order.countDocuments({ status: { $in: ["pending", "processing"] } }),
    Product.countDocuments({ isDeleted: false }),
  ]);

  return {
    totalUsers,
    totalOrders,
    pendingOrders,
    totalProducts,
  };
}

export const getAdminStats = unstable_cache(fetchAdminStats, ["admin-stats"], {
  revalidate: 60,
  tags: ["admin-stats"],
});
