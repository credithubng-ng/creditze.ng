import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Upload,
  Eye
} from 'lucide-react';
import DocumentUploader from '@/components/documents/DocumentUploader';

export default function MyDocuments() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const docs = await base44.entities.LoanDocument.filter(
        { user_id: currentUser.id },
        '-created_date'
      );
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_review: { icon: Clock, className: 'bg-yellow-100 text-yellow-700', label: 'Pending Review' },
      approved: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Rejected' },
      expired: { icon: Calendar, className: 'bg-gray-100 text-gray-700', label: 'Expired' }
    };
    return config[status] || config.pending_review;
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      identity_card: 'Identity Card',
      passport: 'Passport',
      drivers_license: "Driver's License",
      utility_bill: 'Utility Bill',
      bank_statement: 'Bank Statement',
      payslip: 'Payslip',
      employment_letter: 'Employment Letter',
      tax_certificate: 'Tax Certificate',
      property_document: 'Property Document',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const response = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: doc.file_uri,
        expires_in: 300
      });

      if (response.signed_url) {
        window.open(response.signed_url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto pt-4 space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-emerald-600 px-4 pt-6 pb-12">
        <div className="max-w-2xl mx-auto">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" className="text-white hover:bg-emerald-700 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">My Documents</h1>
              <p className="text-emerald-100 text-sm">
                Upload and manage your documents
              </p>
            </div>
            <Button
              onClick={() => setShowUploader(!showUploader)}
              className="bg-white text-emerald-600 hover:bg-emerald-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        {showUploader && (
          <DocumentUploader
            onUploadComplete={() => {
              setShowUploader(false);
              loadData();
            }}
          />
        )}

        {documents.length === 0 && !showUploader ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No documents yet
              </h3>
              <p className="text-gray-500 mb-4">
                Upload your documents to support your loan applications
              </p>
              <Button
                onClick={() => setShowUploader(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const statusConfig = getStatusBadge(doc.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={doc.id} className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {getDocumentTypeLabel(doc.document_type)}
                          </h3>
                          <p className="text-sm text-gray-500 truncate mb-2">
                            {doc.file_name}
                          </p>
                          <Badge className={statusConfig.className}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        className="flex-shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                      <span>
                        Uploaded {new Date(doc.created_date).toLocaleDateString()}
                      </span>
                      <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                    </div>

                    {doc.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700">
                          <strong>Rejection reason:</strong> {doc.rejection_reason}
                        </p>
                      </div>
                    )}

                    {doc.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">{doc.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}