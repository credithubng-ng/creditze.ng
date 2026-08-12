import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  StickyNote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function AdminDisputeDetail() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [user, setUser] = useState(null);
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newNote, setNewNote] = useState('');
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const disputeId = urlParams.get('id');

    if (!disputeId) {
      navigate(createPageUrl('AdminDisputes'));
      return;
    }

    try {
      const currentAdmin = await base44.auth.me();
      if (currentAdmin.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      setAdmin(currentAdmin);

      const [disputeData] = await base44.entities.Dispute.filter({ id: disputeId });
      if (!disputeData) {
        navigate(createPageUrl('AdminDisputes'));
        return;
      }

      setDispute(disputeData);

      const [userData] = await base44.entities.User.filter({ id: disputeData.user_id });
      setUser(userData);

      if (disputeData.loan_id) {
        const [loanData] = await base44.entities.LoanApplication.filter({ id: disputeData.loan_id });
        setLoan(loanData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await base44.entities.Dispute.update(dispute.id, { status: newStatus });
      toast.success('Status updated');
      await checkAdminAndLoad();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const updatePriority = async (newPriority) => {
    try {
      await base44.entities.Dispute.update(dispute.id, { priority: newPriority });
      toast.success('Priority updated');
      await checkAdminAndLoad();
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const updatedResponses = [
        ...(dispute.responses || []),
        {
          from: 'admin',
          admin_name: admin.full_name,
          message: newMessage,
          timestamp: new Date().toISOString()
        }
      ];

      await base44.entities.Dispute.update(dispute.id, { responses: updatedResponses });
      toast.success('Message sent');
      setNewMessage('');
      await checkAdminAndLoad();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      const updatedNotes = [
        ...(dispute.admin_notes || []),
        {
          admin_id: admin.id,
          admin_name: admin.full_name,
          note: newNote,
          timestamp: new Date().toISOString()
        }
      ];

      await base44.entities.Dispute.update(dispute.id, { admin_notes: updatedNotes });
      toast.success('Note added');
      setNewNote('');
      await checkAdminAndLoad();
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const resolveDispute = async () => {
    if (!resolution.trim()) {
      toast.error('Please provide a resolution');
      return;
    }

    try {
      await base44.entities.Dispute.update(dispute.id, {
        status: 'resolved',
        resolution,
        resolved_date: new Date().toISOString()
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action: 'dispute_resolved',
        entity_type: 'Dispute',
        entity_id: dispute.id,
        admin_id: admin.id,
        details: { resolution }
      });

      toast.success('Dispute resolved');
      await checkAdminAndLoad();
    } catch (error) {
      toast.error('Failed to resolve dispute');
    }
  };

  const rejectDispute = async () => {
    if (!resolution.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await base44.entities.Dispute.update(dispute.id, {
        status: 'rejected',
        resolution,
        resolved_date: new Date().toISOString()
      });

      toast.success('Dispute rejected');
      await checkAdminAndLoad();
    } catch (error) {
      toast.error('Failed to reject dispute');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDisputes')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{dispute.subject}</h1>
              <p className="text-sm text-gray-500">Dispute #{dispute.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <Badge className={getStatusBadge(dispute.status)}>
            {dispute.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* User & Dispute Info */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Dispute Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">User</p>
                <p className="font-medium">{user?.full_name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Type</p>
                <p className="capitalize">{dispute.dispute_type.replace(/_/g, ' ')}</p>
              </div>
              {loan && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Related Loan</p>
                  <Link to={createPageUrl(`AdminLoanCollection?id=${loan.id}`)} className="text-emerald-600 hover:underline">
                    {loan.loan_type === 'urgent_10k' ? 'Urgent' : 'Tier-1'} - ₦{loan.amount_approved?.toLocaleString()}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">{dispute.description}</p>
              </div>
              {dispute.evidence_urls?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Evidence</p>
                  {dispute.evidence_urls.map((url, i) => (
                    <a 
                      key={i} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:underline mb-1"
                    >
                      <FileText className="w-4 h-4" />
                      Evidence {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={dispute.status} onValueChange={updateStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={dispute.priority} onValueChange={updatePriority}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!['resolved', 'rejected'].includes(dispute.status) && (
                <div className="border-t pt-4">
                  <Label>Resolution / Rejection Reason</Label>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Enter resolution details..."
                    className="mt-1 mb-2"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={resolveDispute}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
                    </Button>
                    <Button 
                      onClick={rejectDispute}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Internal Notes */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <StickyNote className="w-5 h-5" /> Internal Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dispute.admin_notes?.map((note, i) => (
              <div key={i} className="bg-yellow-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700">{note.admin_name}</p>
                <p className="text-sm text-gray-600 mt-1">{note.note}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
            <div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add internal note (not visible to user)..."
                className="mb-2"
              />
              <Button onClick={addNote} variant="outline">
                <StickyNote className="w-4 h-4 mr-2" /> Add Note
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Communication */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Communication with User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              {(!dispute.responses || dispute.responses.length === 0) ? (
                <p className="text-center text-gray-500 py-4">No messages yet</p>
              ) : (
                dispute.responses.map((response, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-3 ${response.from === 'user' ? '' : 'flex-row-reverse'}`}
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
                    <div className={`flex-1 ${response.from === 'admin' ? 'text-right' : ''}`}>
                      <div className={`inline-block max-w-md p-3 rounded-lg ${
                        response.from === 'admin' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
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

            {!['resolved', 'rejected'].includes(dispute.status) && (
              <div className="border-t pt-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your response to the user..."
                  className="mb-2"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send to User
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}