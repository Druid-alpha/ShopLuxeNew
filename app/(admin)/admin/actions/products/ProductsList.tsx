"use client";

import { useOptimistic } from "react";
import { toggleFeaturedAction, softDeleteProductAction } from "./actions";

type ProductRow = {
  id: string;
  title: string;
  price: number;
  featured: boolean;
  isDeleted: boolean;
};

type OptimisticUpdate =
  | { type: "toggleFeatured"; id: string; nextFeatured: boolean }
  | { type: "softDelete"; id: string };

export default function ProductsList({ products }: { products: ProductRow[] }) {
  const [optimisticProducts, applyUpdate] = useOptimistic(
    products,
    (state: ProductRow[], update: OptimisticUpdate) => {
      if (update.type === "toggleFeatured") {
        return state.map((item) =>
          item.id === update.id ? { ...item, featured: update.nextFeatured } : item
        );
      }
      if (update.type === "softDelete") {
        return state.map((item) =>
          item.id === update.id ? { ...item, isDeleted: true } : item
        );
      }
      return state;
    }
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Product Actions (Optimistic)</h2>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Server Actions + Optimistic UI
        </p>
      </div>
      <div className="space-y-3">
        {optimisticProducts.map((product) => (
          <div
            key={product.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{product.title}</p>
              <p className="text-xs text-slate-500">
                ₦{Number(product.price || 0).toLocaleString()} ·{" "}
                {product.featured ? "Featured" : "Standard"} ·{" "}
                {product.isDeleted ? "Deleted" : "Active"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form
                action={toggleFeaturedAction}
                onSubmit={() =>
                  applyUpdate({
                    type: "toggleFeatured",
                    id: product.id,
                    nextFeatured: !product.featured,
                  })
                }
              >
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="nextFeatured" value={String(!product.featured)} />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-black"
                >
                  {product.featured ? "Unfeature" : "Feature"}
                </button>
              </form>
              <form
                action={softDeleteProductAction}
                onSubmit={() => applyUpdate({ type: "softDelete", id: product.id })}
              >
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Soft delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
