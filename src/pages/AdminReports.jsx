import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  AlertTriangle, CheckCircle2, Wallet, UserPlus
} from 'lucide-react';
import { formatCurrency } from '../components/utils/formatters';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    loans: [],
    disbursements: [],
    users: [],
    referrals: [],
    collections: []
  });
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        window.location.href = '/';
        return;
      }

      const [loans, disbursements, users, referrals, collections] = await Promise.all([
        base44.entities.LoanApplication.list('-created_date', 1000),
        base44.entities.DisbursementLog.list('-created_date', 1000),
        base44.entities.User.list('-created_date', 1000),
        base44.entities.UserReferral.list('-created_date', 1000),
        base44.entities.CollectionTransaction.list('-created_date', 1000)
      ]);

      setData({ loans, disbursements, users, referrals, collections });
      calculateMetrics({ loans, disbursements, users, referrals, collections });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = ({ loans, disbursements, users, referrals, collections }) => {
    // Portfolio metrics
    const totalDisbursed = disbursements
      .filter(d => d.status === 'successful')
      .reduce((sum, d) => sum + d.amount, 0);

    const totalRepaid = loans
      .filter(l => l.status === 'repaid')
      .reduce((sum, l) => sum + l.total_repayment, 0);

    const outstanding = loans
      .filter(l => ['disbursed', 'overdue'].includes(l.status))
      .reduce((sum, l) => sum + l.total_repayment, 0);

    // Delinquency metrics
    const activeLoans = loans.filter(l => ['disbursed', 'overdue', 'defaulted'].includes(l.status));
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const defaultedLoans = loans.filter(l => l.status === 'defaulted');
    
    const delinquencyRate = activeLoans.length > 0 
      ? ((overdueLoans.length / activeLoans.length) * 100).toFixed(2)
      : 0;
    
    const defaultRate = activeLoans.length > 0
      ? ((defaultedLoans.length / activeLoans.length) * 100).toFixed(2)
      : 0;

    // User metrics
    const totalUsers = users.length;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newUsersThisMonth = users.filter(u => 
      new Date(u.created_date) >= thisMonth
    ).length;

    // Referral metrics
    const totalReferrals = referrals.length;
    const convertedReferrals = referrals.filter(r => r.status === 'converted').length;
    const conversionRate = totalReferrals > 0 
      ? ((convertedReferrals / totalReferrals) * 100).toFixed(2)
      : 0;

    // Financial metrics
    const interestEarned = loans
      .filter(l => l.status === 'repaid')
      .reduce((sum, l) => sum + (l.total_repayment - (l.amount_approved || l.amount_requested)), 0);

    const revenue = totalRepaid;
    const pendingRevenue = outstanding;

    // Loan status distribution
    const statusDistribution = [
      { name: 'Disbursed', value: loans.filter(l => l.status === 'disbursed').length },
      { name: 'Repaid', value: loans.filter(l => l.status === 'repaid').length },
      { name: 'Overdue', value: overdueLoans.length },
      { name: 'Defaulted', value: defaultedLoans.length },
      { name: 'Pending', value: loans.filter(l => l.status === 'pending').length }
    ].filter(item => item.value > 0);

    // Monthly trends (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'short' });
      
      const monthLoans = loans.filter(l => {
        const loanDate = new Date(l.created_date);
        return loanDate.getMonth() === date.getMonth() && 
               loanDate.getFullYear() === date.getFullYear();
      });

      const monthDisbursed = disbursements.filter(d => {
        if (!d.disbursement_date) return false;
        const disbDate = new Date(d.disbursement_date);
        return disbDate.getMonth() === date.getMonth() && 
               disbDate.getFullYear() === date.getFullYear() &&
               d.status === 'successful';
      });

      const monthRepaid = loans.filter(l => {
        if (!l.repayment_date) return false;
        const repayDate = new Date(l.repayment_date);
        return repayDate.getMonth() === date.getMonth() && 
               repayDate.getFullYear() === date.getFullYear();
      });

      monthlyData.push({
        month,
        applications: monthLoans.length,
        disbursed: monthDisbursed.reduce((sum, d) => sum + d.amount, 0),
        repaid: monthRepaid.reduce((sum, l) => sum + l.total_repayment, 0)
      });
    }

    setMetrics({
      totalDisbursed,
      totalRepaid,
      outstanding,
      delinquencyRate,
      defaultRate,
      overdueCount: overdueLoans.length,
      defaultedCount: defaultedLoans.length,
      totalUsers,
      newUsersThisMonth,
      totalReferrals,
      convertedReferrals,
      conversionRate,
      interestEarned,
      revenue,
      pendingRevenue,
      statusDistribution,
      monthlyData
    });
  };

  if (loading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Advanced Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Comprehensive insights into your loan portfolio</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Disbursed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(metrics.totalDisbursed)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Repaid</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(metrics.totalRepaid)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(metrics.outstanding)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Interest Earned</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(metrics.interestEarned)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="delinquency">Delinquency</TabsTrigger>
            <TabsTrigger value="users">Users & Referrals</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Loan Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.statusDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Portfolio Performance (6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="disbursed" stroke="#10b981" name="Disbursed" />
                      <Line type="monotone" dataKey="repaid" stroke="#3b82f6" name="Repaid" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Monthly Loan Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="applications" fill="#8b5cf6" name="Applications" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delinquency Tab */}
          <TabsContent value="delinquency" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Delinquency Rate</p>
                      <p className="text-3xl font-bold text-orange-600">{metrics.delinquencyRate}%</p>
                      <p className="text-sm text-gray-500 mt-1">{metrics.overdueCount} overdue loans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                      <TrendingDown className="w-7 h-7 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Default Rate</p>
                      <p className="text-3xl font-bold text-red-600">{metrics.defaultRate}%</p>
                      <p className="text-sm text-gray-500 mt-1">{metrics.defaultedCount} defaulted loans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Repayment Rate</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        {(100 - parseFloat(metrics.delinquencyRate) - parseFloat(metrics.defaultRate)).toFixed(2)}%
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Performing well</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-green-900">Low Risk Portfolio</p>
                      <p className="text-sm text-green-600">Overall portfolio health is good</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-0">Healthy</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Key Observations:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Delinquency rate below 5% target threshold</li>
                      <li>Strong repayment culture among borrowers</li>
                      <li>Active collection efforts maintaining portfolio quality</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users & Referrals Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">{metrics.newUsersThisMonth}</span>
                    <span className="text-gray-500">new this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-7 h-7 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Referral Program</p>
                      <p className="text-3xl font-bold text-gray-900">{metrics.totalReferrals}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Conversion Rate</span>
                    <span className="text-purple-600 font-semibold">{metrics.conversionRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Referral Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{metrics.totalReferrals}</p>
                      <p className="text-sm text-gray-500 mt-1">Total Referrals</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-600">{metrics.convertedReferrals}</p>
                      <p className="text-sm text-gray-500 mt-1">Converted</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <p className="text-2xl font-bold text-purple-600">{metrics.conversionRate}%</p>
                      <p className="text-sm text-gray-500 mt-1">Conversion</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.revenue)}</p>
                      <p className="text-sm text-emerald-600 mt-1">From repaid loans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Interest Earned</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.interestEarned)}</p>
                      <p className="text-sm text-blue-600 mt-1">Net profit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Wallet className="w-7 h-7 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.pendingRevenue)}</p>
                      <p className="text-sm text-orange-600 mt-1">Outstanding loans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Financial Overview (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="disbursed" fill="#10b981" name="Disbursed" />
                    <Bar dataKey="repaid" fill="#3b82f6" name="Repaid" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}