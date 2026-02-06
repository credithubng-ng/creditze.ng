import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import ReferralSection from '../components/referral/ReferralSection';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  CreditCard,
  Wallet,
  LogOut,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [creditLimit, setCreditLimit] = useState(null);
  const [referralStats, setReferralStats] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [referralConfig, setReferralConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [kycData, limitData, referralData, rewardData, refConfigData] = await Promise.all([
        base44.entities.KYCProfile.filter({ user_id: currentUser.id }),
        base44.entities.UserCreditLimit.filter({ user_id: currentUser.id }),
        base44.entities.UserReferral.filter({ referrer_id: currentUser.id }),
        base44.entities.ReferralReward.filter({ user_id: currentUser.id }),
        base44.entities.ReferralConfig.filter({ config_key: 'default' })
      ]);

      setKyc(kycData[0]);
      setCreditLimit(limitData[0]);
      setRewards(rewardData);
      setReferralConfig(refConfigData[0]);
      
      // Calculate referral stats
      setReferralStats({
        total: referralData.length,
        converted: referralData.filter(r => r.status === 'converted' || r.status === 'rewarded').length,
        pending: referralData.filter(r => r.status === 'pending').length
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Home'));
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
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-4 pt-4 pb-20">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(createPageUrl('Dashboard'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-white">Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-14 space-y-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{user?.full_name}</h2>
                  <p className="text-gray-500">{user?.email}</p>
                  {kyc?.kyc_status === 'verified' ? (
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge className="mt-2 bg-yellow-100 text-yellow-700">
                      <AlertCircle className="w-3 h-3 mr-1" /> Unverified
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credit Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    ₦{(creditLimit?.current_limit || 10000).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Credit Limit</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {creditLimit?.successful_repayments || 0}
                  </p>
                  <p className="text-xs text-gray-500">Repayments</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {creditLimit?.total_loans_taken || 0}
                  </p>
                  <p className="text-xs text-gray-500">Total Loans</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              <MenuItem 
                icon={Shield} 
                label="KYC Verification" 
                status={kyc?.kyc_status === 'verified' ? 'Verified' : 'Incomplete'}
                statusColor={kyc?.kyc_status === 'verified' ? 'text-emerald-600' : 'text-yellow-600'}
                onClick={() => navigate(createPageUrl('KYC'))}
              />
              <Separator />
              <MenuItem 
                icon={CreditCard} 
                label="Credit Search" 
                onClick={() => navigate(createPageUrl('CreditSearch'))}
              />
              <Separator />
              <MenuItem 
                icon={Building2} 
                label="Employer Verification" 
                onClick={() => navigate(createPageUrl('Tier1Verification'))}
              />
              <Separator />
              <MenuItem 
                icon={Wallet} 
                label="Loan History" 
                onClick={() => navigate(createPageUrl('LoanHistory'))}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ReferralSection user={user} referralStats={referralStats} rewards={rewards} referralConfig={referralConfig} />
        </motion.div>

        {/* Account Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-2">Account Details</h3>
              {kyc?.phone_number && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">+234{kyc.phone_number}</span>
                </div>
              )}
              {user?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{user.email}</span>
                </div>
              )}
              {kyc?.bank_name && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{kyc.bank_name} - {kyc.account_number}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to log out of your account?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, status, statusColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-500" />
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {status && <span className={`text-sm ${statusColor}`}>{status}</span>}
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </button>
  );
}