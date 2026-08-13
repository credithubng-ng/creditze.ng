import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69864d541609ebe758aa5d6d/ea48dae69_PHOTO-2026-02-05-09-26-23.jpg';

function getSafeReturnUrl(value) {
  if (!value) return createPageUrl('Dashboard');

  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : createPageUrl('Dashboard');
  } catch {
    return createPageUrl('Dashboard');
  }
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const returnUrl = getSafeReturnUrl(searchParams.get('from_url'));

  useEffect(() => {
    const forwardAuthenticatedUser = async () => {
      if (await base44.auth.isAuthenticated()) {
        window.location.replace(returnUrl);
      }
    };

    forwardAuthenticatedUser();
  }, [returnUrl]);

  const continueToSecureLogin = () => {
    setIsRedirecting(true);
    base44.auth.redirectToLogin(returnUrl);
  };

  return (
    <main className="min-h-screen bg-[#f4f6f2] text-emerald-950 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(52,211,153,0.26),transparent_26rem),radial-gradient(circle_at_90%_85%,rgba(16,185,129,0.18),transparent_30rem)]" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full border border-emerald-300/15" />
        <div className="absolute -bottom-16 -right-8 h-64 w-64 rounded-full border border-emerald-300/20" />

        <Link to={createPageUrl('Home')} className="relative z-10 w-fit rounded-xl bg-white px-3 py-2 shadow-xl shadow-black/20">
          <img src={LOGO_URL} alt="Creditze" className="h-8 w-auto" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 max-w-xl"
        >
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Credit without the friction</p>
          <h1 className="text-6xl font-semibold leading-[0.98] tracking-[-0.05em]">
            Money moves.
            <br />So should you.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-emerald-50/65">
            Access your Creditze account, manage repayments and apply for credit from one secure place.
          </p>
        </motion.div>

        <div className="relative z-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-emerald-50/70">
          {['Secure access', 'Transparent terms', 'Built for Nigeria'].map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-300" /> {item}
            </span>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-950/65 transition hover:text-emerald-950">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Link to={createPageUrl('Home')} className="rounded-xl bg-white px-3 py-2 shadow-sm lg:hidden">
            <img src={LOGO_URL} alt="Creditze" className="h-7 w-auto" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="m-auto w-full max-w-md py-16"
        >
          <div className="mb-8 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <p className="mb-3 text-sm font-semibold text-emerald-700">Welcome back</p>
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-emerald-950 sm:text-5xl">Sign in to Creditze</h2>
          <p className="mt-5 leading-relaxed text-slate-500">
            Continue to our secure sign-in service. You’ll return here automatically when you’re done.
          </p>

          <Button
            onClick={continueToSecureLogin}
            disabled={isRedirecting}
            className="mt-10 h-14 w-full rounded-2xl bg-emerald-950 text-base font-semibold text-white shadow-[0_18px_36px_-18px_rgba(2,44,34,0.75)] transition hover:-translate-y-0.5 hover:bg-emerald-900"
          >
            {isRedirecting ? 'Opening secure sign in…' : 'Continue to sign in'}
            {!isRedirecting && <ArrowRight className="ml-2 h-5 w-5" />}
          </Button>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-950/[0.08] bg-white/70 p-4 text-sm leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <p>Your password is handled by Base44’s secure authentication service and is never collected on this page.</p>
          </div>
        </motion.div>

        <p className="text-center text-xs text-slate-400">
          By continuing, you agree to Creditze’s terms and privacy policy.
        </p>
      </section>
    </main>
  );
}
