import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Copy, 
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralSection({ user, referralStats, rewards, referralConfig }) {
  const [copied, setCopied] = useState(false);
  
  // Generate referral code from user ID
  const referralCode = user?.id ? `CRDTZ${user.id.slice(0, 6).toUpperCase()}` : 'LOADING';
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;
  
  if (!user) {
    return null;
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Creditze.ng',
          text: `Get quick loans with Creditze.ng! Use my referral code ${referralCode} to sign up.`,
          url: referralLink
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  const activeRewards = rewards?.filter(r => r.status === 'active') || [];
  const totalEarned = rewards?.filter(r => r.status === 'used')
    .reduce((sum, r) => sum + (r.reward_value || 0), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Referral Stats */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-purple-600 to-purple-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="text-white">
              <h3 className="font-semibold text-lg">Refer & Earn</h3>
              <p className="text-purple-100 text-sm">
                Get ₦{(referralConfig?.referrer_cash_reward || 1000).toLocaleString()} for each friend who takes a loan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{referralStats?.total || 0}</p>
              <p className="text-purple-100 text-xs">Referred</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{referralStats?.converted || 0}</p>
              <p className="text-purple-100 text-xs">Converted</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">₦{totalEarned.toLocaleString()}</p>
              <p className="text-purple-100 text-xs">Earned</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-3 mb-3">
            <p className="text-white text-sm font-medium mb-2">Your Referral Code</p>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                readOnly
                className="bg-white/20 border-white/30 text-white font-mono font-bold"
              />
              <Button 
                onClick={() => copyToClipboard(referralCode)}
                className="bg-white text-purple-600 hover:bg-purple-50"
              >
                {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button 
            onClick={shareReferral}
            className="w-full bg-white text-purple-600 hover:bg-purple-50"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Referral Link
          </Button>
        </CardContent>
      </Card>

      {/* Active Rewards */}
      {activeRewards.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-600" />
              Active Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeRewards.map(reward => (
              <div key={reward.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{reward.description}</p>
                  <p className="text-sm text-gray-500">
                    {reward.reward_type === 'cash' 
                      ? `₦${reward.reward_value.toLocaleString()} cash reward`
                      : reward.reward_type === 'interest_discount'
                      ? `${reward.reward_value}% interest discount`
                      : `+${reward.reward_value} credit boost`
                    }
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Share your code</p>
              <p className="text-sm text-gray-500">Send your referral code or link to friends</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">They sign up</p>
              <p className="text-sm text-gray-500">Your friend creates an account using your code</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">You both earn</p>
              <p className="text-sm text-gray-500">
                Get ₦{(referralConfig?.referrer_cash_reward || 1000).toLocaleString()} when they take their first loan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}