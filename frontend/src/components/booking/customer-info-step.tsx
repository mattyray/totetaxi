// frontend/src/components/booking/customer-info-step.tsx
'use client';

import { useEffect, useState } from 'react';
import { useBookingWizard } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CustomerInfoStep() {
  const { bookingData, updateBookingData, nextStep, errors, setError, clearError, isGuestMode } = useBookingWizard();
  const { isAuthenticated, user } = useAuthStore();
  
  // ✅ FIX: Check authentication status BEFORE any rendering logic
  useEffect(() => {
    if (isAuthenticated && !isGuestMode) {
      console.log('CustomerInfoStep - authenticated user detected, advancing immediately');
      nextStep();
    }
  }, [isAuthenticated, isGuestMode, nextStep]);

  // ✅ FIX: Don't render anything for authenticated users
  if (isAuthenticated && !isGuestMode) {
    return null;
  }

  const [formData, setFormData] = useState({
    first_name: bookingData.customer_info?.first_name || '',
    last_name: bookingData.customer_info?.last_name || '',
    email: bookingData.customer_info?.email || '',
    phone: bookingData.customer_info?.phone || '',
  });

  const handleFieldChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    updateBookingData({
      customer_info: newFormData
    });
    
    clearError(field);
  };

  const validateAndContinue = () => {
    let hasErrors = false;

    if (!formData.first_name.trim()) {
      setError('first_name', 'First name is required');
      hasErrors = true;
    }
    
    if (!formData.last_name.trim()) {
      setError('last_name', 'Last name is required');
      hasErrors = true;
    }
    
    if (!formData.email.trim()) {
      setError('email', 'Email is required');
      hasErrors = true;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('email', 'Please enter a valid email address');
      hasErrors = true;
    }
    
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      setError('phone', 'Phone number is required');
      hasErrors = true;
    } else if (cleanPhone.length < 10) {
      setError('phone', 'Phone number must be at least 10 digits');
      hasErrors = true;
    }

    if (!hasErrors) {
      nextStep();
    }
  };

  const canContinue = 
    formData.first_name.trim() &&
    formData.last_name.trim() &&
    formData.email.trim() &&
    formData.phone.replace(/\D/g, '').length >= 10;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-lg font-medium text-navy-900 mb-2">Contact Information</h3>
        <p className="text-navy-700">
          We'll use this information to coordinate your pickup and delivery.
        </p>
      </div>

      <Card variant="elevated" className="p-8">
        <CardContent className="p-0">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => handleFieldChange('first_name', e.target.value)}
                error={errors.first_name}
                placeholder="John"
                required
                realTimeValidation={false}
              />
              
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => handleFieldChange('last_name', e.target.value)}
                error={errors.last_name}
                placeholder="Smith"
                required
                realTimeValidation={false}
              />
            </div>
            
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value.toLowerCase())}
              error={errors.email}
              placeholder="john.smith@email.com"
              helper="We'll send confirmation and tracking updates to this email"
              required
              realTimeValidation={true}
            />
            
            <Input
              label="Phone Number"
              type="tel"
              mask="phone"
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              error={errors.phone}
              placeholder="(555) 123-4567"
              helper="For pickup and delivery coordination"
              required
              realTimeValidation={true}
            />
          </div>
        </CardContent>
      </Card>

      <Card variant="default" className="border-gold-200 bg-gold-50 p-6">
        <CardContent className="p-0">
          <div className="flex items-start">
            <div className="text-gold-600 mr-3 mt-1">🔒</div>
            <div>
              <h4 className="font-medium text-navy-900 mb-1">Privacy & Security</h4>
              <p className="text-sm text-navy-700">
                Your information is encrypted and secure. We'll only use it to provide your ToteTaxi service 
                and send important updates about your booking. We never sell or share your personal data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-navy-600">
          Already have an account? 
          <button className="text-navy-900 hover:underline ml-1">
            Sign in for faster checkout
          </button>
        </p>
      </div>

      <div className="flex justify-end">
        <Button 
          variant="primary" 
          onClick={validateAndContinue}
          disabled={!canContinue}
          size="lg"
        >
          Continue to Review & Payment →
        </Button>
      </div>
    </div>
  );
}