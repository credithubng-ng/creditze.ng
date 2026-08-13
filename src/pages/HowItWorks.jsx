import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  FileText,
  Zap,
  Building2,
  Gift,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HowItWorks() {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    const auth = await base44.auth.isAuthenticated();
    if (auth) {
      navigate(createPageUrl('Dashboard'));
    } else {
      base44.auth.redirectToLogin(createPageUrl('Dashboard'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">How It Works</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Getting Your Loan is Simple
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Follow these simple steps to access quick loans and build your credit history
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-12">
          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <Users className="w-8 h-8 text-emerald-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Complete Your KYC</h3>
                    <p className="text-gray-600 mb-4">
                      Verify your identity to ensure security and compliance. We need:
                    </p>
                    <ul className="space-y-2">
                      {[
                        'Phone number verification',
                        'BVN (Bank Verification Number)',
                        'NIN (National Identification Number)',
                        'Residential address',
                        'Property details',
                        'Bank account information'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <FileText className="w-8 h-8 text-amber-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Complete Credit Search</h3>
                    <p className="text-gray-600 mb-4">
                      Pay a one-time fee of ₦850 to check your credit bureau score. This report is valid for 90 days and helps us determine your loan eligibility.
                    </p>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <p className="text-sm text-amber-800">
                        <strong>💡 Tip:</strong> Your credit search is valid for 90 days, so you can apply for multiple loans within this period without paying again.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <Clock className="w-8 h-8 text-blue-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Get Your Loan Score</h3>
                    <p className="text-gray-600 mb-4">
                      Our advanced ML-powered system analyzes your data to generate a loan score out of 100. The score is based on:
                    </p>
                    <ul className="space-y-2">
                      {[
                        'Credit bureau score (40%)',
                        'Repayment behavior (20%)',
                        'Property stability (15%)',
                        'Identity verification (15%)',
                        'Employment status (10%)',
                        'ML behavioral analysis (optional boost)'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 4 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                      <Zap className="w-8 h-8 text-purple-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Choose Your Loan Product</h3>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-semibold text-gray-900">Urgent ₦50,000</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Access up to ₦50,000 for urgent needs
                        </p>
                        <ul className="text-xs space-y-1">
                          <li>• Min score: 60/100</li>
                          <li>• Interest: 15%</li>
                          <li>• Tenure: 30 days</li>
                          <li>• Maximum amount: ₦50,000</li>
                        </ul>
                      </div>
                      <div className="bg-gray-900 text-white rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-emerald-400" />
                          <h4 className="font-semibold">Tier-1 Personal</h4>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          Larger loans for verified employees
                        </p>
                        <ul className="text-xs space-y-1 text-gray-300">
                          <li>• Up to ₦5,000,000</li>
                          <li>• Min score: 75/100</li>
                          <li>• Interest: 12%</li>
                          <li>• Tenure: 90 days</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 5 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      5
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Set Up Direct Debit & Get Funded</h3>
                    <p className="text-gray-600 mb-4">
                      Once approved, set up automatic repayments and receive your funds instantly:
                    </p>
                    <ul className="space-y-2 mb-4">
                      {[
                        'Authorize direct debit for repayment',
                        'Loan is automatically disbursed to your bank',
                        'Funds arrive within minutes',
                        'Automatic deduction on due date'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>🎉 Success!</strong> Successful repayment keeps you eligible for future Urgent ₦50,000 applications.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Referral Program */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-purple-700">
            <CardContent className="p-8">
              <div className="flex items-start gap-6 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Gift className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">Earn Through Referrals</h3>
                  <p className="text-purple-100 mb-4">
                    Invite friends and earn ₦1,000 when they take their first loan. They get a 2% interest discount too!
                  </p>
                  <div className="flex gap-4">
                    <Button
                      onClick={handleGetStarted}
                      className="bg-white text-purple-600 hover:bg-purple-50"
                    >
                      Get Your Referral Code
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of Nigerians who are building their credit and accessing quick loans with Creditze.ng
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-6 text-lg"
          >
            Apply for a Loan <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
