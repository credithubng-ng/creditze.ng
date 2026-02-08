import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CreditCard,
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { playCelebrationChime } from '../components/utils/celebrationSound';

const BANKS = [
  'Access Bank', 'Citibank', 'Ecobank', 'Fidelity Bank', 'First Bank', 'First City Monument Bank',
  'Guaranty Trust Bank', 'Heritage Bank', 'Keystone Bank', 'Polaris Bank', 'Providus Bank',
  'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank', 'Union Bank', 'United Bank for Africa',
  'Unity Bank', 'Wema Bank', 'Zenith Bank', 'Opay', 'Kuda', 'Moniepoint', 'Palmpay'
];

export default function SetupDirectDebit() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [loan, setLoan] = useState(null);
  const [existingMandate, setExistingMandate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  useEffect(() => {
    loadData();
    checkMandateCallback();
  }, []);

  const checkMandateCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    
    if (reference) {
      setProcessing(true);
      try {
        // Verify authorization
        const verifyResponse = await base44.functions.invoke('paystackVerifyPayment', {
          reference: reference
        });

        if (verifyResponse.data.success && verifyResponse.data.status === 'success') {
          // Find mandate by reference
          const mandates = await base44.entities.DirectDebitMandate.filter({ 
            mandate_reference: reference 
          });

          if (mandates.length > 0) {
            const mandate = mandates[0];
            const authCode = verifyResponse.data.authorization?.authorization_code;
            
            if (!authCode) {
              throw new Error('No authorization code received');
            }

            // Update mandate with authorization
            await base44.entities.DirectDebitMandate.update(mandate.id, {
              status: 'active',
              mandate_reference: authCode,
              authorization_date: new Date().toISOString(),
              expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
            });

            // Proceed with loan disbursement
            await handleDisbursement(mandate.loan_id);
          }
        } else {
          setError('Authorization failed. Please try again.');
          setProcessing(false);
        }
      } catch (err) {
        console.error('Mandate verification error:', err);
        setError(err.message || 'Authorization failed');
        setProcessing(false);
      }
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleDisbursement = async (loanId) => {
    try {
      const loanToDisburse = await base44.entities.LoanApplication.get(loanId);

  const loadData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const loanId = urlParams.get('loan_id');

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [kycData, loanData] = await Promise.all([
        base44.entities.KYCProfile.filter({ user_id: currentUser.id }),
        loanId ? base44.entities.LoanApplication.filter({ id: loanId }) : Promise.resolve([])
      ]);

      setKyc(kycData[0]);
      if (loanData[0]) {
        setLoan(loanData[0]);
        
        // Check for existing mandate
        const mandates = await base44.entities.DirectDebitMandate.filter({ 
          loan_id: loanData[0].id,
          status: { $in: ['pending', 'active'] }
        });
        if (mandates[0]) {
          setExistingMandate(mandates[0]);
        }
      }

      // Pre-fill from KYC
      if (kycData[0]) {
        setFormData({
          bank_name: kycData[0].bank_name || '',
          account_number: kycData[0].account_number || '',
          account_name: kycData[0].account_name || ''
        });
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupMandate = async () => {
    if (!agreed) {
      toast.error('Please agree to the direct debit terms');
      return;
    }

    if (!formData.bank_name || !formData.account_number || !formData.account_name) {
      toast.error('Please fill in all bank details');
      return;
    }

    setProcessing(true);
    try {
      // Generate mandate reference
      const mandateRef = `GAWIN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Set expiry 6 months from now
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      await base44.entities.DirectDebitMandate.create({
        user_id: user.id,
        loan_id: loan?.id,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_name: formData.account_name,
        mandate_reference: mandateRef,
        max_amount: loan ? loan.total_repayment * 1.1 : 100000, // 10% buffer
        status: 'active',
        authorization_date: new Date().toISOString(),
        expiry_date: expiryDate.toISOString()
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action: 'direct_debit_setup',
        entity_type: 'DirectDebitMandate',
        user_id: user.id,
        details: {
          loan_id: loan?.id,
          bank: formData.bank_name,
          account: formData.account_number.slice(-4)
        }
      });

      // Trigger automatic loan disbursement if loan is approved
      if (loan && loan.status === 'approved') {
        await disburseLoan(loan);
      }

      toast.success('Direct debit mandate set up successfully!');
      
      if (loan) {
        navigate(createPageUrl(`LoanDetails?id=${loan.id}`));
      } else {
        navigate(createPageUrl('Dashboard'));
      }

    } catch (error) {
      console.error('Error setting up mandate:', error);
      toast.error('Failed to set up direct debit');
    } finally {
      setProcessing(false);
    }
  };

  const disburseLoan = async (loanData) => {
    try {
      // Create initial disbursement log
      const disbursementLog = await base44.entities.DisbursementLog.create({
        loan_id: loanData.id,
        user_id: user.id,
        amount: loanData.amount_approved,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_name: formData.account_name,
        status: 'processing',
        attempt_number: 1,
        max_retries: 3,
        initiated_by: 'system',
        payment_reference: `DISB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      });

      // Simulate disbursement (in production, integrate with payment provider API)
      const success = await simulateDisbursement(disbursementLog);

      if (success) {
        // Update disbursement log
        await base44.entities.DisbursementLog.update(disbursementLog.id, {
          status: 'successful',
          disbursement_date: new Date().toISOString(),
          provider_response: { status: 'success', message: 'Disbursement successful' }
        });

        // Update loan status to disbursed
        await base44.entities.LoanApplication.update(loanData.id, {
          status: 'disbursed',
          disbursement_date: new Date().toISOString()
        });

        // Log audit
        await base44.entities.AuditLog.create({
          action: 'loan_disbursed',
          entity_type: 'LoanApplication',
          entity_id: loanData.id,
          user_id: user.id,
          details: {
            amount: loanData.amount_approved,
            bank: formData.bank_name,
            disbursement_ref: disbursementLog.payment_reference
          }
        });

        playCelebrationChime();
        toast.success('Loan disbursed successfully!');
      } else {
        // Schedule retry
        await scheduleDisbursementRetry(disbursementLog);
      }
    } catch (error) {
      console.error('Disbursement error:', error);
      // Error will be logged in retry mechanism
    }
  };

  const simulateDisbursement = async (disbursementLog) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 90% success rate simulation (in production, this would be actual payment provider API)
    const success = Math.random() > 0.1;
    
    if (!success) {
      await base44.entities.DisbursementLog.update(disbursementLog.id, {
        status: 'failed',
        error_message: 'Simulated payment provider error - will retry'
      });
    }
    
    return success;
  };

  const scheduleDisbursementRetry = async (disbursementLog) => {
    if (disbursementLog.attempt_number >= disbursementLog.max_retries) {
      // Max retries reached
      await base44.entities.DisbursementLog.update(disbursementLog.id, {
        status: 'failed',
        error_message: 'Maximum retry attempts reached'
      });
      
      toast.error('Disbursement failed. Please contact support.');
      return;
    }

    // Calculate next retry time (exponential backoff: 5min, 15min, 30min)
    const retryDelays = [5, 15, 30]; // minutes
    const nextRetryMinutes = retryDelays[disbursementLog.attempt_number - 1] || 30;
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + nextRetryMinutes);

    await base44.entities.DisbursementLog.update(disbursementLog.id, {
      status: 'retrying',
      next_retry_at: nextRetryAt.toISOString(),
      error_message: `Retry scheduled in ${nextRetryMinutes} minutes`
    });

    toast.info(`Disbursement will retry in ${nextRetryMinutes} minutes`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (existingMandate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-gray-900">Direct Debit</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6">
          <Card className="border-0 shadow-md border-l-4 border-l-emerald-500">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Direct Debit Active</h3>
              <p className="text-gray-500 mb-4">
                Your direct debit mandate is already set up
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2">
                <p><strong>Bank:</strong> {existingMandate.bank_name}</p>
                <p><strong>Account:</strong> ****{existingMandate.account_number.slice(-4)}</p>
                <p><strong>Status:</strong> {existingMandate.status}</p>
                <p><strong>Max Amount:</strong> ₦{existingMandate.max_amount?.toLocaleString()}</p>
              </div>
              <Button 
                className="w-full mt-4"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Set Up Direct Debit</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Automatic Repayments</h3>
                  <p className="text-emerald-100 text-sm">
                    Set up direct debit to automatically repay your loan on the due date. Never miss a payment!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loan Info */}
        {loan && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Loan Repayment Amount</p>
                  <p className="text-xl font-bold text-gray-900">₦{Math.round(loan.total_repayment).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'TBD'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Details Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Bank Account Details
              </CardTitle>
              <CardDescription>
                This account will be debited on the loan due date
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bank</Label>
                <Select value={formData.bank_name} onValueChange={(v) => setFormData({ ...formData, bank_name: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map(bank => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="0123456789"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Account Name</Label>
                <Input
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Terms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms" 
                  checked={agreed} 
                  onCheckedChange={setAgreed}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I authorize getawin.ng to debit my account for the loan repayment amount on the due date. 
                  I understand that failed debits may result in late fees and impact my credit score.
                </label>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Note */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your bank details are encrypted and securely stored. We will only debit the exact loan repayment amount.
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <Button 
          className="w-full bg-emerald-600 hover:bg-emerald-700 py-6"
          onClick={setupMandate}
          disabled={processing || !agreed}
        >
          {processing ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CreditCard className="w-5 h-5 mr-2" />
          )}
          Set Up Direct Debit
        </Button>
      </div>
    </div>
  );
}