import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { 
  ArrowLeft, 
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  User,
  Building2,
  CreditCard,
  Loader2,
  Send,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function AdminLoanCollection() {
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [user, setUser] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [directDebit, setDirectDebit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newAction, setNewAction] = useState({ type: '', message: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const loanId = urlParams.get('id');

    if (!loanId) {
      navigate(createPageUrl('AdminCollections'));
      return;
    }

    try {
      const admin = await base44.auth.me();
      if (admin.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }

      const [loanData, attemptData, mandateData] = await Promise.all([
        base44.entities.LoanApplication.filter({ id: loanId }),
        base44.entities.CollectionAttempt.filter({ loan_id: loanId }, '-created_date'),
        base44.entities.DirectDebitMandate.filter({ loan_id: loanId })
      ]);

      if (!loanData[0]) {
        navigate(createPageUrl('AdminCollections'));
        return;
      }

      setLoan(loanData[0]);
      setAttempts(attemptData);
      setDirectDebit(mandateData[0]);

      const [userData, kycData] = await Promise.all([
        base44.entities.User.filter({ id: loanData[0].user_id }),
        base44.entities.KYCProfile.filter({ user_id: loanData[0].user_id })
      ]);

      setUser(userData[0]);
      setKyc(kycData[0]);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = () => {
    if (!loan?.due_date) return 0;
    return Math.max(0, differenceInDays(new Date(), new Date(loan.due_date)));
  };

  const sendAction = async () => {
    if (!newAction.type) return;

    setProcessing(true);
    try {
      const admin = await base44.auth.me();
      const daysOverdue = getDaysOverdue();

      await base44.entities.CollectionAttempt.create({
        loan_id: loan.id,
        user_id: loan.user_id,
        attempt_type: newAction.type,
        status: 'sent',
        channel: newAction.type.includes('email') || newAction.type.includes('letter') ? 'email' : 
                 newAction.type.includes('sms') ? 'sms' : 
                 newAction.type.includes('phone') ? 'phone' : 'email',
        message_content: newAction.message,
        initiated_by: 'admin',
        admin_id: admin.id,
        days_overdue: daysOverdue,
        amount_outstanding: loan.total_repayment
      });

      if (user?.email && (newAction.type.includes('email') || newAction.type.includes('letter'))) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `Payment Notice - getawin.ng`,
          body: newAction.message || `Dear ${user.full_name}, this is a notice regarding your outstanding loan payment of ₦${Math.round(loan.total_repayment).toLocaleString()}.`
        });
      }

      toast.success('Collection action sent successfully');
      setNewAction({ type: '', message: '' });
      await loadData();

    } catch (error) {
      console.error('Error sending action:', error);
      toast.error('Failed to send action');
    } finally {
      setProcessing(false);
    }
  };

  const initiateDirectDebit = async () => {
    setProcessing(true);
    try {
      const admin = await base44.auth.me();

      // Record direct debit attempt
      await base44.entities.CollectionAttempt.create({
        loan_id: loan.id,
        user_id: loan.user_id,
        attempt_type: 'direct_debit_attempt',
        status: 'sent',
        channel: 'direct_debit',
        message_content: `Direct debit initiated for ₦${Math.round(loan.total_repayment).toLocaleString()}`,
        initiated_by: 'admin',
        admin_id: admin.id,
        days_overdue: getDaysOverdue(),
        amount_outstanding: loan.total_repayment
      });

      // Update mandate if exists
      if (directDebit) {
        await base44.entities.DirectDebitMandate.update(directDebit.id, {
          last_debit_date: new Date().toISOString(),
          last_debit_amount: loan.total_repayment
        });
      }

      toast.success('Direct debit initiated');
      await loadData();

    } catch (error) {
      console.error('Error initiating direct debit:', error);
      toast.error('Failed to initiate direct debit');
    } finally {
      setProcessing(false);
    }
  };

  const updateAttemptStatus = async (attemptId, status, notes) => {
    try {
      await base44.entities.CollectionAttempt.update(attemptId, {
        status,
        response_notes: notes
      });
      toast.success('Status updated');
      await loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getAttemptIcon = (type) => {
    if (type.includes('email')) return Mail;
    if (type.includes('sms')) return MessageSquare;
    if (type.includes('phone')) return Phone;
    if (type.includes('letter') || type.includes('notice')) return FileText;
    if (type.includes('direct_debit')) return CreditCard;
    return Mail;
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      responded: 'bg-purple-100 text-purple-700',
      paid: 'bg-emerald-100 text-emerald-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('AdminCollections')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Loan Collection Details</h1>
            <p className="text-gray-500 text-sm">Ref: {loan?.id.slice(0, 12).toUpperCase()}</p>
          </div>
          <Badge className={getDaysOverdue() > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
            {getDaysOverdue() > 0 ? `${getDaysOverdue()} days overdue` : 'On track'}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Borrower & Loan Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-normal flex items-center gap-2">
                <User className="w-4 h-4" /> Borrower Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold text-lg">{user?.full_name}</p>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-gray-600">{kyc?.phone_number ? `+234${kyc.phone_number}` : 'No phone'}</p>
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-500">Bank Account</p>
                <p className="font-medium">{kyc?.bank_name} - {kyc?.account_number}</p>
                <p className="text-gray-600">{kyc?.account_name}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-normal flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Loan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Due</span>
                <span className="font-bold text-lg text-red-600">₦{Math.round(loan?.total_repayment || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Principal</span>
                <span>₦{(loan?.amount_approved || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date</span>
                <span>{loan?.due_date ? format(new Date(loan.due_date), 'MMM d, yyyy') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge className={loan?.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                  {loan?.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Direct Debit Status */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Direct Debit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {directDebit ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{directDebit.bank_name} - {directDebit.account_number}</p>
                    <p className="text-sm text-gray-500">Max Amount: ₦{directDebit.max_amount?.toLocaleString()}</p>
                  </div>
                  <Badge className={directDebit.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {directDebit.status}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={initiateDirectDebit}
                    disabled={processing || directDebit.status !== 'active'}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Initiate Debit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No direct debit mandate set up</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Action */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Send Collection Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Action Type</Label>
              <Select value={newAction.type} onValueChange={(v) => setNewAction({ ...newAction, type: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder_email">Payment Reminder (Email)</SelectItem>
                  <SelectItem value="reminder_sms">Payment Reminder (SMS)</SelectItem>
                  <SelectItem value="overdue_email">Overdue Notice (Email)</SelectItem>
                  <SelectItem value="phone_call">Log Phone Call</SelectItem>
                  <SelectItem value="demand_letter">Demand Letter</SelectItem>
                  <SelectItem value="final_notice">Final Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message / Notes</Label>
              <Textarea
                value={newAction.message}
                onChange={(e) => setNewAction({ ...newAction, message: e.target.value })}
                placeholder="Enter message or call notes..."
                className="mt-1 h-24"
              />
            </div>
            <Button 
              onClick={sendAction}
              disabled={processing || !newAction.type}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Action
            </Button>
          </CardContent>
        </Card>

        {/* Collection History */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Collection History ({attempts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No collection actions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt, i) => {
                  const Icon = getAttemptIcon(attempt.attempt_type);
                  return (
                    <div key={attempt.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-900">
                            {attempt.attempt_type.replace(/_/g, ' ')}
                          </p>
                          <Badge className={getStatusBadge(attempt.status)}>{attempt.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          {format(new Date(attempt.created_date), 'MMM d, yyyy h:mm a')} • 
                          {attempt.initiated_by === 'admin' ? ' Admin' : ' System'} • 
                          {attempt.days_overdue} days overdue
                        </p>
                        {attempt.message_content && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2 line-clamp-2">
                            {attempt.message_content}
                          </p>
                        )}
                        {attempt.status === 'sent' && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateAttemptStatus(attempt.id, 'delivered', '')}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Delivered
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateAttemptStatus(attempt.id, 'responded', '')}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" /> Mark Responded
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}