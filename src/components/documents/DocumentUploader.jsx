import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DocumentUploader({ onUploadComplete, loanId = null }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const documentTypes = [
    { value: 'identity_card', label: 'Identity Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'utility_bill', label: 'Utility Bill' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'payslip', label: 'Payslip' },
    { value: 'employment_letter', label: 'Employment Letter' },
    { value: 'tax_certificate', label: 'Tax Certificate' },
    { value: 'property_document', label: 'Property Document' },
    { value: 'other', label: 'Other' }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only JPG, PNG, and PDF files are allowed');
        return;
      }

      setFile(selectedFile);
      setError('');
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentType) {
      setError('Please select a file and document type');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const user = await base44.auth.me();

      // Upload file to private storage
      const uploadResponse = await base44.integrations.Core.UploadPrivateFile({ file });
      
      if (!uploadResponse.file_uri) {
        throw new Error('Failed to upload file');
      }

      // Create document record
      await base44.entities.LoanDocument.create({
        user_id: user.id,
        loan_id: loanId,
        document_type: documentType,
        file_name: file.name,
        file_uri: uploadResponse.file_uri,
        file_size: file.size,
        file_type: file.type,
        notes: notes || null,
        status: 'pending_review'
      });

      setSuccess(true);
      setFile(null);
      setDocumentType('');
      setNotes('');
      
      if (onUploadComplete) {
        onUploadComplete();
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type *
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={uploading}
          >
            <option value="">Select document type</option>
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Document *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {!file ? (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG or PDF (max 10MB)
                </p>
              </label>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <File className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional information about this document"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={3}
            disabled={uploading}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              Document uploaded successfully!
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || !documentType || uploading}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}