import Link from "next/link";
import { notFound } from "next/navigation";

const tips = {
  "secure-passwords": {
    title: "Secure Passwords",
    body: "Use long passphrases, rate-limit login attempts, and store salted hashes.",
  },
  "otp-flow": {
    title: "OTP Verification Flow",
    body: "Generate short-lived OTPs, throttle resends, and block brute-force attempts.",
  },
  "reset-links": {
    title: "Reset Links",
    body: "Use random tokens, store hashes, and expire links quickly.",
  },
};

export default function TipPage({ params }: { params: { slug: string } }) {
  const tip = tips[params.slug as keyof typeof tips];
  if (!tip) notFound();

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">{tip.title}</h1>
        <p className="mt-3 text-sm text-slate-600">{tip.body}</p>
        <div className="mt-6">
          <Link
            href="/learn"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Back to learning hub
          </Link>
        </div>
      </div>
    </section>
  );
}
