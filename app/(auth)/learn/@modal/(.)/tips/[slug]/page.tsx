import Link from "next/link";
import { notFound } from "next/navigation";
import ModalClose from "@/components/ModalClose";
import ModalNavigate from "@/components/ModalNavigate";

const tips = {
  "secure-passwords": {
    title: "Secure Passwords",
    summary: "Stronger passwords cut account takeovers and reduce support headaches.",
    why: "Short or reused passwords are the #1 reason accounts get compromised.",
    actions: [
      "Encourage long passphrases over complex symbols.",
      "Limit login attempts and lock temporarily after failures.",
      "Store passwords with a slow hash (bcrypt, scrypt, or Argon2).",
    ],
  },
  "otp-flow": {
    title: "OTP Verification Flow",
    summary: "OTP should be fast for users and hard for attackers.",
    why: "Without throttling, OTP endpoints are easy to abuse.",
    actions: [
      "Expire OTPs quickly (5 to 10 minutes).",
      "Throttle resends and track failed attempts.",
      "Block the user temporarily after too many retries.",
    ],
  },
  "reset-links": {
    title: "Reset Links",
    summary: "Reset links should be one-time and short-lived.",
    why: "Long-lived tokens can be reused if leaked.",
    actions: [
      "Generate cryptographically random tokens.",
      "Store only the hash of the token in the database.",
      "Expire tokens quickly and invalidate after use.",
    ],
  },
};

type Params = Promise<{ slug: string }>;

export default async function TipModal({ params }: { params: Params }) {
  const { slug } = await params;
  const tip = tips[slug as keyof typeof tips];
  if (!tip) notFound();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <ModalClose
        fallbackHref="/learn"
        ariaLabel="Close tip"
        className="absolute inset-0 bg-black/40"
      >
        <span className="sr-only">Close</span>
      </ModalClose>
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-black text-slate-900">{tip.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{tip.summary}</p>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Why it matters</p>
          <p className="mt-2 text-sm text-slate-700">{tip.why}</p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick actions</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {tip.actions.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex gap-3">
          <ModalClose
            fallbackHref="/learn"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Close
          </ModalClose>
          <ModalNavigate
            href={`/learn/tips/${slug}`}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Open full page
          </ModalNavigate>
        </div>
      </div>
    </div>
  );
}
