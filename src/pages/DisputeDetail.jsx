import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  User,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function DisputeDetail() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const disputeId = urlParams.get('id');

    if (!disputeId) {
      navigate(createPageUrl('MyDisputes'));
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [disputeData] = await base44.entities.Dispute.filter({ id: disputeId });
      
      if (!disputeData || disputeData.user_id !== currentUser.id) {
        navigate(createPageUrl('MyDisputes'));
        return;
      }

      setDispute(disputeData);

      if (disputeData.loan_id) {
        const [loanData] = await base44.entities.LoanApplication.filter({ id: disputeData.loan_id });
        setLoan(loanData);
      }
    } catch (error) {
      console.error('Error loading dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const updatedResponses = [
        ...(dispute.responses || []),
        {
          from: 'user',
          message: newMessage,
          timestamp: new Date().toISOString()
        }
      ];

      await base44.entities.Dispute.update(dispute.id, {
        responses: updatedResponses
      });

      toast.success('Message sent');
      setNewMessage('');
      await loadData();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      escalated: 'bg-orange-100 text-orange-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
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
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('MyDisputes'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">{dispute.subject}</h1>
            <p className="text-sm text-gray-500">Dispute #{dispute.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <Badge className={getStatusBadge(dispute.status)}>
            {dispute.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Dispute Info */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Dispute Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium capitalize">{dispute.dispute_type.replace(/_/g, ' ')}</p>
            </div>
            {loan && (
              <div>
                <p className="text-sm text-gray-500">Related Loan</p>
                <p className="font-medium">
                  {loan.loan_type === 'urgent_10k' ? 'Urgent Loan' : 'Tier-1'} - 
                  ₦{loan.amount_approved?.toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{dispute.description}</p>
            </div>
            {dispute.evidence_urls?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Evidence</p>
                <div className="space-y-1">
                  {dispute.evidence_urls.map((url, i) => (
                    <a 
                      key={i} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      Evidence {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="font-medium">{format(new Date(dispute.created_date), 'MMM d, yyyy h:mm a')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Resolution */}
        {dispute.status === 'resolved' && dispute.resolution && (
          <Card className="border-0 shadow-md border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg text-green-700">Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{dispute.resolution}</p>
              {dispute.resolved_date && (
                <p className="text-sm text-gray-500 mt-2">
                  Resolved on {format(new Date(dispute.resolved_date), 'MMM d, yyyy')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Communication */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Communication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              {(!dispute.responses || dispute.responses.length === 0) ? (
                <p className="text-center text-gray-500 py-4">No messages yet</p>
              ) : (
                dispute.responses.map((response, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-3 ${response.from === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      response.from === 'admin' ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      {response.from === 'admin' ? (
                        <Shield className="w-4 h-4 text-purple-600" />
                      ) : (
                        <User className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div className={`flex-1 ${response.from === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block max-w-md p-3 rounded-lg ${
                        response.from === 'admin' 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {response.admin_name && (
                          <p className="text-xs font-semibold mb-1">{response.admin_name}</p>
                        )}
                        <p className="text-sm">{response.message}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(response.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {dispute.status !== 'resolved' && dispute.status !== 'rejected' && (
              <div className="border-t pt-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="mb-2"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Message
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}