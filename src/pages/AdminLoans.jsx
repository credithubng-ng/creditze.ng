import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminLoans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, action: null, loan: null });
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
      const [loanData, userData] = await Promise.all([
        base44.entities.LoanApplication.list('-created_date'),
        base44.entities.User.list()
      ]);

      setLoans(loanData);

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

  const handleAction = async (action, loan) => {
    setProcessing(true);
    try {
      const updates = {};
      const now = new Date().toISOString();

      switch (action) {
        case 'disburse':
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + loan.tenure_days);
          updates.status = 'disbursed';
          updates.disbursement_date = now;
          updates.due_date = dueDate.toISOString();
          break;
        case 'mark_repaid':
          updates.status = 'repaid';
          updates.repayment_date = now;
          // Update user credit limit
          const limits = await base44.entities.UserCreditLimit.filter({ user_id: loan.user_id });
          if (limits[0]) {
            const newLimit = Math.round(limits[0].current_limit * 1.2);
            await base44.entities.UserCreditLimit.update(limits[0].id, {
              current_limit: newLimit,
              successful_repayments: (limits[0].successful_repayments || 0) + 1
            });
          }
          break;
        case 'mark_overdue':
          updates.status = 'overdue';
          break;
        case 'mark_defaulted':
          updates.status = 'defaulted';
          // Freeze user account
          const userLimits = await base44.entities.UserCreditLimit.filter({ user_id: loan.user_id });
          if (userLimits[0]) {
            await base44.entities.UserCreditLimit.update(userLimits[0].id, {
              is_frozen: true,
              freeze_reason: 'Loan default',
              freeze_date: now,
              defaults: (userLimits[0].defaults || 0) + 1
            });
          }
          break;
      }

      await base44.entities.LoanApplication.update(loan.id, updates);
      await loadData();
      setActionDialog({ open: false, action: null, loan: null });

    } catch (error) {
      console.error('Error processing action:', error);
    } finally {
      setProcessing(false);
    }
  };

  const filteredLoans = statusFilter === 'all' 
    ? loans 
    : loans.filter(l => l.status === statusFilter);

  const stats = {
    total: loans.length,
    pending: loans.filter(l => l.status === 'pending').length,
    active: loans.filter(l => ['disbursed', 'overdue'].includes(l.status)).length,
    overdue: loans.filter(l => l.status === 'overdue').length,
    totalDisbursed: loans
      .filter(l => ['disbursed', 'repaid'].includes(l.status))
      .reduce((sum, l) => sum + (l.amount_approved || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('AdminDashboard')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Loan Management</h1>
            <p className="text-gray-500 text-sm">{loans.length} total loans</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Disbursed</p>
              <p className="text-2xl font-bold text-gray-900">₦{(stats.totalDisbursed / 1000000).toFixed(1)}M</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="repaid">Repaid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map(loan => {
                    const user = users[loan.user_id];
                    return (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{user?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {loan.loan_type === 'urgent_10k' ? 'Urgent' : 'Tier-1'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">₦{(loan.amount_approved || loan.amount_requested).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Repay: ₦{Math.round(loan.total_repayment || 0).toLocaleString()}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${loan.score >= 75 ? 'text-emerald-600' : loan.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {loan.score}/100
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {loan.due_date ? format(new Date(loan.due_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(loan.status)}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedLoan(loan)}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              {loan.status === 'approved' && (
                                <DropdownMenuItem onClick={() => setActionDialog({ open: true, action: 'disburse', loan })}>
                                  <Wallet className="w-4 h-4 mr-2" /> Mark Disbursed
                                </DropdownMenuItem>
                              )}
                              {loan.status === 'disbursed' && (
                                <>
                                  <DropdownMenuItem onClick={() => setActionDialog({ open: true, action: 'mark_repaid', loan })}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Repaid
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setActionDialog({ open: true, action: 'mark_overdue', loan })}>
                                    <AlertTriangle className="w-4 h-4 mr-2" /> Mark Overdue
                                  </DropdownMenuItem>
                                </>
                              )}
                              {loan.status === 'overdue' && (
                                <>
                                  <DropdownMenuItem onClick={() => setActionDialog({ open: true, action: 'mark_repaid', loan })}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Repaid
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setActionDialog({ open: true, action: 'mark_defaulted', loan })} className="text-red-600">
                                    <XCircle className="w-4 h-4 mr-2" /> Mark Defaulted
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'disburse' && 'Disburse Loan'}
              {actionDialog.action === 'mark_repaid' && 'Mark as Repaid'}
              {actionDialog.action === 'mark_overdue' && 'Mark as Overdue'}
              {actionDialog.action === 'mark_defaulted' && 'Mark as Defaulted'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'disburse' && 'This will mark the loan as disbursed and set the due date.'}
              {actionDialog.action === 'mark_repaid' && 'This will mark the loan as repaid and increase the user\'s credit limit by 20%.'}
              {actionDialog.action === 'mark_overdue' && 'This will mark the loan as overdue.'}
              {actionDialog.action === 'mark_defaulted' && 'This will mark the loan as defaulted and freeze the user\'s account.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: null, loan: null })}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleAction(actionDialog.action, actionDialog.loan)}
              disabled={processing}
              className={actionDialog.action === 'mark_defaulted' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}