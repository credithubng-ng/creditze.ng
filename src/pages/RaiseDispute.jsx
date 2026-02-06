import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, 
  AlertCircle,
  Upload,
  Loader2,
  Send,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

const DISPUTE_TYPES = [
  { value: 'loan_rejection', label: 'Loan Rejection' },
  { value: 'scoring_issue', label: 'Credit Score Issue' },
  { value: 'collection_action', label: 'Collection Action' },
  { value: 'interest_calculation', label: 'Interest Calculation' },
  { value: 'disbursement_issue', label: 'Disbursement Issue' },
  { value: 'other', label: 'Other' }
];

export default function RaiseDispute() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    dispute_type: '',
    loan_id: '',
    subject: '',
    description: '',
    evidence_urls: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const urlParams = new URLSearchParams(window.location.search);
      const loanId = urlParams.get('loan_id');
      const type = urlParams.get('type');

      const userLoans = await base44.entities.LoanApplication.filter(
        { user_id: currentUser.id },
        '-created_date',
        20
      );
      setLoans(userLoans);

      if (loanId) {
        setFormData(prev => ({ ...prev, loan_id: loanId }));
      }
      if (type && DISPUTE_TYPES.find(t => t.value === type)) {
        setFormData(prev => ({ ...prev, dispute_type: type }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadEvidence = async (file) => {
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        evidence_urls: [...prev.evidence_urls, result.file_url]
      }));
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.dispute_type || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Dispute.create({
        user_id: user.id,
        loan_id: formData.loan_id || null,
        dispute_type: formData.dispute_type,
        subject: formData.subject,
        description: formData.description,
        evidence_urls: formData.evidence_urls,
        status: 'open',
        priority: 'medium',
        responses: []
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action: 'dispute_created',
        entity_type: 'Dispute',
        user_id: user.id,
        details: {
          dispute_type: formData.dispute_type,
          loan_id: formData.loan_id
        }
      });

      toast.success('Dispute submitted successfully');
      navigate(createPageUrl('MyDisputes'));
    } catch (error) {
      console.error('Error submitting dispute:', error);
      toast.error('Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Raise a Dispute</h1>
            <p className="text-sm text-gray-500">We'll review and respond within 24-48 hours</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Dispute Details
            </CardTitle>
            <CardDescription>Provide as much detail as possible</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Dispute Type *</Label>
              <Select 
                value={formData.dispute_type} 
                onValueChange={(v) => setFormData({ ...formData, dispute_type: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Related Loan (optional)</Label>
              <Select 
                value={formData.loan_id} 
                onValueChange={(v) => setFormData({ ...formData, loan_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select loan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {loans.map(loan => (
                    <SelectItem key={loan.id} value={loan.id}>
                      {loan.loan_type === 'urgent_10k' ? 'Urgent Loan' : 'Tier-1'} - 
                      ₦{loan.amount_approved?.toLocaleString()} - 
                      {loan.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary of the issue"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed information about your dispute..."
                className="mt-1 h-32"
              />
            </div>

            <div>
              <Label>Evidence (optional)</Label>
              <p className="text-xs text-gray-500 mb-2">Upload screenshots, documents, or other evidence</p>
              <div className="space-y-2">
                {formData.evidence_urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="truncate">File {i + 1} uploaded</span>
                  </div>
                ))}
                <label>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && uploadEvidence(e.target.files[0])}
                    disabled={uploading}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={uploading}
                    onClick={(e) => e.currentTarget.previousElementSibling.click()}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload File
                  </Button>
                </label>
              </div>
            </div>

            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-6"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              Submit Dispute
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}