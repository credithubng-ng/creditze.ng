import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Wallet,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoanHistory() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const user = await base44.auth.me();
      const loanData = await base44.entities.LoanApplication.filter(
        { user_id: user.id }, 
        '-created_date'
      );
      setLoans(loanData);
    } catch (error) {
      console.error('Error loading loans:', error);
    } finally {
      setLoading(false);
    }
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

  const filteredLoans = loans.filter(loan => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['approved', 'disbursed', 'overdue'].includes(loan.status);
    if (filter === 'completed') return ['repaid'].includes(loan.status);
    return loan.status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Loan History</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No loans found</h3>
            <p className="text-gray-500 text-sm mb-6">
              {filter === 'all' 
                ? "You haven't applied for any loans yet" 
                : `No ${filter} loans`}
            </p>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate(createPageUrl('ApplyLoan'))}
            >
              Apply for a Loan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLoans.map((loan, i) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={createPageUrl(`LoanDetails?id=${loan.id}`)}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            loan.status === 'repaid' ? 'bg-green-100' :
                            loan.status === 'disbursed' ? 'bg-emerald-100' :
                            loan.status === 'overdue' ? 'bg-orange-100' :
                            'bg-gray-100'
                          }`}>
                            <Wallet className={`w-5 h-5 ${
                              loan.status === 'repaid' ? 'text-green-600' :
                              loan.status === 'disbursed' ? 'text-emerald-600' :
                              loan.status === 'overdue' ? 'text-orange-600' :
                              'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              ₦{(loan.amount_approved || loan.amount_requested).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(loan.created_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadge(loan.status)}>
                            {loan.status}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}