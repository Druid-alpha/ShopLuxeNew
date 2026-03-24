"use client";

import PageTransition from "@/components/PageTransition";
import ProductDetails from "@/features/products/ProductDetails";

export default function ClientProductPage() {
  return (
    <PageTransition>
      <ProductDetails />
    </PageTransition>
  );
}
