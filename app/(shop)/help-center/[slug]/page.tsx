import Link from "next/link";
import { notFound } from "next/navigation";

const ARTICLES = [
  {
    slug: "track-order",
    title: "How to Track Your Order",
    summary: "Find your order status and delivery timeline.",
    body: [
      "Go to your account dashboard and open Orders.",
      "Select the order to see current status and tracking updates.",
      "If tracking stalls for more than 48 hours, contact support with your order ID.",
    ],
  },
  {
    slug: "refunds",
    title: "Refunds and Chargebacks",
    summary: "Understand refund timelines and eligibility.",
    body: [
      "Refunds are processed once a return is received and inspected.",
      "Your bank may take 3-10 business days to reflect the credit.",
      "If a chargeback is initiated, refund processing may be paused.",
    ],
  },
  {
    slug: "account-security",
    title: "Account Security Basics",
    summary: "Protect your account with simple steps.",
    body: [
      "Use a strong, unique password and change it regularly.",
      "Never share your OTP or password with anyone.",
      "Report suspicious activity immediately for a faster resolution.",
    ],
  },
];

export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = ARTICLES.find((item) => item.slug === params.slug);
  if (!article) return { title: "Help Center Article" };
  return {
    title: `${article.title} | Help Center`,
    description: article.summary,
  };
}

export const revalidate = 3600;

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export default function HelpCenterArticle({ params }: { params: { slug: string } }) {
  const article = ARTICLES.find((item) => item.slug === params.slug);
  if (!article) notFound();

  return (
    <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Help Center</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{article.title}</h1>
          <p className="text-sm text-slate-600">{article.summary}</p>
        </header>

        <ul className="space-y-3 text-sm leading-6 text-slate-700">
          {article.body.map((item) => (
            <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/help-center"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Back to Help Center
          </Link>
          <Link
            href="/products"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Browse products
          </Link>
        </div>
      </div>
    </section>
  );
}
