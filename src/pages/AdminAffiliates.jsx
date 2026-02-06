import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Plus,
  UserCheck,
  MoreVertical,
  Pencil,
  Ban,
  CheckCircle2,
  Loader2,
  Copy,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';

export default function AdminAffiliates() {
  const navigate = useNavigate();
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    commission_rate: 5
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
      await loadAffiliates();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadAffiliates = async () => {
    try {
      const data = await base44.entities.Affiliate.list('-created_date');
      setAffiliates(data);
    } catch (error) {
      console.error('Error loading affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAffiliateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TB00';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const openDialog = (affiliate = null) => {
    if (affiliate) {
      setEditingAffiliate(affiliate);
      setFormData({
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone || '',
        bank_name: affiliate.bank_name || '',
        account_number: affiliate.account_number || '',
        account_name: affiliate.account_name || '',
        commission_rate: affiliate.commission_rate || 5
      });
    } else {
      setEditingAffiliate(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        commission_rate: 5
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) return;

    setSaving(true);
    try {
      const data = {
        ...formData,
        commission_rate: parseFloat(formData.commission_rate)
      };

      if (editingAffiliate) {
        await base44.entities.Affiliate.update(editingAffiliate.id, data);
      } else {
        await base44.entities.Affiliate.create({
          ...data,
          affiliate_code: generateAffiliateCode(),
          status: 'active'
        });
      }

      await loadAffiliates();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving affiliate:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (affiliate) => {
    try {
      await base44.entities.Affiliate.update(affiliate.id, {
        status: affiliate.status === 'active' ? 'suspended' : 'active'
      });
      await loadAffiliates();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const copyLink = (code) => {
    navigator.clipboard.writeText(`https://getawin.ng/apply?ref=${code}`);
    toast.success('Referral link copied!');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Affiliate Management</h1>
              <p className="text-gray-500 text-sm">{affiliates.length} affiliates</p>
            </div>
          </div>
          <Button onClick={() => openDialog()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Add Affiliate
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Affiliates</p>
              <p className="text-2xl font-bold text-gray-900">{affiliates.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">
                {affiliates.filter(a => a.status === 'active').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Referrals</p>
              <p className="text-2xl font-bold text-gray-900">
                {affiliates.reduce((sum, a) => sum + (a.total_referrals || 0), 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                ₦{affiliates.reduce((sum, a) => sum + (a.total_earnings || 0), 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : affiliates.length === 0 ? (
              <div className="p-12 text-center">
                <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No affiliates yet</h3>
                <p className="text-gray-500 mb-6">Add your first affiliate partner</p>
                <Button onClick={() => openDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" /> Add Affiliate
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map(affiliate => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{affiliate.name}</p>
                          <p className="text-sm text-gray-500">{affiliate.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {affiliate.affiliate_code}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyLink(affiliate.affiliate_code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {affiliate.commission_rate}%
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{affiliate.total_referrals || 0}</p>
                          <p className="text-xs text-gray-500">{affiliate.total_conversions || 0} converted</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">₦{(affiliate.total_earnings || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">₦{(affiliate.pending_earnings || 0).toLocaleString()} pending</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          affiliate.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }>
                          {affiliate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog(affiliate)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(affiliate)}>
                              {affiliate.status === 'active' ? (
                                <><Ban className="w-4 h-4 mr-2" /> Suspend</>
                              ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Activate</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAffiliate ? 'Edit Affiliate' : 'Add New Affiliate'}</DialogTitle>
            <DialogDescription>
              {editingAffiliate ? 'Update affiliate details' : 'Add a new affiliate partner'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+234..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                className="mt-1"
                min="0"
                max="100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Account Name</Label>
              <Input
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingAffiliate ? 'Update' : 'Add'} Affiliate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}