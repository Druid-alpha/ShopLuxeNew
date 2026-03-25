import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Product from "@/lib/db/models/product";
import ModalClose from "@/components/ModalClose";
import ModalNavigate from "@/components/ModalNavigate";

type Params = Promise<{
  id: string;
}>;

const pickImage = (product: any) =>
  product?.images?.[0]?.url ||
  product?.image?.url ||
  product?.image ||
  product?.thumbnail ||
  product?.variants?.[0]?.image?.url ||
  "/placeholder.png";

export default async function ProductQuickViewModal({ params }: { params: Params }) {
  const { id } = await params;
  await connectDB();
  const product = await Product.findOne({ _id: id, isDeleted: false })
    .select("title price discount images variants avgRating reviewsCount")
    .lean();

  if (!product) notFound();

  const imageUrl = pickImage(product);
  const discount = Number(product.discount || 0);
  const price = Number(product.price || 0);
  const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <ModalClose
        fallbackHref="/products"
        ariaLabel="Close product preview"
        className="absolute inset-0 bg-black/50"
      >
        <span className="sr-only">Close</span>
      </ModalClose>
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-50">
            <img
              src={imageUrl}
              alt={product.title}
              className="h-full w-full object-contain p-4"
            />
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{product.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {product.reviewsCount || 0} reviews - {Number(product.avgRating || 0).toFixed(1)} rating
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-slate-900">
                NGN {finalPrice.toLocaleString()}
              </span>
              {discount > 0 && (
                <span className="text-sm font-semibold text-rose-600">-{discount}%</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <ModalNavigate
                href={`/product/${id}`}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                View full details
              </ModalNavigate>
              <ModalClose
                fallbackHref="/products"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
              >
                Close
              </ModalClose>
            </div>
            <p className="text-sm text-slate-600">
              This is a quick preview. You can close it to keep your place, or open the full page
              for details, variants, and reviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
