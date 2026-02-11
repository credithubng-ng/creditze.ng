import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  CreditCard, 
  MapPin, 
  Building, 
  Banknote,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STEPS = [
  { id: 'phone', title: 'Phone', icon: Phone },
  { id: 'bvn', title: 'BVN', icon: CreditCard },
  { id: 'nin', title: 'NIN', icon: CreditCard },
  { id: 'address', title: 'Address', icon: MapPin },
  { id: 'property', title: 'Property', icon: Building },
  { id: 'bank', title: 'Bank', icon: Banknote }
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];



export default function KYC() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [banks, setBanks] = useState([]);
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  const [formData, setFormData] = useState({
    phone_number: '',
    bvn: '',
    nin: '',
    residential_address: '',
    residential_state: '',
    residential_lga: '',
    property_address: '',
    property_type: '',
    property_years: '',
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  useEffect(() => {
    loadData();
    loadBanks();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const kycData = await base44.entities.KYCProfile.filter({ user_id: currentUser.id });
      if (kycData[0]) {
        setKyc(kycData[0]);
        setFormData(prev => ({
          ...prev,
          ...kycData[0]
        }));
        // Find the first incomplete step
        if (!kycData[0].phone_verified) setCurrentStep(0);
        else if (!kycData[0].bvn_verified) setCurrentStep(1);
        else if (!kycData[0].nin_verified) setCurrentStep(2);
        else if (!kycData[0].residential_address) setCurrentStep(3);
        else if (!kycData[0].property_address) setCurrentStep(4);
        else if (!kycData[0].account_number) setCurrentStep(5);
        else {
          // All complete, redirect to dashboard
          navigate(createPageUrl('Dashboard'));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const response = await base44.functions.invoke('paystackGetBanks');
      if (response.data.success) {
        setBanks(response.data.banks);
      }
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  const verifyAccount = async () => {
    if (!formData.account_number || formData.account_number.length !== 10) {
      return;
    }
    if (!formData.bank_name) {
      return;
    }

    const selectedBank = banks.find(b => b.name === formData.bank_name);
    if (!selectedBank) {
      return;
    }

    setVerifyingAccount(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('paystackVerifyAccount', {
        account_number: formData.account_number,
        bank_code: selectedBank.code
      });

      if (response.data.success) {
        handleChange('account_name', response.data.account_name);
      } else {
        setError(response.data.error || 'Could not verify account');
      }
    } catch (err) {
      setError('Account verification failed');
    } finally {
      setVerifyingAccount(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Auto-verify account when both bank and account number are set
  useEffect(() => {
    if (formData.bank_name && formData.account_number && formData.account_number.length === 10) {
      verifyAccount();
    }
  }, [formData.bank_name, formData.account_number]);

  const sendOTP = async () => {
    if (!formData.phone_number || formData.phone_number.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setSaving(true);
    try {
      const response = await base44.functions.invoke('sendOTP', {
        phone_number: formData.phone_number,
        type: 'phone'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setSaving(true);
    try {
      const response = await base44.functions.invoke('verifyOTP', {
        otp: otp,
        type: 'phone'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Invalid OTP');
      }

      const kycUpdate = {
        user_id: user.id,
        phone_number: formData.phone_number,
        phone_verified: true
      };

      if (kyc) {
        await base44.entities.KYCProfile.update(kyc.id, kycUpdate);
      } else {
        const newKyc = await base44.entities.KYCProfile.create(kycUpdate);
        setKyc(newKyc);
      }
      setCurrentStep(1);
      setError(null);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const verifyBVN = async () => {
    if (!formData.bvn || formData.bvn.length !== 11) {
      setError('BVN must be 11 digits');
      return;
    }
    setSaving(true);
    try {
      // Verify BVN with Paystack
      const response = await base44.functions.invoke('paystackVerifyBVN', {
        bvn: formData.bvn
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'BVN verification failed');
      }

      const bvnData = response.data.data;

      // Match names
      const userFullName = user.full_name?.toLowerCase().trim();
      const bvnFullName = bvnData.full_name?.toLowerCase().trim();
      
      if (!userFullName || !bvnFullName) {
        throw new Error('Unable to verify names. Please contact support.');
      }

      // Simple name matching (handle middle names, reversals, etc)
      const userNames = userFullName.split(/\s+/).sort();
      const bvnNames = bvnFullName.split(/\s+/).sort();
      
      const nameMatch = userNames.some(un => 
        bvnNames.some(bn => bn.includes(un) || un.includes(bn))
      );

      if (!nameMatch) {
        throw new Error(`Name mismatch: Your registered name "${user.full_name}" doesn't match BVN name "${bvnData.full_name}". Please contact support.`);
      }

      // Match phone numbers (last 10 digits)
      const userPhone = kyc.phone_number?.replace(/\D/g, '').slice(-10);
      const bvnPhone = bvnData.phone_number?.replace(/\D/g, '').slice(-10);

      if (userPhone && bvnPhone && userPhone !== bvnPhone) {
        throw new Error(`Phone number mismatch: Your verified phone ${userPhone} doesn't match BVN phone ${bvnPhone}. Please contact support.`);
      }

      await base44.entities.KYCProfile.update(kyc.id, {
        bvn: formData.bvn,
        bvn_verified: true
      });
      setCurrentStep(2);
      setError(null);
    } catch (err) {
      setError(err.message || 'BVN verification failed. Please check and try again.');
    } finally {
      setSaving(false);
    }
  };

  const verifyNIN = async () => {
    if (!formData.nin || formData.nin.length !== 11) {
      setError('NIN must be 11 digits');
      return;
    }
    setSaving(true);
    try {
      // In production, this would call a NIN verification API
      await base44.entities.KYCProfile.update(kyc.id, {
        nin: formData.nin,
        nin_verified: true
      });
      setCurrentStep(3);
    } catch (err) {
      setError('NIN verification failed. Please check and try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    if (!formData.residential_address || !formData.residential_state) {
      setError('Please fill in all address fields');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.KYCProfile.update(kyc.id, {
        residential_address: formData.residential_address,
        residential_state: formData.residential_state,
        residential_lga: formData.residential_lga
      });
      setCurrentStep(4);
    } catch (err) {
      setError('Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveProperty = async () => {
    if (!formData.property_address || !formData.property_type) {
      setError('Please fill in all property fields');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.KYCProfile.update(kyc.id, {
        property_address: formData.property_address,
        property_type: formData.property_type,
        property_years: parseInt(formData.property_years) || 0
      });
      setCurrentStep(5);
    } catch (err) {
      setError('Failed to save property details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async () => {
    if (!formData.bank_name || !formData.account_number || !formData.account_name) {
      setError('Please fill in all bank details');
      return;
    }
    if (formData.account_number.length !== 10) {
      setError('Account number must be 10 digits');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.KYCProfile.update(kyc.id, {
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_name: formData.account_name,
        kyc_status: 'verified',
        kyc_completed_date: new Date().toISOString()
      });
      navigate(createPageUrl('Dashboard'));
    } catch (err) {
      setError('Failed to save bank details. Please try again.');
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">KYC Verification</h1>
            <p className="text-sm text-gray-500">Step {currentStep + 1} of {STEPS.length}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="max-w-lg mx-auto flex gap-2">
          {STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < currentStep ? 'bg-emerald-500' : 
                i === currentStep ? 'bg-emerald-300' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Phone Verification */}
            {currentStep === 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <Phone className="w-7 h-7 text-emerald-600" />
                  </div>
                  <CardTitle>Verify Your Phone</CardTitle>
                  <CardDescription>We'll send a verification code to your number</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!otpSent ? (
                    <>
                      <div>
                        <Label>Phone Number</Label>
                        <div className="flex gap-2 mt-1">
                          <div className="flex items-center px-3 bg-gray-100 rounded-lg text-gray-600 font-medium">
                            +234
                          </div>
                          <Input
                            type="tel"
                            placeholder="8012345678"
                            value={formData.phone_number}
                            onChange={(e) => handleChange('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={sendOTP}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Send OTP
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-4">
                          Enter the 6-digit code sent to +234{formData.phone_number}
                        </p>
                        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                          <InputOTPGroup className="gap-2 justify-center">
                            {[0,1,2,3,4,5].map(i => (
                              <InputOTPSlot key={i} index={i} className="w-12 h-12 text-lg" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={verifyOTP}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Verify <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => setOtpSent(false)}
                      >
                        Change Number
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* BVN Verification */}
            {currentStep === 1 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <CreditCard className="w-7 h-7 text-emerald-600" />
                  </div>
                  <CardTitle>BVN Verification</CardTitle>
                  <CardDescription>Enter your 11-digit Bank Verification Number</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>BVN</Label>
                    <Input
                      type="text"
                      placeholder="22123456789"
                      value={formData.bvn}
                      onChange={(e) => handleChange('bvn', e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="mt-1 text-lg tracking-wider"
                    />
                    <p className="text-xs text-gray-500 mt-1">Dial *565*0# on your registered line to get your BVN</p>
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={verifyBVN}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify BVN <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* NIN Verification */}
            {currentStep === 2 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <CreditCard className="w-7 h-7 text-emerald-600" />
                  </div>
                  <CardTitle>NIN Verification</CardTitle>
                  <CardDescription>Enter your 11-digit National Identification Number</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>NIN</Label>
                    <Input
                      type="text"
                      placeholder="12345678901"
                      value={formData.nin}
                      onChange={(e) => handleChange('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="mt-1 text-lg tracking-wider"
                    />
                    <p className="text-xs text-gray-500 mt-1">Dial *346# on any phone to retrieve your NIN</p>
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={verifyNIN}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify NIN <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Address */}
            {currentStep === 3 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <MapPin className="w-7 h-7 text-emerald-600" />
                  </div>
                  <CardTitle>Residential Address</CardTitle>
                  <CardDescription>Where do you currently live?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Street Address</Label>
                    <Input
                      placeholder="123 Main Street, Lekki"
                      value={formData.residential_address}
                      onChange={(e) => handleChange('residential_address', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Select value={formData.residential_state} onValueChange={(v) => handleChange('residential_state', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>LGA (Optional)</Label>
                    <Input
                      placeholder="Local Government Area"
                      value={formData.residential_lga}
                      onChange={(e) => handleChange('residential_lga', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={saveAddress}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Property */}
            {currentStep === 4 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <Building className="w-7 h-7 text-emerald-600" />
                  </div>
                  <CardTitle>Property Details</CardTitle>
                  <CardDescription>This helps us assess your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Property Address</Label>
                    <Input
                      placeholder="Address of property"
                      value={formData.property_address}
                      onChange={(e) => handleChange('property_address', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Property Type</Label>
                    <Select value={formData.property_type} onValueChange={(v) => handleChange('property_type', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owned">Owned</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                        <SelectItem value="family">Family Property</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Years at this Property</Label>
                    <Input
                      type="number"
                      placeholder="2"
                      value={formData.property_years}
                      onChange={(e) => handleChange('property_years', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={saveProperty}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Bank Details */}
            {currentStep === 5 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <Banknote className="w-7 h-7 text-emerald-600" />
                  </div>
                  <CardTitle>Bank Account</CardTitle>
                  <CardDescription>Where should we send your funds?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Bank</Label>
                    <Select value={formData.bank_name} onValueChange={(v) => handleChange('bank_name', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map(bank => (
                          <SelectItem key={bank.code} value={bank.name}>{bank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      type="text"
                      placeholder="0123456789"
                      value={formData.account_number}
                      onChange={(e) => handleChange('account_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Account Name</Label>
                    <div className="relative">
                      <Input
                        placeholder="Account name will appear here"
                        value={formData.account_name}
                        onChange={(e) => handleChange('account_name', e.target.value)}
                        className="mt-1"
                        disabled={verifyingAccount}
                      />
                      {verifyingAccount && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                      )}
                    </div>
                    {formData.account_name && !verifyingAccount && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Account verified
                      </p>
                    )}
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={saveBank}
                    disabled={saving || verifyingAccount || !formData.account_name}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Complete Verification <CheckCircle2 className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}