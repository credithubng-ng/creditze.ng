import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Settings,
  Percent,
  Clock,
  Wallet,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminSettings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    urgent_10k_base_amount: 10000,
    urgent_10k_interest_rate: 15,
    urgent_10k_tenure_days: 30,
    urgent_10k_min_score: 60,
    urgent_10k_increment_percent: 20,
    tier1_min_score: 75,
    tier1_min_amount: 50000,
    tier1_max_amount: 5000000,
    tier1_interest_rate: 12,
    tier1_tenure_days: 90,
    credit_search_fee: 50,
    credit_report_validity_days: 90,
    verification_link_validity_hours: 24,
    default_affiliate_commission: 5
  });

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
      await loadConfig();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const configs = await base44.entities.LoanConfig.filter({ config_key: 'default' });
      if (configs[0]) {
        setConfig(configs[0]);
        setFormData({
          ...formData,
          ...configs[0]
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        config_key: 'default'
      };

      if (config) {
        await base44.entities.LoanConfig.update(config.id, data);
      } else {
        await base44.entities.LoanConfig.create(data);
      }

      toast.success('Settings saved successfully');
      await loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save settings');
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
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Loan Configuration</h1>
              <p className="text-gray-500 text-sm">Configure loan rules and thresholds</p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Urgent 10k Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Urgent ₦10,000 Loan</CardTitle>
                <CardDescription>Credit limit builder product settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Base Amount (₦)</Label>
                <Input
                  type="number"
                  value={formData.urgent_10k_base_amount}
                  onChange={(e) => setFormData({ ...formData, urgent_10k_base_amount: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.urgent_10k_interest_rate}
                  onChange={(e) => setFormData({ ...formData, urgent_10k_interest_rate: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tenure (Days)</Label>
                <Input
                  type="number"
                  value={formData.urgent_10k_tenure_days}
                  onChange={(e) => setFormData({ ...formData, urgent_10k_tenure_days: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Minimum Score Required</Label>
                <Input
                  type="number"
                  value={formData.urgent_10k_min_score}
                  onChange={(e) => setFormData({ ...formData, urgent_10k_min_score: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Credit Limit Increment (%)</Label>
                <Input
                  type="number"
                  value={formData.urgent_10k_increment_percent}
                  onChange={(e) => setFormData({ ...formData, urgent_10k_increment_percent: parseInt(e.target.value) })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Increase after each successful repayment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier-1 Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Tier-1 Personal Loan</CardTitle>
                <CardDescription>Employee verified loan product settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Minimum Amount (₦)</Label>
                <Input
                  type="number"
                  value={formData.tier1_min_amount}
                  onChange={(e) => setFormData({ ...formData, tier1_min_amount: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Maximum Amount (₦)</Label>
                <Input
                  type="number"
                  value={formData.tier1_max_amount}
                  onChange={(e) => setFormData({ ...formData, tier1_max_amount: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Minimum Score Required</Label>
                <Input
                  type="number"
                  value={formData.tier1_min_score}
                  onChange={(e) => setFormData({ ...formData, tier1_min_score: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.tier1_interest_rate}
                  onChange={(e) => setFormData({ ...formData, tier1_interest_rate: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tenure (Days)</Label>
                <Input
                  type="number"
                  value={formData.tier1_tenure_days}
                  onChange={(e) => setFormData({ ...formData, tier1_tenure_days: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Search Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Percent className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Credit Search & General</CardTitle>
                <CardDescription>Credit search and verification settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Credit Search Fee (₦)</Label>
                <Input
                  type="number"
                  value={formData.credit_search_fee}
                  onChange={(e) => setFormData({ ...formData, credit_search_fee: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Credit Report Validity (Days)</Label>
                <Input
                  type="number"
                  value={formData.credit_report_validity_days}
                  onChange={(e) => setFormData({ ...formData, credit_report_validity_days: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Verification Link Validity (Hours)</Label>
                <Input
                  type="number"
                  value={formData.verification_link_validity_hours}
                  onChange={(e) => setFormData({ ...formData, verification_link_validity_hours: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Default Affiliate Commission (%)</Label>
                <Input
                  type="number"
                  value={formData.default_affiliate_commission}
                  onChange={(e) => setFormData({ ...formData, default_affiliate_commission: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}