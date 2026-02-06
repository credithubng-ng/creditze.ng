import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  TrendingUp, 
  Users,
  CheckCircle2,
  Pause,
  Play,
  BarChart3,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminABTests() {
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        window.location.href = createPageUrl('Dashboard');
        return;
      }
      await loadData();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const [testsData, assignmentsData] = await Promise.all([
      base44.entities.ABTestConfig.list('-created_date'),
      base44.entities.ABTestAssignment.list()
    ]);
    setTests(testsData);
    setAssignments(assignmentsData);
  };

  const calculateTestMetrics = (test) => {
    const testAssignments = assignments.filter(a => a.test_id === test.id);
    const totalAssigned = testAssignments.length;
    const totalConverted = testAssignments.filter(a => a.converted).length;
    const conversionRate = totalAssigned > 0 ? (totalConverted / totalAssigned * 100).toFixed(1) : 0;

    const variantMetrics = {};
    test.variants?.forEach(variant => {
      const variantAssignments = testAssignments.filter(a => a.variant_id === variant.variant_id);
      const variantConverted = variantAssignments.filter(a => a.converted).length;
      variantMetrics[variant.variant_id] = {
        assigned: variantAssignments.length,
        converted: variantConverted,
        conversionRate: variantAssignments.length > 0 
          ? (variantConverted / variantAssignments.length * 100).toFixed(1) 
          : 0
      };
    });

    return { totalAssigned, totalConverted, conversionRate, variantMetrics };
  };

  const toggleTestStatus = async (test) => {
    const newStatus = test.status === 'active' ? 'paused' : 'active';
    await base44.entities.ABTestConfig.update(test.id, { status: newStatus });
    await loadData();
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-emerald-100 text-emerald-700',
      paused: 'bg-amber-100 text-amber-700',
      completed: 'bg-blue-100 text-blue-700'
    };
    return styles[status] || styles.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-900">A/B Tests</h1>
              <p className="text-gray-500 text-sm">Optimize loan offers with data-driven experiments</p>
            </div>
          </div>
          <Link to={createPageUrl('AdminCreateABTest')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> New Test
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {tests.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No A/B Tests Yet</h3>
              <p className="text-gray-500 mb-6">Create your first test to optimize loan offers</p>
              <Link to={createPageUrl('AdminCreateABTest')}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" /> Create Test
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => {
              const metrics = calculateTestMetrics(test);
              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-0 shadow-md hover:shadow-lg transition">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">{test.test_name}</CardTitle>
                            <Badge className={getStatusBadge(test.status)}>
                              {test.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {test.loan_type === 'all' ? 'All loan types' : test.loan_type}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleTestStatus(test)}
                            disabled={test.status === 'completed'}
                          >
                            {test.status === 'active' ? (
                              <><Pause className="w-4 h-4 mr-1" /> Pause</>
                            ) : (
                              <><Play className="w-4 h-4 mr-1" /> Resume</>
                            )}
                          </Button>
                          <Link to={createPageUrl(`AdminABTestDetails?id=${test.id}`)}>
                            <Button variant="outline" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">Participants</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">{metrics.totalAssigned}</div>
                          <div className="text-xs text-gray-500">of {test.target_sample_size}</div>
                        </div>
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-700">Conversions</span>
                          </div>
                          <div className="text-2xl font-bold text-emerald-700">{metrics.totalConverted}</div>
                          <div className="text-xs text-emerald-600">{metrics.conversionRate}%</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-blue-700">Progress</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-700">
                            {test.target_sample_size > 0 
                              ? Math.round((metrics.totalAssigned / test.target_sample_size) * 100)
                              : 0}%
                          </div>
                          <div className="text-xs text-blue-600">complete</div>
                        </div>
                      </div>

                      {/* Variant Performance */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Variant Performance</p>
                        {test.variants?.map((variant) => {
                          const vMetrics = metrics.variantMetrics[variant.variant_id] || {};
                          return (
                            <div key={variant.variant_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{variant.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({variant.traffic_allocation}% traffic)
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {variant.strategy?.interest_rate_adjustment} rates, 
                                  {' '}{variant.strategy?.amount_adjustment} amounts
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  {vMetrics.conversionRate || 0}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  {vMetrics.converted || 0} / {vMetrics.assigned || 0}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}