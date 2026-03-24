"use client"

import React from "react";
import PageTransition from "@/components/PageTransition";
import Wishlist from "@/features/wishlist/Wishlist";

export default function Page() {
  return (
    <PageTransition>
      <Wishlist />
    </PageTransition>
  );
}

