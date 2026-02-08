import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Plus,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '../components/shared/EmptyState';

export default function MyDisputes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const userDisputes = await base44.entities.Dispute.filter(
        { user_id: currentUser.id },
        '-created_date'
      );
      setDisputes(userDisputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return Clock;
      case 'under_review': return AlertCircle;
      case 'resolved': return CheckCircle2;
      case 'rejected': return XCircle;
      case 'escalated': return AlertTriangle;
      default: return Clock;
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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-gray-900">My Disputes</h1>
          </div>
          <Link to={createPageUrl('RaiseDispute')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> New Dispute
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : disputes.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No disputes yet"
            description="If you have any issues with your loans or account, you can raise a dispute"
            actionLabel="Raise Dispute"
            onAction={() => navigate(createPageUrl('RaiseDispute'))}
          />
        ) : (
          disputes.map(dispute => {
            const StatusIcon = getStatusIcon(dispute.status);
            const unreadResponses = dispute.responses?.filter(r => r.from === 'admin' && !r.read)?.length || 0;
            
            return (
              <Link key={dispute.id} to={createPageUrl(`DisputeDetail?id=${dispute.id}`)}>
                <Card className="border-0 shadow-sm hover:shadow-md transition cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">{dispute.subject}</h3>
                      </div>
                      <Badge className={getStatusBadge(dispute.status)}>
                        {dispute.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {dispute.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {format(new Date(dispute.created_date), 'MMM d, yyyy')}
                      </span>
                      {unreadResponses > 0 && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <MessageSquare className="w-4 h-4" />
                          <span className="font-medium">{unreadResponses} new</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}