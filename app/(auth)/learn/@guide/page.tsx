import Link from "next/link";

const tips = [
  { slug: "secure-passwords", title: "Secure Passwords" },
  { slug: "otp-flow", title: "OTP Verification Flow" },
  { slug: "reset-links", title: "Reset Links" },
];

export default function GuideSlot() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Guide</h2>
      <p className="mt-3 text-sm text-slate-600">Quick tips for building safe auth flows.</p>
      <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-800">
        {tips.map((tip) => (
          <li key={tip.slug}>
            <Link href={`/learn/tips/${tip.slug}`} className="hover:underline">
              {tip.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
