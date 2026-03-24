import Link from "next/link";
import { getAdminActivity } from "@/lib/server/adminActivity";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function ActivitySlot() {
  const activity = await getAdminActivity();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Recent Activity</h2>
      <div className="mt-4 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Latest orders</p>
          <ul className="mt-3 space-y-3">
            {activity.recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">#{order.orderId}</p>
                  <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                </div>
                <Link
                  href={`/admin/overview/orders/${order.id}`}
                  className="text-xs font-semibold text-slate-700 hover:text-black"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Newest users</p>
          <ul className="mt-3 space-y-3">
            {activity.recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <span className="text-xs text-slate-400">{formatDate(user.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
