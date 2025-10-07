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
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// Phone number formatting utility
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '');
  
  // Format as (XXX)XXX-XXXX
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)})${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)})${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

// Extract just numbers for API
const unformatPhoneNumber = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

export default function SettingsPage() {
  const { user, customerProfile, isAuthenticated, updateProfile } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize phone from customer profile
  useEffect(() => {
    if (customerProfile?.phone) {
      setPhone(formatPhoneNumber(customerProfile.phone));
    }
  }, [customerProfile]);

  // Check if phone has changed
  useEffect(() => {
    if (!customerProfile) return;
    
    const currentPhone = unformatPhoneNumber(phone);
    const originalPhone = customerProfile.phone?.replace(/\D/g, '') || '';
    
    setHasChanges(currentPhone !== originalPhone && currentPhone.length === 10);
  }, [phone, customerProfile]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiClient.patch('/api/customer/profile/', {
        phone: phoneNumber
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
      
      if (data.customer_profile) {
        updateProfile(data.customer_profile);
      }
      
      setShowSuccess(true);
      setHasChanges(false);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to update phone number. Please try again.';
      alert(errorMessage);
    },
  });

  const handleSave = () => {
    if (!hasChanges) return;
    
    const phoneNumbers = unformatPhoneNumber(phone);
    
    // Validate phone number
    if (phoneNumbers.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }
    
    updateProfileMutation.mutate(phoneNumbers);
  };

  const handleReset = () => {
    if (customerProfile?.phone) {
      setPhone(formatPhoneNumber(customerProfile.phone));
    } else {
      setPhone('');
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
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="mb-8">
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
              Manage your account information
            </p>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                <p className="text-green-800 font-medium">Phone number updated successfully!</p>
              </CardContent>
            </Card>
          )}

          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold text-navy-900">Personal Information</h2>
              <p className="text-sm text-navy-600 mt-1">
                Your account details
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
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(123)456-7890"
                  maxLength={13}
                  className="focus:ring-navy-500 focus:border-navy-500"
                />
                <p className="text-xs text-navy-500 mt-1">
                  Format: (123)456-7890
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-navy-600">
                  <strong>Need to change your name or email?</strong>
                  <br />
                  Contact support at{' '}
                  <a 
                    href="mailto:support@totetaxi.com" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    support@totetaxi.com
                  </a>
                </p>
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
              Reset
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
        </div>
      </div>
    </MainLayout>
  );
}