import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { playCelebrationChime } from '../components/utils/celebrationSound';

export default function AdminDisbursements() {
  const navigate = useNavigate();
  const [disbursements, setDisbursements] = useState([]);
  const [loans, setLoans] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [retryDialog, setRetryDialog] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      await loadData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadData = async () => {
    try {
      const [disbursementData, loanData, userData] = await Promise.all([
        base44.entities.DisbursementLog.list('-created_date', 100),
        base44.entities.LoanApplication.list(),
        base44.entities.User.list()
      ]);

      setDisbursements(disbursementData);

      const loanMap = {};
      loanData.forEach(l => { loanMap[l.id] = l; });
      setLoans(loanMap);

      const userMap = {};
      userData.forEach(u => { userMap[u.id] = u; });
      setUsers(userMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-700',
      processing: 'bg-blue-100 text-blue-700',
      successful: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      retrying: 'bg-yellow-100 text-yellow-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const retryDisbursement = async (disbursement) => {
    if (disbursement.attempt_number >= disbursement.max_retries) {
      toast.error('Maximum retry attempts reached');
      return;
    }

    setProcessing(true);
    try {
      const user = await base44.auth.me();

      // Update attempt number
      await base44.entities.DisbursementLog.update(disbursement.id, {
        status: 'processing',
        attempt_number: disbursement.attempt_number + 1,
        admin_id: user.id,
        initiated_by: 'admin'
      });

      // Simulate retry (in production, call payment provider)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.2; // 80% success on manual retry

      if (success) {
        await base44.entities.DisbursementLog.update(disbursement.id, {
          status: 'successful',
          disbursement_date: new Date().toISOString(),
          provider_response: { status: 'success', message: 'Manual retry successful' }
        });

        await base44.entities.LoanApplication.update(disbursement.loan_id, {
          status: 'disbursed',
          disbursement_date: new Date().toISOString()
        });

        playCelebrationChime();
        toast.success('Disbursement successful!');
      } else {
        await base44.entities.DisbursementLog.update(disbursement.id, {
          status: 'failed',
          error_message: 'Manual retry failed - payment provider error'
        });
        toast.error('Disbursement failed. Please try again.');
      }

      await loadData();
    } catch (error) {
      console.error('Retry error:', error);
      toast.error('Failed to retry disbursement');
    } finally {
      setProcessing(false);
      setRetryDialog(null);
    }
  };

  const filteredDisbursements = disbursements.filter(disb => {
    const matchesStatus = statusFilter === 'all' || disb.status === statusFilter;
    const matchesSearch = !searchQuery || 
      disb.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      disb.account_number?.includes(searchQuery) ||
      users[disb.user_id]?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: disbursements.length,
    successful: disbursements.filter(d => d.status === 'successful').length,
    failed: disbursements.filter(d => d.status === 'failed').length,
    pending: disbursements.filter(d => d.status === 'pending' || d.status === 'processing' || d.status === 'retrying').length,
    totalAmount: disbursements
      .filter(d => d.status === 'successful')
      .reduce((sum, d) => sum + (d.amount || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Loan Disbursements</h1>
              <p className="text-gray-500 text-sm">Monitor and manage disbursements</p>
            </div>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
                  <p className="text-sm text-gray-500">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  <p className="text-sm text-gray-500">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-sm text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Disbursed */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Disbursed</p>
                <p className="text-3xl font-bold text-emerald-700">₦{stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-12 h-12 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by reference, account, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="retrying">Retrying</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disbursements Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredDisbursements.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No disbursements found</h3>
                <p className="text-gray-500">Disbursements will appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisbursements.map(disb => {
                    const user = users[disb.user_id];
                    const loan = loans[disb.loan_id];
                    
                    return (
                      <TableRow key={disb.id}>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {disb.payment_reference}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user?.full_name}</p>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">₦{disb.amount?.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{disb.bank_name}</p>
                            <p className="text-gray-500">{disb.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(disb.status)}>
                            {disb.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {disb.attempt_number}/{disb.max_retries}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {disb.disbursement_date ? 
                            format(new Date(disb.disbursement_date), 'MMM d, HH:mm') :
                            format(new Date(disb.created_date), 'MMM d, HH:mm')
                          }
                        </TableCell>
                        <TableCell>
                          {(disb.status === 'failed' || disb.status === 'retrying') && 
                           disb.attempt_number < disb.max_retries && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setRetryDialog(disb)}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retry Dialog */}
      <Dialog open={!!retryDialog} onOpenChange={() => setRetryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry Disbursement</DialogTitle>
            <DialogDescription>
              Manually retry disbursement for this loan. This will attempt to process the payment again.
            </DialogDescription>
          </DialogHeader>
          {retryDialog && (
            <div className="space-y-2 text-sm">
              <p><strong>Amount:</strong> ₦{retryDialog.amount?.toLocaleString()}</p>
              <p><strong>Bank:</strong> {retryDialog.bank_name}</p>
              <p><strong>Account:</strong> {retryDialog.account_number}</p>
              <p><strong>Attempt:</strong> {retryDialog.attempt_number + 1}/{retryDialog.max_retries}</p>
              {retryDialog.error_message && (
                <p className="text-red-600"><strong>Error:</strong> {retryDialog.error_message}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetryDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => retryDisbursement(retryDialog)}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Retry Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}