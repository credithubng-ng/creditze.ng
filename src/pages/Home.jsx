import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Shield, 
  Clock, 
  TrendingUp, 
  CheckCircle2,
  Zap,
  Building2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState(null);
  const [user, setUser] = useState(null);
  const [creditSearch, setCreditSearch] = useState(null);

  useEffect(() => {
    checkAuth();
    captureAffiliate();
    captureReferral();
  }, []);

  const checkAuth = async () => {
    const auth = await base44.auth.isAuthenticated();
    setIsAuthenticated(auth);
    
    if (auth) {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
  };

  const captureAffiliate = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode = urlParams.get('aff');
    if (affiliateCode) {
      localStorage.setItem('affiliate_code', affiliateCode);
    }
  };

  const captureReferral = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    if (referralCode) {
      localStorage.setItem('referral_code', referralCode);
    }
  };



  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = createPageUrl('Dashboard');
    } else {
      base44.auth.redirectToLogin(createPageUrl('Dashboard'));
    }
  };

  return (
    <div className="creditze-shell overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-emerald-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lg shadow-black/10">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69864d541609ebe758aa5d6d/ea48dae69_PHOTO-2026-02-05-09-26-23.jpg" 
              alt="Creditze Logo" 
              className="h-8"
            />
          </div>
          <Button 
            onClick={handleGetStarted}
            className="creditze-primary-button px-6"
          >
            {isAuthenticated ? 'Dashboard' : 'Get Started'}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-emerald-950 px-5 pb-28 pt-40 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(52,211,153,0.20),transparent_32rem)]" />
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="creditze-eyebrow mb-7">
              <Shield className="h-4 w-4" /> Licensed credit. Designed around you.
            </span>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.045em] mb-7 leading-[0.98]">
              Credit that moves
              <br />
              <span className="text-emerald-300">at your pace.</span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-50/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Get transparent access to Urgent ₦50,000 and Tier-1 personal loans, with secure verification and no confusing paperwork.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="creditze-primary-button px-8 py-6 text-base"
              >
                Apply Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="rounded-xl border-white/25 bg-white/5 px-8 py-6 text-base text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to={createPageUrl('HowItWorks')}>
                  Learn More
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 -mt-12 px-5 pb-16">
        <div className="creditze-glass max-w-5xl mx-auto rounded-[1.75rem] p-3 md:p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: '₦50k', label: 'Loan Amount' },
              { value: '5 mins', label: 'Quick Approval' },
              { value: '₦50k', label: 'Available Limit' },
              { value: '₦5M', label: 'Borrow Up to' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="rounded-2xl p-5 text-center transition hover:bg-emerald-50/70"
              >
                <div className="text-2xl md:text-3xl font-semibold tracking-tight text-emerald-950">{stat.value}</div>
                <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="px-5 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Simple by design</span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-emerald-950 mt-3 mb-4">Credit for today and tomorrow.</h2>
            <p className="text-slate-500">Two focused options. Clear terms. No product maze.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Urgent 50k */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="creditze-card relative overflow-hidden p-8 md:p-10"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -translate-y-16 translate-x-16" />
              <div className="relative">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Urgent ₦50,000</h3>
                <p className="text-gray-500 mb-6">Fast support for urgent personal needs</p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Borrow up to ₦50,000',
                    'Instant approval if eligible',
                    'Up to ₦50,000 per application',
                    'Build your credit history'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={handleGetStarted}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl py-6"
                >
                  Apply Now
                </Button>
              </div>
            </motion.div>

            {/* Tier 1 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[1.5rem] border border-emerald-800 bg-emerald-950 p-8 shadow-[0_30px_70px_-40px_rgba(2,44,34,0.9)] md:p-10"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full -translate-y-16 translate-x-16" />
              <div className="relative">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Building2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Tier-1 Personal Loan</h3>
                <p className="text-gray-400 mb-6">For employees of approved companies</p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Up to ₦5,000,000',
                    'Employer verification',
                    'Competitive rates',
                    'Flexible tenure'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={handleGetStarted}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-xl py-6"
                >
                  Check Eligibility
                </Button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-emerald-950/[0.06] bg-white/70 px-5 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-emerald-950 mb-4">From application to access.</h2>
            <p className="text-gray-600">Simple steps to get your loan</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Users, title: 'Complete KYC', desc: 'Verify your identity with BVN & NIN' },
              { icon: Shield, title: 'Credit Check', desc: 'Pay for credit search (₦850)' },
              { icon: Clock, title: 'Get Scored', desc: 'Automated scoring in minutes' },
              { icon: TrendingUp, title: 'Receive Funds', desc: 'Instant disbursement to your bank' }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 border border-emerald-200 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm">
                    <step.icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 text-white py-14 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69864d541609ebe758aa5d6d/ea48dae69_PHOTO-2026-02-05-09-26-23.jpg" 
                alt="Creditze Logo" 
                className="h-10"
              />
            </div>
            <div className="flex gap-6 text-gray-400 text-sm">
              <Link to={createPageUrl('Terms')} className="hover:text-white transition">Terms</Link>
              <Link to={createPageUrl('Privacy')} className="hover:text-white transition">Privacy</Link>
              <Link to={createPageUrl('Contact')} className="hover:text-white transition">Contact</Link>
            </div>
          </div>
          
          {/* Regulatory Compliance */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-center text-gray-400 text-xs mb-4">Registered and Regulated by</p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <a href="https://ndpc.gov.ng/" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
                <img 
                  src="https://ndpc.gov.ng/wp-content/uploads/2024/02/cropped-NDPC_logo.png" 
                  alt="NDPC - Nigeria Data Protection Commission" 
                  className="h-12 md:h-14"
                />
              </a>
              <a href="https://fccpc.gov.ng/" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
                <img 
                  src="https://cdn.brandfetch.io/id6aUp1mV6/w/400/h/400/theme/dark/icon.jpeg" 
                  alt="FCCPC - Federal Competition and Consumer Protection Commission" 
                  className="h-12 md:h-14 rounded-lg"
                />
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            © 2026 Creditze. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
