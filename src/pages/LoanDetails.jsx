import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Wallet,
  Calendar,
  Percent,
  Calculator,
  Copy,
  MessageSquare,
  Building2,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function LoanDetails() {
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoan();
  }, []);

  const loadLoan = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const loanId = urlParams.get('id');

    if (!loanId) {
      navigate(createPageUrl('Dashboard'));
      return;
    }

    try {
      const loans = await base44.entities.LoanApplication.filter({ id: loanId });
      if (loans[0]) {
        setLoan(loans[0]);
        
        // Load virtual account if loan is disbursed
        if (loans[0].status === 'disbursed' || loans[0].status === 'overdue') {
          const virtualAccounts = await base44.entities.VirtualAccount.filter({ 
            loan_id: loanId,
            status: 'active'
          });
          if (virtualAccounts[0]) {
            setVirtualAccount(virtualAccounts[0]);
          }
        }
      } else {
        navigate(createPageUrl('Dashboard'));
      }
    } catch (error) {
      console.error('Error loading loan:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending' },
      approved: { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Approved' },
      disbursed: { icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Disbursed' },
      repaid: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Repaid' },
      overdue: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Overdue' },
      defaulted: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Defaulted' },
      rejected: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Rejected' }
    };
    return configs[status] || configs.pending;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(loan.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Loan Details</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border-0 shadow-md border-l-4 ${
            loan.status === 'repaid' ? 'border-l-green-500' :
            loan.status === 'disbursed' ? 'border-l-emerald-500' :
            loan.status === 'overdue' || loan.status === 'defaulted' ? 'border-l-red-500' :
            'border-l-blue-500'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${statusConfig.bg} rounded-xl flex items-center justify-center`}>
                    <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                  </div>
                  <div>
                    <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                      {statusConfig.label}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      {loan.loan_type === 'urgent_10k' ? 'Urgent Loan' : 'Tier-1 Loan'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ₦{(loan.amount_approved || loan.amount_requested).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress for active loans */}
              {(loan.status === 'disbursed' || loan.status === 'overdue') && loan.due_date && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Due Date</span>
                    <span className={`font-medium ${loan.status === 'overdue' ? 'text-red-600' : ''}`}>
                      {format(new Date(loan.due_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Loan Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Loan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Wallet className="w-4 h-4" />
                    Principal
                  </div>
                  <p className="font-semibold text-gray-900">
                    ₦{(loan.amount_approved || loan.amount_requested).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Percent className="w-4 h-4" />
                    Interest Rate
                  </div>
                  <p className="font-semibold text-gray-900">{loan.interest_rate}%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Tenure
                  </div>
                  <p className="font-semibold text-gray-900">{loan.tenure_days} days</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Calculator className="w-4 h-4" />
                    Total Due
                  </div>
                  <p className="font-semibold text-emerald-600">
                    ₦{Math.round(loan.total_repayment).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Score breakdown */}
              {loan.score && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Your Score: {loan.score}/100</p>
                  <Progress value={loan.score} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Application Submitted</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(loan.created_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                {loan.status !== 'pending' && loan.status !== 'rejected' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Approved</p>
                      <p className="text-sm text-gray-500">Automated approval</p>
                    </div>
                  </div>
                )}

                {loan.disbursement_date && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Disbursed</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(loan.disbursement_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {loan.due_date && !loan.repayment_date && (
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 ${loan.status === 'overdue' ? 'bg-red-100' : 'bg-gray-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Clock className={`w-4 h-4 ${loan.status === 'overdue' ? 'text-red-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${loan.status === 'overdue' ? 'text-red-600' : 'text-gray-500'}`}>
                        Due Date
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(loan.due_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {loan.repayment_date && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-600">Repaid</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(loan.repayment_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {loan.status === 'rejected' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-red-600">Rejected</p>
                      <p className="text-sm text-gray-500">{loan.rejection_reason || 'Did not meet criteria'}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Virtual Account for Repayment */}
        {virtualAccount && (loan.status === 'disbursed' || loan.status === 'overdue') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Repayment Account
                </CardTitle>
                <p className="text-sm text-gray-500">Transfer to this account to repay your loan</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-emerald-50 p-4 rounded-xl space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Bank Name</p>
                    <p className="font-semibold text-gray-900">{virtualAccount.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Account Number</p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-emerald-600 tracking-wider">
                        {virtualAccount.account_number}
                      </p>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(virtualAccount.account_number)}
                        className="hover:bg-emerald-100"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Account Name</p>
                    <p className="font-medium text-gray-900">{virtualAccount.account_name}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Amount to Pay</span>
                    <span className="text-xl font-bold text-gray-900">
                      ₦{Math.round(loan.total_repayment).toLocaleString()}
                    </span>
                  </div>
                  {virtualAccount.total_received > 0 && (
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-600">Amount Received</span>
                      <span className="font-semibold text-emerald-600">
                        ₦{Math.round(virtualAccount.total_received).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <CreditCard className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Transfer exactly ₦{Math.round(loan.total_repayment).toLocaleString()} to this account. Payment is automatically confirmed within minutes.</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loan Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-md bg-gray-900 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Loan Reference</p>
                  <p className="font-mono font-semibold">{loan.id.slice(0, 12).toUpperCase()}</p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-white hover:bg-gray-800"
                  onClick={() => copyToClipboard(loan.id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Raise Dispute for Rejected Loans */}
        {loan.status === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-md border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-amber-600" />
                      Not satisfied with the decision?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">You can raise a dispute to review your application</p>
                  </div>
                  <Link to={createPageUrl(`RaiseDispute?loan_id=${loan.id}&type=loan_rejection`)}>
                    <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                      Raise Dispute
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}