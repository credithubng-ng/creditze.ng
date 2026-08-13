import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function CreditSearchHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searches, setSearches] = useState([]);
  const [filteredSearches, setFilteredSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [bvnFilter, setBvnFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searches, statusFilter, bvnFilter, startDate, endDate, sortBy]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load all credit searches for admin, or user's own searches
      let searchData;
      if (currentUser.role === 'admin') {
        searchData = await base44.entities.CreditSearch.list('-created_date', 100);
      } else {
        searchData = await base44.entities.CreditSearch.filter(
          { user_id: currentUser.id },
          '-created_date',
          100
        );
      }

      // Enrich with user data if admin
      if (currentUser.role === 'admin') {
        const userIds = [...new Set(searchData.map(s => s.user_id))];
        const users = await Promise.all(
          userIds.map(id => base44.entities.User.filter({ id }))
        );
        const userMap = {};
        users.forEach(userArr => {
          if (userArr[0]) userMap[userArr[0].id] = userArr[0];
        });
        
        searchData = searchData.map(search => ({
          ...search,
          user: userMap[search.user_id]
        }));
      }

      // Enrich with KYC data for BVN
      const kycData = await Promise.all(
        searchData.map(search => 
          base44.entities.KYCProfile.filter({ user_id: search.user_id })
        )
      );
      
      searchData = searchData.map((search, i) => ({
        ...search,
        bvn: kycData[i]?.[0]?.bvn || 'N/A'
      }));

      setSearches(searchData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...searches];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.search_status === statusFilter);
    }

    // BVN filter
    if (bvnFilter) {
      filtered = filtered.filter(s => 
        s.bvn?.includes(bvnFilter)
      );
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(s => 
        new Date(s.created_date) >= new Date(startDate)
      );
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59);
      filtered = filtered.filter(s => 
        new Date(s.created_date) <= endDateTime
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'date_asc':
          return new Date(a.created_date) - new Date(b.created_date);
        case 'status_asc':
          return a.search_status.localeCompare(b.search_status);
        case 'status_desc':
          return b.search_status.localeCompare(a.search_status);
        case 'score_desc':
          return (b.bureau_score || 0) - (a.bureau_score || 0);
        case 'score_asc':
          return (a.bureau_score || 0) - (b.bureau_score || 0);
        default:
          return 0;
      }
    });

    setFilteredSearches(filtered);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setBvnFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
  };

  const getStatusBadge = (status) => {
    const styles = {
      successful: { bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      unsuccessful: { bg: 'bg-red-100 text-red-700', icon: XCircle },
      pending: { bg: 'bg-yellow-100 text-yellow-700', icon: Clock }
    };
    const config = styles[status] || styles.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.bg}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const downloadReport = (reportUrl) => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(createPageUrl(user?.role === 'admin' ? 'AdminDashboard' : 'Dashboard'))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-xl text-gray-900">Credit Search History</h1>
              <p className="text-sm text-gray-500">{filteredSearches.length} searches found</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
              Filters & Sorting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* BVN Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">BVN</label>
                <Input
                  placeholder="Search by BVN..."
                  value={bvnFilter}
                  onChange={(e) => setBvnFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                    <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                    <SelectItem value="status_asc">Status (A-Z)</SelectItem>
                    <SelectItem value="status_desc">Status (Z-A)</SelectItem>
                    <SelectItem value="score_desc">Score (High-Low)</SelectItem>
                    <SelectItem value="score_asc">Score (Low-High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {filteredSearches.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No credit searches found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSearches.map((search, index) => (
              <motion.div
                key={search.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-md hover:shadow-lg transition">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {getStatusBadge(search.search_status)}
                          {search.bureau_score && (
                            <Badge className="bg-blue-100 text-blue-700">
                              Score: {search.bureau_score}
                            </Badge>
                          )}
                          {search.payment_status === 'paid' && (
                            <Badge className="bg-green-100 text-green-700">
                              Paid ₦{search.fee_paid}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {user?.role === 'admin' && search.user && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="font-medium">User:</span>
                              <span>{search.user.full_name || search.user.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium">BVN:</span>
                            <span className="font-mono">{search.bvn}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(search.created_date), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                          {search.expiry_date && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="font-medium">Expires:</span>
                              <span>{format(new Date(search.expiry_date), 'MMM dd, yyyy')}</span>
                            </div>
                          )}
                        </div>

                        {search.failure_reason && (
                          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                            <span className="font-medium">Error:</span> {search.failure_reason}
                          </div>
                        )}

                        {search.payment_reference && (
                          <div className="text-xs text-gray-500">
                            Ref: {search.payment_reference}
                          </div>
                        )}
                      </div>

                      {search.report_url && (
                        <Button
                          size="sm"
                          onClick={() => downloadReport(search.report_url)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Report
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}