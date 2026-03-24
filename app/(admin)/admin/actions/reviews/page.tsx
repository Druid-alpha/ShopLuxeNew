import Link from "next/link";
import { connectDB } from "@/lib/db";
import Review from "@/lib/db/models/review";
import ReviewsList from "./ReviewsList";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin Review Actions | ShopLuxe",
  description: "Server Actions with optimistic UI for reviews.",
};

export default async function AdminReviewActionsPage() {
  await connectDB();
  const reviews = await Review.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select("_id title rating isFeatured")
    .lean();

  const mapped = reviews.map((r: any) => ({
    id: String(r._id),
    title: String(r.title || ""),
    rating: Number(r.rating || 0),
    isFeatured: Boolean(r.isFeatured),
  }));

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Admin Review Actions</h1>
          <p className="mt-2 text-sm text-slate-600">
            Server actions + optimistic UI for review feature flags.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
        >
          Back to admin
        </Link>
      </div>

      <div className="mt-8">
        <ReviewsList reviews={mapped} />
      </div>
    </section>
  );
}
