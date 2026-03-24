import ProductCard from "@/features/products/ProductCard";
import { getFeaturedProducts } from "@/lib/server/shopProducts";

export default async function FeaturedGrid() {
  const products = await getFeaturedProducts();
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product: any) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
