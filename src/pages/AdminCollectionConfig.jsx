import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Bell,
  Clock,
  AlertTriangle,
  CreditCard,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AdminCollectionConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    reminder_days_before_due: '3, 1',
    overdue_reminder_days: '1, 3, 7, 14, 21, 30',
    days_to_mark_overdue: 1,
    days_to_mark_defaulted: 90,
    demand_letter_days: '30, 60',
    final_notice_days: 75,
    direct_debit_retry_days: 3,
    max_direct_debit_retries: 3,
    enable_auto_reminders: true,
    enable_auto_direct_debit: true
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
      const configs = await base44.entities.CollectionConfig.filter({ config_key: 'default' });
      if (configs[0]) {
        setConfig(configs[0]);
        setFormData({
          reminder_days_before_due: configs[0].reminder_days_before_due?.join(', ') || '3, 1',
          overdue_reminder_days: configs[0].overdue_reminder_days?.join(', ') || '1, 3, 7, 14, 21, 30',
          days_to_mark_overdue: configs[0].days_to_mark_overdue || 1,
          days_to_mark_defaulted: configs[0].days_to_mark_defaulted || 90,
          demand_letter_days: configs[0].demand_letter_days?.join(', ') || '30, 60',
          final_notice_days: configs[0].final_notice_days || 75,
          direct_debit_retry_days: configs[0].direct_debit_retry_days || 3,
          max_direct_debit_retries: configs[0].max_direct_debit_retries || 3,
          enable_auto_reminders: configs[0].enable_auto_reminders !== false,
          enable_auto_direct_debit: configs[0].enable_auto_direct_debit !== false
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
        config_key: 'default',
        reminder_days_before_due: formData.reminder_days_before_due.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)),
        overdue_reminder_days: formData.overdue_reminder_days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)),
        days_to_mark_overdue: parseInt(formData.days_to_mark_overdue),
        days_to_mark_defaulted: parseInt(formData.days_to_mark_defaulted),
        demand_letter_days: formData.demand_letter_days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)),
        final_notice_days: parseInt(formData.final_notice_days),
        direct_debit_retry_days: parseInt(formData.direct_debit_retry_days),
        max_direct_debit_retries: parseInt(formData.max_direct_debit_retries),
        enable_auto_reminders: formData.enable_auto_reminders,
        enable_auto_direct_debit: formData.enable_auto_direct_debit
      };

      if (config) {
        await base44.entities.CollectionConfig.update(config.id, data);
      } else {
        await base44.entities.CollectionConfig.create(data);
      }

      toast.success('Collection rules saved successfully');
      await loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save collection rules');
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
            <Link to={createPageUrl('AdminCollections')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Collection Rules</h1>
              <p className="text-gray-500 text-sm">Configure automated collection settings</p>
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
        {/* Automation Toggles */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Automation Settings</CardTitle>
                <CardDescription>Enable or disable automated collection actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automated Reminders</p>
                <p className="text-sm text-gray-500">Automatically send payment reminders via email</p>
              </div>
              <Switch
                checked={formData.enable_auto_reminders}
                onCheckedChange={(v) => setFormData({ ...formData, enable_auto_reminders: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automated Direct Debit</p>
                <p className="text-sm text-gray-500">Automatically attempt direct debit on due dates</p>
              </div>
              <Switch
                checked={formData.enable_auto_direct_debit}
                onCheckedChange={(v) => setFormData({ ...formData, enable_auto_direct_debit: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pre-Due Reminders */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Pre-Due Reminders</CardTitle>
                <CardDescription>Send reminders before the loan due date</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Days Before Due Date to Send Reminders</Label>
              <Input
                value={formData.reminder_days_before_due}
                onChange={(e) => setFormData({ ...formData, reminder_days_before_due: e.target.value })}
                placeholder="3, 1"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list. e.g. "3, 1" will send reminders 3 days and 1 day before due date</p>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Overdue Settings</CardTitle>
                <CardDescription>Configure when loans become overdue and reminder schedule</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Days After Due Date to Mark as Overdue</Label>
              <Input
                type="number"
                value={formData.days_to_mark_overdue}
                onChange={(e) => setFormData({ ...formData, days_to_mark_overdue: e.target.value })}
                className="mt-1 w-32"
              />
            </div>
            <div>
              <Label>Overdue Reminder Schedule (Days After Due Date)</Label>
              <Input
                value={formData.overdue_reminder_days}
                onChange={(e) => setFormData({ ...formData, overdue_reminder_days: e.target.value })}
                placeholder="1, 3, 7, 14, 21, 30"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of days after due date to send overdue reminders</p>
            </div>
          </CardContent>
        </Card>

        {/* Escalation Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Escalation Rules</CardTitle>
                <CardDescription>Configure demand letters, final notices, and default rules</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Days Overdue to Send Demand Letters</Label>
              <Input
                value={formData.demand_letter_days}
                onChange={(e) => setFormData({ ...formData, demand_letter_days: e.target.value })}
                placeholder="30, 60"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated. e.g. "30, 60" sends demand letters at 30 and 60 days overdue</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Days Overdue for Final Notice</Label>
                <Input
                  type="number"
                  value={formData.final_notice_days}
                  onChange={(e) => setFormData({ ...formData, final_notice_days: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Days Overdue to Mark as Defaulted</Label>
                <Input
                  type="number"
                  value={formData.days_to_mark_defaulted}
                  onChange={(e) => setFormData({ ...formData, days_to_mark_defaulted: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Direct Debit Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Direct Debit Settings</CardTitle>
                <CardDescription>Configure automatic payment collection via direct debit</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Days Between Retry Attempts</Label>
                <Input
                  type="number"
                  value={formData.direct_debit_retry_days}
                  onChange={(e) => setFormData({ ...formData, direct_debit_retry_days: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Maximum Retry Attempts</Label>
                <Input
                  type="number"
                  value={formData.max_direct_debit_retries}
                  onChange={(e) => setFormData({ ...formData, max_direct_debit_retries: e.target.value })}
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