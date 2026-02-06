import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle,
  Loader2,
  Clock,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function VerifyEmployment() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, expired, invalid
  const [verification, setVerification] = useState(null);
  const [employer, setEmployer] = useState(null);

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('invalid');
      return;
    }

    try {
      // Find verification record by token
      const verifications = await base44.entities.EmploymentVerification.filter({ 
        verification_token: token 
      });

      if (verifications.length === 0) {
        setStatus('invalid');
        return;
      }

      const ver = verifications[0];
      setVerification(ver);

      // Check if token is expired
      const expiry = new Date(ver.token_expires);
      if (expiry < new Date()) {
        setStatus('expired');
        return;
      }

      // Check if already used
      if (ver.token_used) {
        setStatus('invalid');
        return;
      }

      // Load employer
      const employers = await base44.entities.Tier1Employer.filter({ id: ver.employer_id });
      if (employers[0]) {
        setEmployer(employers[0]);
      }

      // Mark as verified
      await base44.entities.EmploymentVerification.update(ver.id, {
        status: 'verified',
        token_used: true,
        verified_date: new Date().toISOString()
      });

      setStatus('success');

    } catch (error) {
      console.error('Verification error:', error);
      setStatus('invalid');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {status === 'verifying' && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-emerald-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying...</h2>
              <p className="text-gray-500">Please wait while we verify your employment</p>
            </CardContent>
          </Card>
        )}

        {status === 'success' && (
          <Card className="border-0 shadow-lg border-t-4 border-t-emerald-500">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verified!</h2>
              <p className="text-gray-500 mb-6">
                Your employment at {employer?.company_name || 'your company'} has been verified.
              </p>
              <div className="flex items-center justify-center gap-2 text-emerald-600 mb-6">
                <Building2 className="w-5 h-5" />
                <span className="font-medium">{employer?.company_name}</span>
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Continue to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'expired' && (
          <Card className="border-0 shadow-lg border-t-4 border-t-amber-500">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h2>
              <p className="text-gray-500 mb-6">
                This verification link has expired. Please request a new one.
              </p>
              <Button 
                className="w-full"
                onClick={() => navigate(createPageUrl('Tier1Verification'))}
              >
                Request New Link
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'invalid' && (
          <Card className="border-0 shadow-lg border-t-4 border-t-red-500">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
              <p className="text-gray-500 mb-6">
                This verification link is invalid or has already been used.
              </p>
              <Button 
                className="w-full"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}