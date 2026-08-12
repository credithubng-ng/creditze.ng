import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Search,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Eye,
  Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [kycProfiles, setKycProfiles] = useState({});
  const [creditLimits, setCreditLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
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
      const [userData, kycData, limitData] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.KYCProfile.list(),
        base44.entities.UserCreditLimit.list()
      ]);

      setUsers(userData);

      const kycMap = {};
      kycData.forEach(k => { kycMap[k.user_id] = k; });
      setKycProfiles(kycMap);

      const limitMap = {};
      limitData.forEach(l => { limitMap[l.user_id] = l; });
      setCreditLimits(limitMap);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFreeze = async (userId) => {
    const limit = creditLimits[userId];
    if (limit) {
      await base44.entities.UserCreditLimit.update(limit.id, {
        is_frozen: !limit.is_frozen,
        freeze_reason: !limit.is_frozen ? 'Admin action' : null,
        freeze_date: !limit.is_frozen ? new Date().toISOString() : null
      });
      await loadData();
    }
  };

  const filteredUsers = users.filter(user => {
    const kyc = kycProfiles[user.id];
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kyc?.phone_number?.includes(searchQuery);
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'verified') return matchesSearch && kyc?.kyc_status === 'verified';
    if (statusFilter === 'unverified') return matchesSearch && kyc?.kyc_status !== 'verified';
    if (statusFilter === 'frozen') return matchesSearch && creditLimits[user.id]?.is_frozen;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('AdminDashboard')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm">{users.length} total users</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => {
                    const kyc = kycProfiles[user.id];
                    const limit = creditLimits[user.id];
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="font-semibold text-emerald-600">
                                {user.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.full_name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {kyc?.kyc_status === 'verified' ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                          ) : kyc ? (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not Started</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ₦{(limit?.current_limit || 10000).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {format(new Date(user.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {limit?.is_frozen ? (
                            <Badge variant="destructive">Frozen</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(createPageUrl(`AdminUserDetail?id=${user.id}`))}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleFreeze(user.id)}>
                                <Ban className="w-4 h-4 mr-2" /> 
                                {limit?.is_frozen ? 'Unfreeze Account' : 'Freeze Account'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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