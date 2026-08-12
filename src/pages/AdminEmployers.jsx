import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, 
  Plus,
  Building2,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminEmployers() {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    approved_domains: '',
    email_templates: '',
    max_loan_amount: 500000,
    status: 'active'
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
      await loadEmployers();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadEmployers = async () => {
    try {
      const data = await base44.entities.Tier1Employer.list('-created_date');
      setEmployers(data);
    } catch (error) {
      console.error('Error loading employers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (employer = null) => {
    if (employer) {
      setEditingEmployer(employer);
      setFormData({
        company_name: employer.company_name,
        approved_domains: employer.approved_domains?.join(', ') || '',
        email_templates: employer.email_templates?.join(', ') || '',
        max_loan_amount: employer.max_loan_amount || 500000,
        status: employer.status || 'active'
      });
    } else {
      setEditingEmployer(null);
      setFormData({
        company_name: '',
        approved_domains: '',
        email_templates: 'firstname.lastname',
        max_loan_amount: 500000,
        status: 'active'
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.company_name || !formData.approved_domains) return;

    setSaving(true);
    try {
      const data = {
        company_name: formData.company_name,
        approved_domains: formData.approved_domains.split(',').map(d => d.trim()),
        email_templates: formData.email_templates.split(',').map(t => t.trim()),
        max_loan_amount: parseInt(formData.max_loan_amount),
        status: formData.status
      };

      if (editingEmployer) {
        await base44.entities.Tier1Employer.update(editingEmployer.id, data);
      } else {
        await base44.entities.Tier1Employer.create(data);
      }

      await loadEmployers();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving employer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this employer?')) return;
    
    try {
      await base44.entities.Tier1Employer.delete(id);
      await loadEmployers();
    } catch (error) {
      console.error('Error deleting employer:', error);
    }
  };

  const toggleStatus = async (employer) => {
    try {
      await base44.entities.Tier1Employer.update(employer.id, {
        status: employer.status === 'active' ? 'inactive' : 'active'
      });
      await loadEmployers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
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
              <h1 className="text-xl font-bold text-gray-900">Tier-1 Employers</h1>
              <p className="text-gray-500 text-sm">{employers.length} employers</p>
            </div>
          </div>
          <Button onClick={() => openDialog()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Add Employer
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : employers.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No employers yet</h3>
              <p className="text-gray-500 mb-6">Add your first Tier-1 employer to get started</p>
              <Button onClick={() => openDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Add Employer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employers.map(employer => (
              <Card key={employer.id} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-600">
                          {employer.company_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{employer.company_name}</h3>
                        <Badge className={employer.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                          {employer.status}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(employer)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(employer)}>
                          {employer.status === 'active' ? (
                            <><XCircle className="w-4 h-4 mr-2" /> Deactivate</>
                          ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(employer.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Domains:</span>
                      <p className="font-medium">{employer.approved_domains?.join(', ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Loan:</span>
                      <p className="font-medium">₦{employer.max_loan_amount?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployer ? 'Edit Employer' : 'Add New Employer'}</DialogTitle>
            <DialogDescription>
              {editingEmployer ? 'Update employer details' : 'Add a new Tier-1 employer to the system'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Google"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Approved Email Domains</Label>
              <Input
                value={formData.approved_domains}
                onChange={(e) => setFormData({ ...formData, approved_domains: e.target.value })}
                placeholder="e.g. google.com, google.ng"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of domains</p>
            </div>
            <div>
              <Label>Email Templates</Label>
              <Input
                value={formData.email_templates}
                onChange={(e) => setFormData({ ...formData, email_templates: e.target.value })}
                placeholder="e.g. firstname.lastname, firstinitiallastname"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Accepted email format patterns</p>
            </div>
            <div>
              <Label>Maximum Loan Amount (₦)</Label>
              <Input
                type="number"
                value={formData.max_loan_amount}
                onChange={(e) => setFormData({ ...formData, max_loan_amount: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
              {editingEmployer ? 'Update' : 'Add'} Employer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}