import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account | ShopLuxe",
  description: "Secure sign in, account access, and password recovery.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
