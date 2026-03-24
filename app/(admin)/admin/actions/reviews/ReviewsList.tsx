"use client";

import { useOptimistic } from "react";
import { toggleFeaturedReviewAction } from "./actions";

type ReviewRow = {
  id: string;
  title: string;
  rating: number;
  isFeatured: boolean;
};

export default function ReviewsList({ reviews }: { reviews: ReviewRow[] }) {
  const [optimisticReviews, applyUpdate] = useOptimistic(
    reviews,
    (state: ReviewRow[], update: { id: string; nextFeatured: boolean }) =>
      state.map((item) =>
        item.id === update.id ? { ...item, isFeatured: update.nextFeatured } : item
      )
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Review Actions (Optimistic)</h2>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Server Actions + Optimistic UI
        </p>
      </div>
      <div className="space-y-3">
        {optimisticReviews.map((review) => (
          <div
            key={review.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{review.title || "Untitled review"}</p>
              <p className="text-xs text-slate-500">
                Rating: {review.rating}/5 · {review.isFeatured ? "Featured" : "Standard"}
              </p>
            </div>
            <form
              action={toggleFeaturedReviewAction}
              onSubmit={() => applyUpdate({ id: review.id, nextFeatured: !review.isFeatured })}
            >
              <input type="hidden" name="id" value={review.id} />
              <input type="hidden" name="nextFeatured" value={String(!review.isFeatured)} />
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-black"
              >
                {review.isFeatured ? "Unfeature" : "Feature"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
