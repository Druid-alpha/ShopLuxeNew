import { getAdminStats } from "@/lib/server/adminStats";

export default async function Insights() {
  const stats = await getAdminStats();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Insights</h2>
      <p className="mt-3 text-sm text-slate-600">
        {stats.totalUsers.toLocaleString()} users have placed{" "}
        {stats.totalOrders.toLocaleString()} orders so far.
      </p>
    </div>
  );
}
