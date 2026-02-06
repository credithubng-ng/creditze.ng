import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  RefreshCw,
  Users,
  TrendingUp,
  Gift,
  DollarSign,
  Search,
  Filter,
  Settings,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminReferrals() {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [users, setUsers] = useState({});
  const [referralConfig, setReferralConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      await loadData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadData = async () => {
    try {
      const [referralData, rewardData, userData, configData] = await Promise.all([
        base44.entities.UserReferral.list('-created_date'),
        base44.entities.ReferralReward.list('-created_date'),
        base44.entities.User.list(),
        base44.entities.ReferralConfig.filter({ config_key: 'default' })
      ]);

      setReferrals(referralData);
      setRewards(rewardData);
      setReferralConfig(configData[0] || {
        config_key: 'default',
        referrer_cash_reward: 1000,
        referred_interest_discount: 2,
        referred_cash_bonus: 0,
        min_loan_amount_for_conversion: 5000,
        enable_referral_program: true,
        reward_expiry_days: 90,
        max_referrals_per_user: 50
      });

      const userMap = {};
      userData.forEach(u => { userMap[u.id] = u; });
      setUsers(userMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      if (referralConfig.id) {
        await base44.entities.ReferralConfig.update(referralConfig.id, referralConfig);
      } else {
        await base44.entities.ReferralConfig.create(referralConfig);
      }
      setEditingConfig(false);
      await loadData();
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      converted: 'bg-blue-100 text-blue-700',
      rewarded: 'bg-green-100 text-green-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredReferrals = referrals.filter(ref => {
    const matchesStatus = statusFilter === 'all' || ref.status === statusFilter;
    const matchesSearch = !searchQuery || 
      ref.referrer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.referred_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.referral_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: referrals.length,
    converted: referrals.filter(r => r.status === 'converted' || r.status === 'rewarded').length,
    pending: referrals.filter(r => r.status === 'pending').length,
    totalRewards: rewards.reduce((sum, r) => sum + (r.reward_value || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Referral Program</h1>
              <p className="text-gray-500 text-sm">Monitor referrals and rewards</p>
            </div>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Config Card */}
        {editingConfig ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Referral Program Settings</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingConfig(false);
                    loadData();
                  }}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={saveConfig}>
                    <Check className="w-4 h-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Referrer Cash Reward (₦)
                  </label>
                  <Input
                    type="number"
                    value={referralConfig.referrer_cash_reward}
                    onChange={(e) => setReferralConfig({...referralConfig, referrer_cash_reward: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Referred Interest Discount (%)
                  </label>
                  <Input
                    type="number"
                    value={referralConfig.referred_interest_discount}
                    onChange={(e) => setReferralConfig({...referralConfig, referred_interest_discount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Referred Cash Bonus (₦)
                  </label>
                  <Input
                    type="number"
                    value={referralConfig.referred_cash_bonus}
                    onChange={(e) => setReferralConfig({...referralConfig, referred_cash_bonus: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Min Loan for Conversion (₦)
                  </label>
                  <Input
                    type="number"
                    value={referralConfig.min_loan_amount_for_conversion}
                    onChange={(e) => setReferralConfig({...referralConfig, min_loan_amount_for_conversion: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Reward Expiry (days)
                  </label>
                  <Input
                    type="number"
                    value={referralConfig.reward_expiry_days}
                    onChange={(e) => setReferralConfig({...referralConfig, reward_expiry_days: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Max Referrals Per User
                  </label>
                  <Input
                    type="number"
                    value={referralConfig.max_referrals_per_user}
                    onChange={(e) => setReferralConfig({...referralConfig, max_referrals_per_user: Number(e.target.value)})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={referralConfig.enable_referral_program}
                      onChange={(e) => setReferralConfig({...referralConfig, enable_referral_program: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Referral Program</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : referralConfig && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Current Rewards</h3>
                    <p className="text-sm text-gray-600">Click edit to modify settings</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingConfig(true)}>
                  <Settings className="w-4 h-4 mr-1" /> Edit
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Referrer Reward</p>
                  <p className="text-lg font-bold text-indigo-600">₦{referralConfig.referrer_cash_reward.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Interest Discount</p>
                  <p className="text-lg font-bold text-indigo-600">{referralConfig.referred_interest_discount}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <Badge className={referralConfig.enable_referral_program ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {referralConfig.enable_referral_program ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.converted}</p>
                  <p className="text-sm text-gray-500">Converted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-sm text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">₦{(stats.totalRewards / 1000).toFixed(1)}k</p>
                  <p className="text-sm text-gray-500">Total Rewards</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by email or referral code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="rewarded">Rewarded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No referrals found</h3>
                <p className="text-gray-500">Referrals will appear here when users join</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred User</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map(referral => {
                    const referrer = users[referral.referrer_id];
                    const referred = users[referral.referred_user_id];
                    
                    return (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{referrer?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{referral.referrer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{referred?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{referral.referred_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {referral.referral_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(referral.status)}>
                            {referral.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {referral.reward_issued ? (
                            <span className="text-green-600 font-medium">
                              ₦{referral.reward_amount?.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(referral.created_date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}