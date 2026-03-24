import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | ShopLuxe",
  description: "Admin dashboard and management tools.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
