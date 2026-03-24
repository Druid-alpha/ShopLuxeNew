"use client"

import React, { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompareDrawer from "@/components/CompareDrawer";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
      <Navbar />
      <main className="min-h-[80vh] bg-background p-4">{children}</main>
      <Footer />
      <CompareDrawer />
      <Toaster />
    </>
  );
}

