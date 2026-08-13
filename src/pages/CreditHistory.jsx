import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Trophy,
  Calendar,
  DollarSign,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CreditHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [creditLimit, setCreditLimit] = useState(null);
  const [creditLimitHistory, setCreditLimitHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [loanData, limitData] = await Promise.all([
        base44.entities.LoanApplication.filter({ user_id: currentUser.id }, '-created_date'),
        base44.entities.UserCreditLimit.filter({ user_id: currentUser.id })
      ]);

      setLoans(loanData);
      setCreditLimit(limitData[0] || { 
        current_limit: 50000,
        initial_limit: 50000,
        max_limit: 50000,
        successful_repayments: 0,
        total_borrowed: 0,
        total_repaid: 0
      });

      // Build credit limit history from loans
      buildCreditLimitHistory(loanData, limitData[0]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildCreditLimitHistory = (loanData, limitData) => {
    if (!limitData) {
      setCreditLimitHistory([{ date: 'Start', limit: 50000 }]);
      return;
    }

    const history = [{ date: 'Start', limit: 50000 }];
    
    // Get repaid loans and calculate limit increases
    const repaidLoans = loanData.filter(l => l.status === 'repaid').sort((a, b) => 
      new Date(a.repayment_date) - new Date(b.repayment_date)
    );

    let currentLimit = 50000;
    repaidLoans.forEach((loan, index) => {
      if (loan.loan_type === 'urgent_10k') {
        currentLimit = Math.min(Math.floor(currentLimit * 1.2), 50000);
        history.push({
          date: new Date(loan.repayment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          limit: currentLimit
        });
      }
    });

    setCreditLimitHistory(history);
  };

  const calculateStats = () => {
    const totalLoans = loans.length;
    const repaidLoans = loans.filter(l => l.status === 'repaid').length;
    const activeLoans = loans.filter(l => ['approved', 'disbursed'].includes(l.status)).length;
    const overdueLoans = loans.filter(l => l.status === 'overdue').length;
    
    const onTimePayments = loans.filter(l => l.status === 'repaid').length;
    const latePayments = loans.filter(l => l.status === 'overdue' || l.status === 'defaulted').length;
    const onTimeRate = totalLoans > 0 ? Math.round((onTimePayments / totalLoans) * 100) : 0;

    // Calculate current streak
    let currentStreak = 0;
    const sortedLoans = [...loans].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    for (const loan of sortedLoans) {
      if (loan.status === 'repaid') currentStreak++;
      else if (['overdue', 'defaulted'].includes(loan.status)) break;
    }

    // Calculate total fees (interest paid)
    const totalInterest = loans
      .filter(l => l.status === 'repaid')
      .reduce((sum, l) => sum + (l.total_repayment - l.amount_approved), 0);

    return {
      totalLoans,
      repaidLoans,
      activeLoans,
      overdueLoans,
      onTimeRate,
      currentStreak,
      totalInterest,
      totalBorrowed: creditLimit.total_borrowed || 0,
      totalRepaid: creditLimit.total_repaid || 0
    };
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      disbursed: 'bg-emerald-100 text-emerald-700',
      repaid: 'bg-green-100 text-green-700',
      overdue: 'bg-orange-100 text-orange-700',
      defaulted: 'bg-red-100 text-red-700',
      rejected: 'bg-gray-100 text-gray-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Credit History</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      ₦{creditLimit.current_limit.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Credit Limit</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.repaidLoans}</div>
                    <div className="text-xs text-gray-500">Repaid Loans</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.onTimeRate}%</div>
                    <div className="text-xs text-gray-500">On-Time Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.currentStreak}</div>
                    <div className="text-xs text-gray-500">Payment Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Credit Limit Growth Chart */}
        {creditLimitHistory.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Credit Limit Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={creditLimitHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => `₦${value.toLocaleString()}`}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="limit" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Financial Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-600" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Borrowed</span>
                <span className="font-semibold text-gray-900">₦{stats.totalBorrowed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Repaid</span>
                <span className="font-semibold text-green-600">₦{stats.totalRepaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Interest Paid</span>
                <span className="font-semibold text-amber-600">₦{stats.totalInterest.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Active Loans</span>
                <Badge variant={stats.activeLoans > 0 ? "default" : "secondary"}>
                  {stats.activeLoans}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loan History Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                Loan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No loan history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loans.map((loan) => (
                    <Link 
                      key={loan.id} 
                      to={createPageUrl(`LoanDetails?id=${loan.id}`)}
                      className="block"
                    >
                      <div className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          loan.status === 'repaid' ? 'bg-green-100' :
                          loan.status === 'disbursed' ? 'bg-emerald-100' :
                          loan.status === 'overdue' ? 'bg-orange-100' :
                          loan.status === 'rejected' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          {loan.status === 'repaid' ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : loan.status === 'overdue' ? (
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              ₦{loan.amount_approved?.toLocaleString() || loan.amount_requested?.toLocaleString()}
                            </span>
                            <Badge className={getStatusBadge(loan.status)}>
                              {loan.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {loan.loan_type === 'urgent_10k' ? 'Urgent Loan' : 'Tier-1 Loan'} • 
                            {' '}{new Date(loan.created_date).toLocaleDateString()}
                          </div>
                          {loan.status === 'repaid' && loan.repayment_date && (
                            <div className="text-xs text-green-600 mt-1">
                              Repaid on {new Date(loan.repayment_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {loan.total_repayment && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ₦{loan.total_repayment.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
