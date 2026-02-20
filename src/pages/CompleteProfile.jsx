import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Phone, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    phone_number: '',
    date_of_birth: '',
    gender: '',
    state_of_residence: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check if profile is already complete
      if (currentUser.phone_number && currentUser.date_of_birth && currentUser.gender && currentUser.state_of_residence) {
        // Profile already complete, redirect to dashboard
        navigate(createPageUrl('Dashboard'));
        return;
      }

      // Pre-fill existing data
      setFormData({
        phone_number: currentUser.phone_number || '',
        date_of_birth: currentUser.date_of_birth || '',
        gender: currentUser.gender || '',
        state_of_residence: currentUser.state_of_residence || ''
      });
    } catch (error) {
      console.error('Error loading user:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.phone_number || formData.phone_number.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!formData.date_of_birth) {
      setError('Please enter your date of birth');
      return;
    }
    if (!formData.gender) {
      setError('Please select your gender');
      return;
    }
    if (!formData.state_of_residence) {
      setError('Please select your state of residence');
      return;
    }

    // Validate age (must be 18+)
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    if (age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))) {
      setError('You must be at least 18 years old to use this service');
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe(formData);
      navigate(createPageUrl('Dashboard'));
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full mb-4">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Creditze</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">We need a few details to get you started</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <User className="w-7 h-7 text-emerald-600" />
            </div>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>This helps us personalize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex items-center px-3 bg-gray-100 rounded-lg text-gray-600 font-medium">
                    +234
                  </div>
                  <Input
                    type="tel"
                    placeholder="8012345678"
                    value={formData.phone_number}
                    onChange={(e) => handleChange('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  className="mt-1"
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">You must be at least 18 years old</p>
              </div>

              <div>
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>State of Residence</Label>
                <Select value={formData.state_of_residence} onValueChange={(v) => handleChange('state_of_residence', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}