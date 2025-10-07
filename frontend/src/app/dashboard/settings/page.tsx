// frontend/src/app/dashboard/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { user, customerProfile, isAuthenticated, updateProfile } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    phone: '',
    preferred_pickup_time: 'morning' as 'morning' | 'morning_specific' | 'no_time_preference',
    email_notifications: true,
    sms_notifications: false,
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data from customer profile
  useEffect(() => {
    if (customerProfile) {
      setFormData({
        phone: customerProfile.phone || '',
        preferred_pickup_time: customerProfile.preferred_pickup_time || 'morning',
        email_notifications: customerProfile.email_notifications ?? true,
        sms_notifications: customerProfile.sms_notifications ?? false,
      });
    }
  }, [customerProfile]);

  // Check if form has changes
  useEffect(() => {
    if (!customerProfile) return;
    
    const changed = 
      formData.phone !== (customerProfile.phone || '') ||
      formData.preferred_pickup_time !== customerProfile.preferred_pickup_time ||
      formData.email_notifications !== customerProfile.email_notifications ||
      formData.sms_notifications !== customerProfile.sms_notifications;
    
    setHasChanges(changed);
  }, [formData, customerProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.patch('/api/customer/profile/', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Update all relevant queries
      queryClient.invalidateQueries({ queryKey: ['customer', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
      
      // Update auth store with new profile data
      if (data.customer_profile) {
        updateProfile(data.customer_profile);
      }
      
      // Show success message
      setShowSuccess(true);
      setHasChanges(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to update settings. Please try again.';
      alert(errorMessage);
    },
  });

  const handleSave = () => {
    if (!hasChanges) return;
    updateProfileMutation.mutate(formData);
  };

  const handleReset = () => {
    if (customerProfile) {
      setFormData({
        phone: customerProfile.phone || '',
        preferred_pickup_time: customerProfile.preferred_pickup_time || 'morning',
        email_notifications: customerProfile.email_notifications ?? true,
        sms_notifications: customerProfile.sms_notifications ?? false,
      });
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="mb-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-3xl font-serif font-bold text-navy-900">
                Account Settings
              </h1>
              <p className="text-navy-600 mt-1">
                Manage your profile and preferences
              </p>
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                <p className="text-green-800 font-medium">Settings updated successfully!</p>
              </CardContent>
            </Card>
          )}

          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold text-navy-900">Personal Information</h2>
              <p className="text-sm text-navy-600 mt-1">
                Your basic account details
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    First Name
                  </label>
                  <Input
                    value={user.first_name || ''}
                    disabled
                    className="bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={user.last_name || ''}
                    disabled
                    className="bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Email Address
                </label>
                <Input
                  value={user.email || ''}
                  disabled
                  className="bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-navy-500 mt-1">
                  Contact support to change your name or email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(123) 456-7890"
                  className="focus:ring-navy-500 focus:border-navy-500"
                />
                <p className="text-xs text-navy-500 mt-1">
                  Used for booking confirmations and updates
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Booking Preferences */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold text-navy-900">Booking Preferences</h2>
              <p className="text-sm text-navy-600 mt-1">
                Set your default preferences for future bookings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Preferred Pickup Time
                </label>
                <Select
                  value={formData.preferred_pickup_time}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    preferred_pickup_time: e.target.value as typeof formData.preferred_pickup_time
                  })}
                  options={[
                    { value: 'morning', label: '8 AM - 11 AM' },
                    { value: 'morning_specific', label: 'Specific 1-hour window' },
                    { value: 'no_time_preference', label: 'No time preference' },
                  ]}
                  className="focus:ring-navy-500 focus:border-navy-500"
                />
                <p className="text-xs text-navy-500 mt-1">
                  This will be pre-selected when booking
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold text-navy-900">Notifications</h2>
              <p className="text-sm text-navy-600 mt-1">
                Choose how you want to receive updates
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <label className="font-medium text-navy-900 block">
                    Email Notifications
                  </label>
                  <p className="text-sm text-navy-600 mt-1">
                    Receive booking confirmations, updates, and reminders via email
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      email_notifications: !formData.email_notifications 
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.email_notifications ? 'bg-navy-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.email_notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between pt-4 border-t border-gray-200">
                <div className="flex-1">
                  <label className="font-medium text-navy-900 block">
                    SMS Notifications
                  </label>
                  <p className="text-sm text-navy-600 mt-1">
                    Receive important updates via text message
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      sms_notifications: !formData.sms_notifications 
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.sms_notifications ? 'bg-navy-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.sms_notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold text-navy-900">Account Status</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy-900">Membership Tier</p>
                  <p className="text-sm text-navy-600 mt-1">
                    {customerProfile?.is_vip 
                      ? 'You have VIP access with priority scheduling'
                      : `Book ${3 - (customerProfile?.total_bookings || 0)} more moves to unlock VIP status`
                    }
                  </p>
                </div>
                {customerProfile?.is_vip ? (
                  <span className="px-4 py-2 bg-gold-100 text-gold-800 rounded-full text-sm font-semibold">
                    VIP Member
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-navy-100 text-navy-800 rounded-full text-sm font-semibold">
                    Standard
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || updateProfileMutation.isPending}
            >
              Reset Changes
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges || updateProfileMutation.isPending}
              className="min-w-[150px]"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* Help Text */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-navy-700">
                <strong>Need help?</strong> Contact our support team at{' '}
                <a 
                  href="mailto:support@totetaxi.com" 
                  className="text-blue-600 hover:underline font-medium"
                >
                  support@totetaxi.com
                </a>
                {' '}or call{' '}
                <a 
                  href="tel:+15551234567" 
                  className="text-blue-600 hover:underline font-medium"
                >
                  (555) 123-4567
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}