import Link from "next/link";
import ConceptsSidebar from "@/components/ConceptsSidebar";

const SECTIONS = [
  {
    title: "Routing + Layouts",
    items: [
      { label: "Route groups (shop/auth/admin)", href: "/" },
      { label: "Nested layout examples", href: "/admin/overview" },
      { label: "Not found + error boundaries", href: "/products" },
    ],
  },
  {
    title: "Parallel + Intercepting Routes",
    items: [
      { label: "Shop product quick view (intercepting)", href: "/products" },
      { label: "Admin overview panels (parallel)", href: "/admin/overview" },
      { label: "Auth learning hub (parallel + modal)", href: "/learn" },
    ],
  },
  {
    title: "Server Actions",
    items: [
      { label: "Auth server actions demo", href: "/actions/login" },
      { label: "Cart server action demo", href: "/cart/actions" },
      { label: "Admin product actions (optimistic)", href: "/admin/actions/products" },
      { label: "Admin review actions (optimistic)", href: "/admin/actions/reviews" },
    ],
  },
  {
    title: "Caching + Revalidation",
    items: [
      { label: "Featured products (cache + revalidate)", href: "/products/featured" },
      { label: "Help center ISR (static params)", href: "/help-center/track-order" },
      { label: "Admin overview tags + revalidatePath", href: "/admin/overview" },
    ],
  },
  {
    title: "Streaming + Suspense",
    items: [
      { label: "Admin overview insights (Suspense)", href: "/admin/overview" },
      { label: "Featured products grid (Suspense)", href: "/products/featured" },
    ],
  },
  {
    title: "Edge + Middleware",
    items: [
      { label: "Edge ping API", href: "/api/edge/ping" },
      { label: "Auth + admin middleware", href: "/login" },
    ],
  },
];

export const metadata = {
  title: "Next Concepts Checklist | ShopLuxe",
  description: "A guided checklist to explore all Next.js concepts implemented in this project.",
};

export default function NextConceptsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Learning</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Next.js Concepts Checklist</h1>
        <p className="text-sm text-slate-600">
          Use this page as your single source of truth for everything we’ve implemented.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <ConceptsSidebar sections={SECTIONS} startHref="/next-concepts/start" />
        <div className="grid gap-6 lg:grid-cols-2">
          {SECTIONS.map((section) => (
            <div key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">{section.title}</h2>
              <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-800">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
