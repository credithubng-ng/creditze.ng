import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ArrowLeft, 
  Mail,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Search,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'mail.com', 'aol.com'];

export default function Tier1Verification() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [employers, setEmployers] = useState([]);
  const [existingVerification, setExistingVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [workEmail, setWorkEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [employerData, verificationData] = await Promise.all([
        base44.entities.Tier1Employer.filter({ status: 'active' }),
        base44.entities.EmploymentVerification.filter({ user_id: currentUser.id }, '-created_date', 1)
      ]);

      setEmployers(employerData);
      
      if (verificationData[0]) {
        setExistingVerification(verificationData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployers = employers.filter(emp => 
    emp.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateEmail = (email) => {
    if (!email.includes('@')) return { valid: false, error: 'Invalid email format' };
    
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Check for public email domains
    if (PUBLIC_DOMAINS.includes(domain)) {
      return { valid: false, error: 'Public email domains are not allowed' };
    }

    // Check if domain matches employer
    if (!selectedEmployer.approved_domains.some(d => d.toLowerCase() === domain)) {
      return { valid: false, error: `Email domain must be from ${selectedEmployer.company_name}` };
    }

    // Check email template pattern
    const localPart = email.split('@')[0].toLowerCase();
    const templates = selectedEmployer.email_templates || ['firstname.lastname'];
    
    // For MVP, we'll accept any format from approved domains
    // In production, you'd validate against templates
    
    return { valid: true };
  };

  const sendVerificationEmail = async () => {
    const validation = validateEmail(workEmail);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Generate verification token
      const token = `VER${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);

      // Create verification record
      const verification = await base44.entities.EmploymentVerification.create({
        user_id: user.id,
        employer_id: selectedEmployer.id,
        work_email: workEmail,
        verification_token: token,
        token_expires: expiryDate.toISOString(),
        status: 'email_sent'
      });

      // Send verification email
      const verificationLink = `${window.location.origin}${createPageUrl('VerifyEmployment')}?token=${token}`;
      
      await base44.integrations.Core.SendEmail({
        to: workEmail,
        subject: 'Verify Your Employment - getawin.ng',
        body: `
Dear ${user.full_name},

You have requested to verify your employment at ${selectedEmployer.company_name} on getawin.ng.

Click the link below to confirm your employment:
${verificationLink}

This link will expire in 24 hours.

If you did not request this verification, please ignore this email.

Best regards,
The getawin.ng Team
        `
      });

      setEmailSent(true);
      setExistingVerification(verification);

    } catch (err) {
      setError('Failed to send verification email. Please try again.');
    } finally {
      setProcessing(false);
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
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">Tier-1 Employer Verification</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Existing verification status */}
        {existingVerification?.status === 'verified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-md border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Employment Verified</h3>
                    <p className="text-sm text-gray-500">
                      {existingVerification.work_email}
                    </p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => navigate(createPageUrl('ApplyLoan'))}
                >
                  Apply for Tier-1 Loan
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Email sent state */}
        {(emailSent || existingVerification?.status === 'email_sent') && existingVerification?.status !== 'verified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Work Email</h3>
                <p className="text-gray-500 mb-4">
                  We've sent a verification link to<br />
                  <span className="font-semibold">{existingVerification?.work_email || workEmail}</span>
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 mb-6">
                  <Clock className="w-4 h-4" />
                  Link expires in 24 hours
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Click the link in your work email to complete verification. Make sure to check your spam folder.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Employer selection */}
        {!selectedEmployer && !emailSent && existingVerification?.status !== 'email_sent' && existingVerification?.status !== 'verified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-7 h-7 text-emerald-400" />
                </div>
                <CardTitle>Select Your Employer</CardTitle>
                <CardDescription>
                  Choose your company from our approved Tier-1 list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredEmployers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No employers found</p>
                    </div>
                  ) : (
                    filteredEmployers.map(emp => (
                      <div
                        key={emp.id}
                        className="p-3 border rounded-xl cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition"
                        onClick={() => setSelectedEmployer(emp)}
                      >
                        <div className="flex items-center gap-3">
                          {emp.logo_url ? (
                            <img src={emp.logo_url} alt={emp.company_name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="font-bold text-gray-500">{emp.company_name.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{emp.company_name}</p>
                            <p className="text-xs text-gray-500">
                              {emp.approved_domains.join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Email input */}
        {selectedEmployer && !emailSent && existingVerification?.status !== 'email_sent' && existingVerification?.status !== 'verified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => {
                setSelectedEmployer(null);
                setWorkEmail('');
                setError(null);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Change employer
            </Button>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {selectedEmployer.logo_url ? (
                    <img src={selectedEmployer.logo_url} alt={selectedEmployer.company_name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-gray-600 text-lg">{selectedEmployer.company_name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{selectedEmployer.company_name}</CardTitle>
                    <Badge variant="secondary">Tier-1 Employer</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Work Email Address</Label>
                  <Input
                    type="email"
                    placeholder={`you@${selectedEmployer.approved_domains[0]}`}
                    value={workEmail}
                    onChange={(e) => {
                      setWorkEmail(e.target.value);
                      setError(null);
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted domains: {selectedEmployer.approved_domains.join(', ')}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={sendVerificationEmail}
                  disabled={processing || !workEmail}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Verification Email
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}