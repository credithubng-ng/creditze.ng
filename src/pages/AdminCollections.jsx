import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { 
  ArrowLeft, 
  AlertTriangle,
  Clock,
  Send,
  Phone,
  Mail,
  FileText,
  MoreVertical,
  Eye,
  RefreshCw,
  Loader2,
  TrendingDown,
  Wallet,
  Ban,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuSeparator,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminCollections() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState({});
  const [kycProfiles, setKycProfiles] = useState({});
  const [collectionAttempts, setCollectionAttempts] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState({ open: false, loan: null, action: null });
  const [customMessage, setCustomMessage] = useState('');
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
      const [loanData, userData, kycData, attemptData] = await Promise.all([
        base44.entities.LoanApplication.filter({ status: { $in: ['disbursed', 'overdue'] } }, '-created_date'),
        base44.entities.User.list(),
        base44.entities.KYCProfile.list(),
        base44.entities.CollectionAttempt.list('-created_date', 500)
      ]);

      // Filter to only show loans that need attention
      const relevantLoans = loanData.filter(loan => {
        if (!loan.due_date) return false;
        const dueDate = new Date(loan.due_date);
        const today = new Date();
        const daysUntilDue = differenceInDays(dueDate, today);
        return daysUntilDue <= 7 || loan.status === 'overdue';
      });

      setLoans(relevantLoans);

      const userMap = {};
      userData.forEach(u => { userMap[u.id] = u; });
      setUsers(userMap);

      const kycMap = {};
      kycData.forEach(k => { kycMap[k.user_id] = k; });
      setKycProfiles(kycMap);

      const attemptMap = {};
      attemptData.forEach(a => {
        if (!attemptMap[a.loan_id]) attemptMap[a.loan_id] = [];
        attemptMap[a.loan_id].push(a);
      });
      setCollectionAttempts(attemptMap);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (loan) => {
    if (!loan.due_date) return 0;
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    return Math.max(0, differenceInDays(today, dueDate));
  };

  const getDaysUntilDue = (loan) => {
    if (!loan.due_date) return 999;
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    return differenceInDays(dueDate, today);
  };

  const getRiskLevel = (loan) => {
    const daysOverdue = getDaysOverdue(loan);
    if (daysOverdue >= 60) return { level: 'critical', color: 'bg-red-100 text-red-700', label: 'Critical' };
    if (daysOverdue >= 30) return { level: 'high', color: 'bg-orange-100 text-orange-700', label: 'High Risk' };
    if (daysOverdue >= 7) return { level: 'medium', color: 'bg-yellow-100 text-yellow-700', label: 'Medium Risk' };
    if (daysOverdue > 0) return { level: 'low', color: 'bg-amber-100 text-amber-700', label: 'Low Risk' };
    return { level: 'none', color: 'bg-green-100 text-green-700', label: 'On Track' };
  };

  const sendCollectionAction = async (loan, actionType, channel, message) => {
    setProcessing(true);
    try {
      const user = users[loan.user_id];
      const kyc = kycProfiles[loan.user_id];
      const daysOverdue = getDaysOverdue(loan);
      const admin = await base44.auth.me();

      // Create collection attempt record
      await base44.entities.CollectionAttempt.create({
        loan_id: loan.id,
        user_id: loan.user_id,
        attempt_type: actionType,
        status: 'sent',
        channel,
        message_content: message,
        initiated_by: 'admin',
        admin_id: admin.id,
        days_overdue: daysOverdue,
        amount_outstanding: loan.total_repayment
      });

      // Send actual communication
      if (channel === 'email' && user?.email) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: getEmailSubject(actionType, loan),
          body: message || generateMessage(actionType, loan, user)
        });
      }

      // Log audit
      await base44.entities.AuditLog.create({
        action: `collection_${actionType}`,
        entity_type: 'LoanApplication',
        entity_id: loan.id,
        admin_id: admin.id,
        details: { action_type: actionType, channel, days_overdue: daysOverdue }
      });

      toast.success(`${actionType.replace(/_/g, ' ')} sent successfully`);
      await loadData();
      setActionDialog({ open: false, loan: null, action: null });
      setCustomMessage('');

    } catch (error) {
      console.error('Error sending collection action:', error);
      toast.error('Failed to send collection action');
    } finally {
      setProcessing(false);
    }
  };

  const getEmailSubject = (actionType, loan) => {
    const subjects = {
      reminder_email: 'Payment Reminder - Your loan is due soon',
      overdue_email: 'URGENT: Your loan payment is overdue',
      demand_letter: 'DEMAND NOTICE: Immediate Payment Required',
      final_notice: 'FINAL NOTICE: Action Required Within 7 Days'
    };
    return subjects[actionType] || 'Important Notice from getawin.ng';
  };

  const generateMessage = (actionType, loan, user) => {
    const daysOverdue = getDaysOverdue(loan);
    const amount = Math.round(loan.total_repayment).toLocaleString();

    const templates = {
      reminder_email: `Dear ${user.full_name},

This is a friendly reminder that your loan payment of ₦${amount} is due on ${format(new Date(loan.due_date), 'MMMM d, yyyy')}.

Please ensure you have sufficient funds in your account for the direct debit or make payment before the due date to avoid late fees.

Thank you for choosing getawin.ng.`,

      overdue_email: `Dear ${user.full_name},

Your loan payment of ₦${amount} is now ${daysOverdue} day(s) overdue.

Please make payment immediately to avoid:
- Additional late fees
- Negative impact on your credit score
- Freezing of your account

Contact us if you're experiencing difficulties.

getawin.ng Team`,

      demand_letter: `DEMAND FOR PAYMENT

Dear ${user.full_name},

LOAN REFERENCE: ${loan.id.slice(0, 12).toUpperCase()}
AMOUNT OUTSTANDING: ₦${amount}
DAYS OVERDUE: ${daysOverdue}

Despite previous reminders, your loan payment remains outstanding. We hereby demand immediate payment of the full amount.

Failure to pay within 14 days may result in:
1. Legal action
2. Reporting to credit bureaus
3. Account default status

Make payment immediately to avoid these consequences.

getawin.ng Collections Department`,

      final_notice: `FINAL NOTICE BEFORE DEFAULT

Dear ${user.full_name},

This is your FINAL NOTICE regarding your outstanding loan.

AMOUNT DUE: ₦${amount}
DAYS OVERDUE: ${daysOverdue}

Your account will be marked as DEFAULTED in 7 days if payment is not received. This will:
- Permanently damage your credit score
- Result in potential legal action
- Prevent future borrowing from getawin.ng

This is your last opportunity to resolve this matter.

getawin.ng Collections Department`
    };

    return templates[actionType] || '';
  };

  const filteredLoans = loans.filter(loan => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return loan.status === 'overdue';
    if (statusFilter === 'due_soon') return getDaysUntilDue(loan) <= 3 && getDaysUntilDue(loan) >= 0;
    if (statusFilter === 'critical') return getDaysOverdue(loan) >= 30;
    return true;
  }).sort((a, b) => getDaysOverdue(b) - getDaysOverdue(a));

  const stats = {
    totalOverdue: loans.filter(l => l.status === 'overdue').length,
    dueSoon: loans.filter(l => getDaysUntilDue(l) <= 3 && getDaysUntilDue(l) >= 0).length,
    critical: loans.filter(l => getDaysOverdue(l) >= 30).length,
    totalOutstanding: loans.reduce((sum, l) => sum + (l.total_repayment || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Collections Dashboard</h1>
              <p className="text-gray-500 text-sm">Manage overdue loans and collection actions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('AdminCollectionConfig')}>
              <Button variant="outline">Configure Rules</Button>
            </Link>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.totalOverdue}</p>
                  <p className="text-sm text-gray-500">Overdue Loans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.dueSoon}</p>
                  <p className="text-sm text-gray-500">Due in 3 Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Ban className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{stats.critical}</p>
                  <p className="text-sm text-gray-500">Critical (30+ days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">₦{(stats.totalOutstanding / 1000000).toFixed(1)}M</p>
                  <p className="text-sm text-gray-500">Outstanding</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter loans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Loans</SelectItem>
                  <SelectItem value="due_soon">Due Soon (3 days)</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="critical">Critical (30+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loans Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="p-12 text-center">
                <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No loans need attention</h3>
                <p className="text-gray-500">All loans are on track!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Last Action</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map(loan => {
                    const user = users[loan.user_id];
                    const kyc = kycProfiles[loan.user_id];
                    const risk = getRiskLevel(loan);
                    const daysOverdue = getDaysOverdue(loan);
                    const attempts = collectionAttempts[loan.id] || [];
                    const lastAttempt = attempts[0];

                    return (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{user?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{kyc?.phone_number ? `+234${kyc.phone_number}` : user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-gray-900">₦{Math.round(loan.total_repayment).toLocaleString()}</p>
                        </TableCell>
                        <TableCell>
                          {loan.due_date ? format(new Date(loan.due_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {daysOverdue > 0 ? (
                            <span className="font-semibold text-red-600">{daysOverdue} days</span>
                          ) : (
                            <span className="text-green-600">Due in {Math.abs(getDaysUntilDue(loan))} days</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={risk.color}>{risk.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {lastAttempt ? (
                            <div className="text-sm">
                              <p className="text-gray-900">{lastAttempt.attempt_type.replace(/_/g, ' ')}</p>
                              <p className="text-gray-500">{format(new Date(lastAttempt.created_date), 'MMM d')}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">No actions yet</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(createPageUrl(`AdminLoanCollection?id=${loan.id}`))}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, loan, action: 'reminder_email' })}>
                                <Mail className="w-4 h-4 mr-2" /> Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, loan, action: 'overdue_email' })}>
                                <AlertTriangle className="w-4 h-4 mr-2" /> Send Overdue Notice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, loan, action: 'demand_letter' })}>
                                <FileText className="w-4 h-4 mr-2" /> Send Demand Letter
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, loan, action: 'final_notice' })}>
                                <Ban className="w-4 h-4 mr-2" /> Send Final Notice
                              </DropdownMenuItem>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'reminder_email' && 'Send Payment Reminder'}
              {actionDialog.action === 'overdue_email' && 'Send Overdue Notice'}
              {actionDialog.action === 'demand_letter' && 'Send Demand Letter'}
              {actionDialog.action === 'final_notice' && 'Send Final Notice'}
            </DialogTitle>
            <DialogDescription>
              This will send an email to {users[actionDialog.loan?.user_id]?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Borrower:</strong> {users[actionDialog.loan?.user_id]?.full_name}</p>
              <p><strong>Amount Due:</strong> ₦{Math.round(actionDialog.loan?.total_repayment || 0).toLocaleString()}</p>
              <p><strong>Days Overdue:</strong> {getDaysOverdue(actionDialog.loan || {})}</p>
            </div>
            
            <div>
              <Label>Custom Message (optional)</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Leave blank to use default template..."
                className="mt-1 h-32"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, loan: null, action: null })}>
              Cancel
            </Button>
            <Button 
              onClick={() => sendCollectionAction(actionDialog.loan, actionDialog.action, 'email', customMessage)}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}