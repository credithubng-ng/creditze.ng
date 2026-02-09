import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function CreditCheckGateway() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [creditSearch, setCreditSearch] = useState(null);
  const [paying, setPaying] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [loanType, setLoanType] = useState('');
  const [processingSearch, setProcessingSearch] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get destination from URL params
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      const url = params.get('url');
      
      if (!type || !url) {
        navigate(createPageUrl('Home'));
        return;
      }

      setLoanType(type);
      setDestinationUrl(decodeURIComponent(url));

      // Check if returning from payment
      const reference = params.get('reference');
      if (reference) {
        await handlePaymentCallback(reference, currentUser.id);
        return;
      }

      // Check for valid credit search
      const searches = await base44.entities.CreditSearch.filter({ 
        user_id: currentUser.id 
      }, '-created_date', 1);

      if (searches[0]) {
        const expiry = new Date(searches[0].expiry_date);
        if (expiry > new Date() && searches[0].search_status === 'successful') {
          setCreditSearch(searches[0]);
        }
      }
    } catch (error) {
      console.error('Error loading status:', error);
      navigate(createPageUrl('Home'));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCallback = async (reference, userId) => {
    setProcessingSearch(true);
    try {
      // Verify payment
      const verifyResponse = await base44.functions.invoke('paystackVerifyPayment', { reference });
      
      if (!verifyResponse.data.status) {
        alert('Payment verification failed. Please contact support.');
        setProcessingSearch(false);
        return;
      }

      // Get KYC to retrieve BVN
      const kycData = await base44.entities.KYCProfile.filter({ user_id: userId });
      if (!kycData[0] || !kycData[0].bvn) {
        alert('BVN not found. Please complete KYC first.');
        navigate(createPageUrl('KYC'));
        return;
      }

      // Perform credit search
      const searchResponse = await base44.functions.invoke('performCreditSearch', {
        user_id: userId,
        bvn: kycData[0].bvn,
        payment_reference: reference
      });

      if (searchResponse.data.success) {
        // Reload to show completed status
        window.location.reload();
      } else {
        alert('Credit search failed: ' + (searchResponse.data.error || 'Unknown error'));
        setProcessingSearch(false);
      }
    } catch (error) {
      console.error('Error processing credit search:', error);
      alert('Failed to process credit search. Please contact support.');
      setProcessingSearch(false);
    }
  };

  const handlePayForCreditCheck = async () => {
    setPaying(true);
    try {
      const response = await base44.functions.invoke('paystackInitializePayment', {
        email: user.email,
        amount: 850,
        callback_url: window.location.href,
        metadata: {
          purpose: 'credit_search',
          user_id: user.id
        }
      });

      if (response.data.status && response.data.data.authorization_url) {
        window.location.href = response.data.data.authorization_url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  };

  const handleProceedToApplication = () => {
    window.open(destinationUrl, '_blank');
    setTimeout(() => {
      navigate(createPageUrl('Dashboard'));
    }, 500);
  };

  if (loading || processingSearch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {processingSearch ? 'Processing your credit search...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Home'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">
              {loanType === 'pof' ? 'POF Loan Application' : '£10,000 UK Loan Application'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Credit Check Status */}
            {creditSearch ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-emerald-900 mb-1">
                      Credit Check Completed
                    </h3>
                    <p className="text-sm text-emerald-700">
                      Valid until {new Date(creditSearch.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-900 mb-2">
                  Credit Check Required
                </h3>
                <p className="text-sm text-amber-700 mb-4">
                  Before proceeding with your application, you need to complete a credit check. This is valid for 90 days.
                </p>
                <div className="flex items-center justify-between bg-white rounded-lg p-3 mb-4">
                  <span className="text-sm font-medium text-gray-700">Credit Check Fee</span>
                  <span className="text-xl font-bold text-gray-900">₦850</span>
                </div>
                <Button
                  onClick={handlePayForCreditCheck}
                  disabled={paying}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Pay & Complete Credit Check'
                  )}
                </Button>
              </div>
            )}

            {/* Next Steps */}
            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-900 mb-3">What happens next?</h4>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>{creditSearch ? '✓ Credit check completed' : 'Complete your credit check payment'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>You'll be redirected to complete your application</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Application review and approval</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <span>Receive your funds</span>
                </li>
              </ol>
            </div>

            {/* Proceed Button */}
            {creditSearch && (
              <Button
                onClick={handleProceedToApplication}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Proceed to Application <ExternalLink className="ml-2 w-4 h-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}