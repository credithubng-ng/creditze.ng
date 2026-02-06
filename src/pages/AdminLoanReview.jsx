import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Mail,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  MessageSquare,
  Send,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function AdminLoanReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState({});
  const [kycProfiles, setKycProfiles] = useState({});
  const [mlScores, setMlScores] = useState({});
  const [selectedApp, setSelectedApp] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    action: '', // 'approve' or 'reject'
    scoreAdjustment: 0,
    amountAdjustment: 0,
    interestAdjustment: 0,
    notes: '',
    reason: ''
  });

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
      await loadApplications();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadApplications = async () => {
    try {
      // Get all applications that need review
      const [pendingApps, underReviewApps] = await Promise.all([
        base44.entities.LoanApplication.filter({ manual_review_required: true, status: 'pending' }, '-created_date'),
        base44.entities.LoanApplication.filter({ status: 'under_review' }, '-created_date')
      ]);

      const allApps = [...pendingApps, ...underReviewApps];
      setApplications(allApps);

      // Load user data for all applications
      const userIds = [...new Set(allApps.map(app => app.user_id))];
      const [usersData, kycData, mlScoreData] = await Promise.all([
        Promise.all(userIds.map(id => base44.entities.User.filter({ id }))),
        Promise.all(userIds.map(id => base44.entities.KYCProfile.filter({ user_id: id }))),
        Promise.all(allApps.map(app => base44.entities.MLScoreResult.filter({ loan_id: app.id })))
      ]);

      const usersMap = {};
      usersData.forEach((userData, i) => {
        if (userData[0]) usersMap[userIds[i]] = userData[0];
      });
      setUsers(usersMap);

      const kycMap = {};
      kycData.forEach((kyc, i) => {
        if (kyc[0]) kycMap[userIds[i]] = kyc[0];
      });
      setKycProfiles(kycMap);

      const mlScoreMap = {};
      mlScoreData.forEach((score, i) => {
        if (score[0]) mlScoreMap[allApps[i].id] = score[0];
      });
      setMlScores(mlScoreMap);

    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (app) => {
    setSelectedApp(app);
    setReviewForm({
      action: '',
      scoreAdjustment: 0,
      amountAdjustment: app.amount_requested,
      interestAdjustment: app.interest_rate,
      notes: '',
      reason: ''
    });
    setShowReviewDialog(true);
  };

  const handleReview = async () => {
    if (!reviewForm.action) {
      toast.error('Please select an action');
      return;
    }

    if (!reviewForm.reason.trim()) {
      toast.error('Please provide a reason for your decision');
      return;
    }

    setProcessing(true);
    try {
      const admin = await base44.auth.me();
      const user = users[selectedApp.user_id];

      // Calculate adjusted score
      const adjustedScore = (selectedApp.original_score || selectedApp.score) + parseFloat(reviewForm.scoreAdjustment);

      // Prepare update data
      const updateData = {
        status: reviewForm.action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: admin.id,
        reviewed_date: new Date().toISOString(),
        manual_score_adjustment: parseFloat(reviewForm.scoreAdjustment),
        score: adjustedScore,
        original_score: selectedApp.original_score || selectedApp.score,
        admin_notes: [
          ...(selectedApp.admin_notes || []),
          {
            admin_id: admin.id,
            admin_name: admin.full_name,
            note: reviewForm.notes,
            timestamp: new Date().toISOString()
          }
        ]
      };

      if (reviewForm.action === 'approve') {
        updateData.amount_approved = parseFloat(reviewForm.amountAdjustment);
        updateData.manual_amount_adjustment = parseFloat(reviewForm.amountAdjustment);
        updateData.interest_rate = parseFloat(reviewForm.interestAdjustment);
        updateData.manual_interest_adjustment = parseFloat(reviewForm.interestAdjustment);
        updateData.approval_reason = reviewForm.reason;

        // Calculate new total repayment
        const principal = parseFloat(reviewForm.amountAdjustment);
        const rate = parseFloat(reviewForm.interestAdjustment) / 100;
        updateData.total_repayment = principal + (principal * rate);
      } else {
        updateData.rejection_reason = reviewForm.reason;
      }

      // Update loan application
      await base44.entities.LoanApplication.update(selectedApp.id, updateData);

      // Send notification email
      const emailSubject = reviewForm.action === 'approve' 
        ? '✅ Your Loan Application Has Been Approved'
        : '❌ Loan Application Update';

      const emailBody = reviewForm.action === 'approve'
        ? `Dear ${user.full_name},

Great news! Your loan application has been reviewed and approved by our team.

Loan Details:
• Amount Approved: ₦${updateData.amount_approved.toLocaleString()}
• Interest Rate: ${updateData.interest_rate}%
• Total Repayment: ₦${updateData.total_repayment.toLocaleString()}

Reason: ${reviewForm.reason}

Next Steps:
Please log in to your dashboard and set up direct debit to receive your funds.

Best regards,
getawin.ng Team`
        : `Dear ${user.full_name},

We regret to inform you that your loan application has been reviewed and could not be approved at this time.

Reason: ${reviewForm.reason}

You can reapply after addressing the concerns mentioned above. If you believe this decision was made in error, you can raise a dispute through your dashboard.

Best regards,
getawin.ng Team`;

      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: emailSubject,
        body: emailBody
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action: `loan_${reviewForm.action}`,
        entity_type: 'LoanApplication',
        entity_id: selectedApp.id,
        admin_id: admin.id,
        user_id: selectedApp.user_id,
        details: {
          score_adjustment: reviewForm.scoreAdjustment,
          amount_adjustment: reviewForm.amountAdjustment,
          interest_adjustment: reviewForm.interestAdjustment,
          reason: reviewForm.reason,
          notes: reviewForm.notes
        }
      });

      toast.success(`Loan ${reviewForm.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setShowReviewDialog(false);
      await loadApplications();

    } catch (error) {
      console.error('Error processing review:', error);
      toast.error('Failed to process review');
    } finally {
      setProcessing(false);
    }
  };

  const markUnderReview = async (app) => {
    try {
      await base44.entities.LoanApplication.update(app.id, {
        status: 'under_review'
      });
      toast.success('Application marked as under review');
      await loadApplications();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update status');
    }
  };

  const triggerManualDisbursement = async (app) => {
    if (app.status !== 'approved') {
      toast.error('Loan must be approved before disbursement');
      return;
    }

    try {
      const user = users[app.user_id];
      const kyc = kycProfiles[app.user_id];

      if (!kyc?.bank_name || !kyc?.account_number) {
        toast.error('User bank details not found');
        return;
      }

      const admin = await base44.auth.me();

      // Create disbursement log
      await base44.entities.DisbursementLog.create({
        loan_id: app.id,
        user_id: app.user_id,
        amount: app.amount_approved,
        bank_name: kyc.bank_name,
        account_number: kyc.account_number,
        account_name: kyc.account_name || user.full_name,
        status: 'pending',
        initiated_by: 'admin',
        admin_id: admin.id
      });

      // Update loan status
      await base44.entities.LoanApplication.update(app.id, {
        status: 'disbursed',
        disbursement_date: new Date().toISOString().split('T')[0]
      });

      toast.success('Manual disbursement initiated');
      await loadApplications();

    } catch (error) {
      console.error('Error initiating disbursement:', error);
      toast.error('Failed to initiate disbursement');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
              <h1 className="text-xl font-bold text-gray-900">Loan Application Review</h1>
              <p className="text-gray-500 text-sm">Manual review queue</p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {applications.length} Pending
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {applications.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No loan applications require manual review at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const user = users[app.user_id];
              const kyc = kycProfiles[app.user_id];
              const mlScore = mlScores[app.id];

              return (
                <Card key={app.id} className="border-0 shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-3 mb-1">
                            {user?.full_name || 'Unknown User'}
                            <Badge className={app.status === 'under_review' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                              {app.status === 'under_review' ? 'Under Review' : 'Needs Review'}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {user?.email} • Applied {new Date(app.created_date).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Review Reason */}
                    {app.manual_review_reason && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <strong>Review Required:</strong> {app.manual_review_reason}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Loan Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Loan Type</p>
                        <p className="font-semibold text-gray-900">
                          {app.loan_type === 'urgent_10k' ? 'Urgent ₦10k' : 'Tier-1 Personal'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Amount Requested</p>
                        <p className="font-semibold text-gray-900">₦{app.amount_requested.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">System Score</p>
                        <p className="font-semibold text-gray-900">{app.score}/100</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Interest Rate</p>
                        <p className="font-semibold text-gray-900">{app.interest_rate}%</p>
                      </div>
                    </div>

                    {/* ML Score Details */}
                    {mlScore && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          ML Score Analysis
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Combined Score</p>
                            <p className="font-medium">{mlScore.combined_score}/100</p>
                          </div>
                          <div>
                            <p className="text-gray-500">ML Score</p>
                            <p className="font-medium">{mlScore.ml_score}/100</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Confidence</p>
                            <p className="font-medium capitalize">{mlScore.confidence_level}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Recommendation</p>
                            <Badge className={
                              mlScore.recommendation === 'approve' ? 'bg-green-100 text-green-700' :
                              mlScore.recommendation === 'reject' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {mlScore.recommendation}
                            </Badge>
                          </div>
                        </div>
                        {mlScore.risk_flags_detected?.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-2">Risk Flags:</p>
                            <div className="flex flex-wrap gap-1">
                              {mlScore.risk_flags_detected.map((flag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {flag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* KYC Status */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">KYC Status:</span>
                      <Badge className={kyc?.kyc_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {kyc?.kyc_status || 'Unknown'}
                      </Badge>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      {app.status === 'pending' && (
                        <Button
                          onClick={() => markUnderReview(app)}
                          variant="outline"
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Mark Under Review
                        </Button>
                      )}
                      <Button
                        onClick={() => openReviewDialog(app)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Review Application
                      </Button>
                      {app.status === 'approved' && (
                        <Button
                          onClick={() => triggerManualDisbursement(app)}
                          variant="outline"
                          className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Trigger Disbursement
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Loan Application</DialogTitle>
            <DialogDescription>
              {selectedApp && users[selectedApp.user_id]?.full_name} • ₦{selectedApp?.amount_requested.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Action Selection */}
            <div>
              <Label className="mb-3 block">Decision *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={reviewForm.action === 'approve' ? 'default' : 'outline'}
                  onClick={() => setReviewForm({ ...reviewForm, action: 'approve' })}
                  className={reviewForm.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant={reviewForm.action === 'reject' ? 'default' : 'outline'}
                  onClick={() => setReviewForm({ ...reviewForm, action: 'reject' })}
                  className={reviewForm.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>

            {reviewForm.action === 'approve' && (
              <>
                {/* Score Adjustment */}
                <div>
                  <Label className="mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Score Adjustment
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={reviewForm.scoreAdjustment}
                      onChange={(e) => setReviewForm({ ...reviewForm, scoreAdjustment: e.target.value })}
                      placeholder="0"
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">
                      Final: {((selectedApp?.score || 0) + parseFloat(reviewForm.scoreAdjustment || 0)).toFixed(1)}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Use negative values to decrease score</p>
                </div>

                {/* Amount Adjustment */}
                <div>
                  <Label className="mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Approved Amount (₦)
                  </Label>
                  <Input
                    type="number"
                    value={reviewForm.amountAdjustment}
                    onChange={(e) => setReviewForm({ ...reviewForm, amountAdjustment: e.target.value })}
                    placeholder="Amount"
                  />
                </div>

                {/* Interest Rate Adjustment */}
                <div>
                  <Label className="mb-2 flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Interest Rate (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={reviewForm.interestAdjustment}
                    onChange={(e) => setReviewForm({ ...reviewForm, interestAdjustment: e.target.value })}
                    placeholder="Interest rate"
                  />
                </div>

                {/* Approval Reason */}
                <div>
                  <Label className="mb-2">Approval Reason *</Label>
                  <Textarea
                    value={reviewForm.reason}
                    onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })}
                    placeholder="Why are you approving this application?"
                    rows={3}
                  />
                </div>
              </>
            )}

            {reviewForm.action === 'reject' && (
              <div>
                <Label className="mb-2">Rejection Reason *</Label>
                <Textarea
                  value={reviewForm.reason}
                  onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })}
                  placeholder="Why are you rejecting this application?"
                  rows={3}
                />
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <Label className="mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Internal Notes (Optional)
              </Label>
              <Textarea
                value={reviewForm.notes}
                onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                placeholder="Add internal notes for team reference..."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">These notes are for internal use only</p>
            </div>

            {/* Summary */}
            {reviewForm.action && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  An email notification will be sent to the user about your decision.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={processing || !reviewForm.action}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}