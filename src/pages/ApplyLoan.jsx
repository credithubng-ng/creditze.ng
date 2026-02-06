import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { calculateMLScore, calculateCombinedScore } from '../components/scoring/MLScoreCalculator';
import ScoreDisplay from '../components/scoring/ScoreDisplay';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Building2, 
  ArrowLeft, 
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calculator,
  Calendar,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function ApplyLoan() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [creditSearch, setCreditSearch] = useState(null);
  const [creditLimit, setCreditLimit] = useState(null);
  const [employmentVerification, setEmploymentVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loanAmount, setLoanAmount] = useState(10000);
  const [loanDetails, setLoanDetails] = useState(null);
  const [mlScoreResult, setMlScoreResult] = useState(null);
  const [mlConfig, setMlConfig] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [kycData, searchData, limitData, empData, mlConfigData, behaviorDataResult] = await Promise.all([
        base44.entities.KYCProfile.filter({ user_id: currentUser.id }),
        base44.entities.CreditSearch.filter({ user_id: currentUser.id }, '-created_date', 1),
        base44.entities.UserCreditLimit.filter({ user_id: currentUser.id }),
        base44.entities.EmploymentVerification.filter({ user_id: currentUser.id, status: 'verified' }),
        base44.entities.MLScoringConfig.filter({ config_key: 'default' }),
        base44.entities.UserBehaviorData.filter({ user_id: currentUser.id })
      ]);

      setKyc(kycData[0]);
      setCreditSearch(searchData[0]);
      setCreditLimit(limitData[0]);
      setEmploymentVerification(empData[0]);
      setMlConfig(mlConfigData[0]);
      setBehaviorData(behaviorDataResult[0]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCreditSearchValid = () => {
    if (!creditSearch || creditSearch.search_status !== 'successful') return false;
    const expiry = new Date(creditSearch.expiry_date);
    return expiry > new Date();
  };

  const canApply = () => {
    return kyc?.kyc_status === 'verified' && isCreditSearchValid() && !creditLimit?.is_frozen;
  };

  const calculateScore = () => {
    let ruleScore = 0;
    
    // Credit bureau score (40 points)
    if (creditSearch?.bureau_score) {
      const bureauScore = creditSearch.bureau_score;
      if (bureauScore >= 700) ruleScore += 40;
      else if (bureauScore >= 600) ruleScore += 30;
      else if (bureauScore >= 500) ruleScore += 20;
      else ruleScore += 10;
    }

    // Repayment behaviour (20 points)
    if (creditLimit) {
      const successRate = creditLimit.successful_repayments / Math.max(creditLimit.total_loans_taken, 1);
      ruleScore += Math.floor(successRate * 20);
    }

    // Property stability (15 points)
    if (kyc?.property_years >= 3) ruleScore += 15;
    else if (kyc?.property_years >= 1) ruleScore += 10;
    else ruleScore += 5;

    // Identity consistency (15 points)
    if (kyc?.bvn_verified && kyc?.nin_verified) ruleScore += 15;
    else if (kyc?.bvn_verified || kyc?.nin_verified) ruleScore += 8;

    // Employment verification for Tier-1 (10 points)
    if (employmentVerification) ruleScore += 10;

    return ruleScore;
  };

  const calculateFullScore = async () => {
    const ruleScore = calculateScore();
    
    // Check if ML scoring is enabled
    if (mlConfig?.enable_ml_scoring && behaviorData) {
      const mlResult = await calculateMLScore(user.id, behaviorData, mlConfig);
      const combinedScore = calculateCombinedScore(ruleScore, mlResult.ml_score, mlConfig.ml_score_weight);
      
      const fullResult = {
        rule_based_score: ruleScore,
        ml_score: mlResult.ml_score,
        combined_score: combinedScore,
        ml_score_breakdown: mlResult.ml_score_breakdown,
        risk_flags_detected: mlResult.risk_flags_detected,
        bonus_factors_applied: mlResult.bonus_factors_applied,
        confidence_level: mlResult.confidence_level,
        recommendation: mlResult.recommendation,
        explanation: mlResult.explanation
      };
      
      setMlScoreResult(fullResult);
      return combinedScore;
    }
    
    // Fallback to rule-based only
    setMlScoreResult({
      rule_based_score: ruleScore,
      ml_score: null,
      combined_score: ruleScore,
      confidence_level: 'high',
      recommendation: ruleScore >= 75 ? 'approve' : ruleScore >= 60 ? 'review' : 'reject'
    });
    return ruleScore;
  };

  const selectProduct = async (product) => {
    setSelectedProduct(product);
    const score = await calculateFullScore();
    
    if (product === 'urgent_10k') {
      const maxAmount = creditLimit?.current_limit || 10000;
      setLoanAmount(Math.min(10000, maxAmount));
      setLoanDetails({
        interestRate: 15,
        tenureDays: 30,
        score,
        minScore: 60,
        maxAmount
      });
    } else {
      const maxAmount = Math.min(500000, score >= 90 ? 500000 : score >= 80 ? 300000 : 100000);
      setLoanAmount(50000);
      setLoanDetails({
        interestRate: 12,
        tenureDays: 90,
        score,
        minScore: 75,
        maxAmount
      });
    }
  };

  const calculateRepayment = () => {
    if (!loanDetails) return 0;
    const interest = (loanAmount * loanDetails.interestRate * loanDetails.tenureDays) / (365 * 100);
    return loanAmount + interest;
  };

  const submitApplication = async () => {
    if (!loanDetails || loanDetails.score < loanDetails.minScore) {
      setError(`Your score (${loanDetails.score}) is below the minimum required (${loanDetails.minScore})`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Get affiliate code from localStorage
      const affiliateCode = localStorage.getItem('affiliate_code');

      const application = await base44.entities.LoanApplication.create({
        user_id: user.id,
        loan_type: selectedProduct,
        amount_requested: loanAmount,
        amount_approved: loanAmount,
        interest_rate: loanDetails.interestRate,
        tenure_days: loanDetails.tenureDays,
        total_repayment: calculateRepayment(),
        status: 'approved',
        score: loanDetails.score,
        score_breakdown: {
          bureau: creditSearch?.bureau_score,
          repayment_history: creditLimit?.successful_repayments || 0,
          property_years: kyc?.property_years,
          employment_verified: !!employmentVerification,
          ml_score: mlScoreResult?.ml_score,
          ml_breakdown: mlScoreResult?.ml_score_breakdown,
          risk_flags: mlScoreResult?.risk_flags_detected,
          bonus_factors: mlScoreResult?.bonus_factors_applied
        },
        affiliate_code: affiliateCode
      });

      // Save ML score result
      if (mlScoreResult) {
        await base44.entities.MLScoreResult.create({
          user_id: user.id,
          loan_id: application.id,
          ...mlScoreResult
        });
      }

      // Update or create credit limit
      if (!creditLimit) {
        await base44.entities.UserCreditLimit.create({
          user_id: user.id,
          current_limit: 10000,
          total_loans_taken: 1
        });
      } else {
        await base44.entities.UserCreditLimit.update(creditLimit.id, {
          total_loans_taken: (creditLimit.total_loans_taken || 0) + 1
        });
      }

      // Navigate to direct debit setup
      navigate(createPageUrl(`SetupDirectDebit?loan_id=${application.id}`));

    } catch (err) {
      setError('Failed to submit application. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!canApply()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-gray-900">Apply for Loan</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!kyc?.kyc_status === 'verified' && 'Please complete KYC verification first.'}
              {!isCreditSearchValid() && 'Please complete a credit search first.'}
              {creditLimit?.is_frozen && 'Your account is frozen due to missed payments.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Apply for Loan</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Product Selection */}
        {!selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">Select Loan Product</h2>
            
            {/* Urgent 10k */}
            <Card 
              className={`border-2 cursor-pointer transition hover:border-emerald-300 ${
                selectedProduct === 'urgent_10k' ? 'border-emerald-500' : 'border-gray-200'
              }`}
              onClick={() => selectProduct('urgent_10k')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Urgent ₦10,000</h3>
                    <p className="text-sm text-gray-500 mb-2">Credit limit builder</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">15% interest</Badge>
                      <Badge variant="outline">30 days</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier-1 */}
            <Card 
              className={`border-2 cursor-pointer transition ${
                employmentVerification 
                  ? 'hover:border-emerald-300' 
                  : 'opacity-60 cursor-not-allowed'
              } ${selectedProduct === 'tier1_personal' ? 'border-emerald-500' : 'border-gray-200'}`}
              onClick={() => employmentVerification && selectProduct('tier1_personal')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">Tier-1 Personal</h3>
                      {!employmentVerification && (
                        <Badge variant="secondary">Verify employer first</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">Up to ₦500,000</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">12% interest</Badge>
                      <Badge variant="outline">90 days</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loan Configuration */}
        {selectedProduct && loanDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Button 
              variant="ghost" 
              className="mb-2"
              onClick={() => setSelectedProduct(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Change product
            </Button>

            {/* Score Card */}
            <Card className={`border-0 shadow-md ${
              loanDetails.score >= loanDetails.minScore 
                ? 'border-l-4 border-l-emerald-500' 
                : 'border-l-4 border-l-red-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Your Loan Score</p>
                    <p className="text-2xl font-bold text-gray-900">{loanDetails.score}/100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Minimum Required</p>
                    <p className="text-lg font-semibold text-gray-700">{loanDetails.minScore}/100</p>
                  </div>
                </div>
                {loanDetails.score < loanDetails.minScore && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your score is below the minimum. Improve your credit history to qualify.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Amount Slider */}
            {loanDetails.score >= loanDetails.minScore && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Loan Amount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-emerald-600">
                      ₦{loanAmount.toLocaleString()}
                    </span>
                  </div>
                  
                  <Slider
                    value={[loanAmount]}
                    onValueChange={([v]) => setLoanAmount(v)}
                    min={selectedProduct === 'urgent_10k' ? 5000 : 50000}
                    max={loanDetails.maxAmount}
                    step={selectedProduct === 'urgent_10k' ? 1000 : 10000}
                    className="py-4"
                  />
                  
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>₦{selectedProduct === 'urgent_10k' ? '5,000' : '50,000'}</span>
                    <span>₦{loanDetails.maxAmount.toLocaleString()}</span>
                  </div>

                  {/* Loan Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Percent className="w-4 h-4" />
                        Interest Rate
                      </div>
                      <span className="font-semibold">{loanDetails.interestRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        Tenure
                      </div>
                      <span className="font-semibold">{loanDetails.tenureDays} days</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calculator className="w-4 h-4" />
                        Total Repayment
                      </div>
                      <span className="font-bold text-lg text-emerald-600">
                        ₦{Math.round(calculateRepayment()).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 py-6"
                    onClick={submitApplication}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}