import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Brain,
  Sliders,
  AlertTriangle,
  TrendingUp,
  Shield,
  Activity,
  Wallet,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function AdminMLScoring() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    enable_ml_scoring: true,
    ml_score_weight: 30,
    rule_score_weight: 70,
    component_weights: {
      transaction_analysis: 35,
      behavioral_patterns: 25,
      device_trust: 15,
      identity_consistency: 25
    },
    thresholds: {
      min_monthly_inflow: 30000,
      max_gambling_ratio: 0.1,
      min_account_age_months: 3,
      max_bounced_debits: 2,
      min_salary_consistency: 0.7,
      min_session_duration: 60,
      max_form_abandonment: 0.5,
      min_profile_completeness: 80
    },
    risk_flag_penalties: {
      vpn_detected: 10,
      multiple_devices: 5,
      gambling_detected: 15,
      bounced_debits: 20,
      inconsistent_location: 10,
      rapid_application: 5,
      low_balance_frequency: 10
    },
    bonus_factors: {
      salary_detected: 10,
      long_account_age: 5,
      consistent_login_pattern: 5,
      complete_profile: 5
    }
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
      const configs = await base44.entities.MLScoringConfig.filter({ config_key: 'default' });
      if (configs[0]) {
        setConfig(configs[0]);
        setFormData(prev => ({
          ...prev,
          ...configs[0],
          component_weights: { ...prev.component_weights, ...configs[0].component_weights },
          thresholds: { ...prev.thresholds, ...configs[0].thresholds },
          risk_flag_penalties: { ...prev.risk_flag_penalties, ...configs[0].risk_flag_penalties },
          bonus_factors: { ...prev.bonus_factors, ...configs[0].bonus_factors }
        }));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate weights sum to 100
    const componentSum = Object.values(formData.component_weights).reduce((a, b) => a + b, 0);
    if (componentSum !== 100) {
      toast.error(`Component weights must sum to 100 (currently ${componentSum})`);
      return;
    }

    if (formData.ml_score_weight + formData.rule_score_weight !== 100) {
      toast.error('ML and Rule weights must sum to 100');
      return;
    }

    setSaving(true);
    try {
      const data = {
        config_key: 'default',
        ...formData
      };

      if (config) {
        await base44.entities.MLScoringConfig.update(config.id, data);
      } else {
        await base44.entities.MLScoringConfig.create(data);
      }

      toast.success('ML Scoring configuration saved');
      await loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateComponentWeight = (key, value) => {
    setFormData(prev => ({
      ...prev,
      component_weights: { ...prev.component_weights, [key]: value }
    }));
  };

  const updateThreshold = (key, value) => {
    setFormData(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, [key]: parseFloat(value) || 0 }
    }));
  };

  const updatePenalty = (key, value) => {
    setFormData(prev => ({
      ...prev,
      risk_flag_penalties: { ...prev.risk_flag_penalties, [key]: parseInt(value) || 0 }
    }));
  };

  const updateBonus = (key, value) => {
    setFormData(prev => ({
      ...prev,
      bonus_factors: { ...prev.bonus_factors, [key]: parseInt(value) || 0 }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const componentSum = Object.values(formData.component_weights).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                ML Scoring Configuration
              </h1>
              <p className="text-gray-500 text-sm">Configure AI-enhanced credit scoring parameters</p>
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

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Enable/Disable & Main Weights */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Scoring Model Settings</CardTitle>
                <CardDescription>Enable ML scoring and configure weight distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable ML Scoring</p>
                <p className="text-sm text-gray-500">Use AI-enhanced scoring alongside rule-based scoring</p>
              </div>
              <Switch
                checked={formData.enable_ml_scoring}
                onCheckedChange={(v) => setFormData({ ...formData, enable_ml_scoring: v })}
              />
            </div>

            {formData.enable_ml_scoring && (
              <div className="border-t pt-6">
                <Label className="mb-4 block">Score Weight Distribution</Label>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Rule-Based Score</span>
                      <span className="font-semibold">{formData.rule_score_weight}%</span>
                    </div>
                    <Slider
                      value={[formData.rule_score_weight]}
                      onValueChange={([v]) => setFormData({
                        ...formData,
                        rule_score_weight: v,
                        ml_score_weight: 100 - v
                      })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>ML Score</span>
                      <span className="font-semibold">{formData.ml_score_weight}%</span>
                    </div>
                    <Slider
                      value={[formData.ml_score_weight]}
                      onValueChange={([v]) => setFormData({
                        ...formData,
                        ml_score_weight: v,
                        rule_score_weight: 100 - v
                      })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Final Score = (Rule Score × {formData.rule_score_weight}%) + (ML Score × {formData.ml_score_weight}%)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {formData.enable_ml_scoring && (
          <Tabs defaultValue="components" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
              <TabsTrigger value="penalties">Penalties</TabsTrigger>
              <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
            </TabsList>

            {/* Component Weights */}
            <TabsContent value="components">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Sliders className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">ML Score Components</CardTitle>
                      <CardDescription>
                        Weight each component of the ML score (must sum to 100)
                        <span className={`ml-2 font-semibold ${componentSum === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Current: {componentSum}%
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'transaction_analysis', label: 'Transaction Analysis', icon: Wallet, desc: 'Income, spending patterns, salary detection' },
                    { key: 'behavioral_patterns', label: 'Behavioral Patterns', icon: Activity, desc: 'Session duration, form completion, login patterns' },
                    { key: 'device_trust', label: 'Device Trust', icon: Shield, desc: 'Device consistency, VPN detection, location' },
                    { key: 'identity_consistency', label: 'Identity Consistency', icon: TrendingUp, desc: 'Profile completeness, document verification' }
                  ].map(item => (
                    <div key={item.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <span className="font-semibold">{formData.component_weights[item.key]}%</span>
                      </div>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                      <Slider
                        value={[formData.component_weights[item.key]]}
                        onValueChange={([v]) => updateComponentWeight(item.key, v)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Thresholds */}
            <TabsContent value="thresholds">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Scoring Thresholds</CardTitle>
                  <CardDescription>Minimum/maximum values for score calculations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Min Monthly Inflow (₦)</Label>
                      <Input
                        type="number"
                        value={formData.thresholds.min_monthly_inflow}
                        onChange={(e) => updateThreshold('min_monthly_inflow', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Min Account Age (months)</Label>
                      <Input
                        type="number"
                        value={formData.thresholds.min_account_age_months}
                        onChange={(e) => updateThreshold('min_account_age_months', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Max Bounced Debits</Label>
                      <Input
                        type="number"
                        value={formData.thresholds.max_bounced_debits}
                        onChange={(e) => updateThreshold('max_bounced_debits', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Min Salary Consistency (0-1)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={formData.thresholds.min_salary_consistency}
                        onChange={(e) => updateThreshold('min_salary_consistency', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Min Session Duration (sec)</Label>
                      <Input
                        type="number"
                        value={formData.thresholds.min_session_duration}
                        onChange={(e) => updateThreshold('min_session_duration', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Max Form Abandonment (0-1)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={formData.thresholds.max_form_abandonment}
                        onChange={(e) => updateThreshold('max_form_abandonment', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Min Profile Completeness (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.thresholds.min_profile_completeness}
                        onChange={(e) => updateThreshold('min_profile_completeness', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Max Gambling Ratio (0-1)</Label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={formData.thresholds.max_gambling_ratio}
                        onChange={(e) => updateThreshold('max_gambling_ratio', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Risk Penalties */}
            <TabsContent value="penalties">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Risk Flag Penalties</CardTitle>
                      <CardDescription>Points deducted when risk flags are detected</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(formData.risk_flag_penalties).map(([key, value]) => (
                      <div key={key}>
                        <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => updatePenalty(key, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bonuses */}
            <TabsContent value="bonuses">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Bonus Factors</CardTitle>
                      <CardDescription>Points added for positive indicators</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(formData.bonus_factors).map(([key, value]) => (
                      <div key={key}>
                        <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => updateBonus(key, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}