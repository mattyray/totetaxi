'use client';

import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CustomerInfoStep() {
  const { bookingData, updateBookingData, nextStep, errors, setError, clearError } = useBookingWizard();

  const handleFieldChange = (field: string, value: string) => {
    updateBookingData({
      customer_info: {
        first_name: bookingData.customer_info?.first_name || '',
        last_name: bookingData.customer_info?.last_name || '',
        email: bookingData.customer_info?.email || '',
        phone: bookingData.customer_info?.phone || '',
        ...bookingData.customer_info,
        [field]: value
      }
    });
    clearError(field);
  };

  const validateAndContinue = () => {
    let hasErrors = false;

    // Validate required fields
    if (!bookingData.customer_info?.first_name) {
      setError('first_name', 'First name is required');
      hasErrors = true;
    }
    if (!bookingData.customer_info?.last_name) {
      setError('last_name', 'Last name is required');
      hasErrors = true;
    }
    if (!bookingData.customer_info?.email) {
      setError('email', 'Email is required');
      hasErrors = true;
    } else if (!/\S+@\S+\.\S+/.test(bookingData.customer_info.email)) {
      setError('email', 'Please enter a valid email address');
      hasErrors = true;
    }
    if (!bookingData.customer_info?.phone) {
      setError('phone', 'Phone number is required');
      hasErrors = true;
    } else if (!/^[\+]?[1]?[-\s\.]?[\(]?[0-9]{3}[\)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/.test(bookingData.customer_info.phone)) {
      setError('phone', 'Please enter a valid phone number');
      hasErrors = true;
    }

    if (!hasErrors) {
      nextStep();
    }
  };

  const canContinue = 
    bookingData.customer_info?.first_name &&
    bookingData.customer_info?.last_name &&
    bookingData.customer_info?.email &&
    bookingData.customer_info?.phone;

  return (
    <div className="space-y-6">
      {/* Information Card */}
      <div className="text-center py-4">
        <h3 className="text-lg font-medium text-navy-900 mb-2">Contact Information</h3>
        <p className="text-navy-700">
          We'll use this information to coordinate your pickup and delivery.
        </p>
      </div>

      {/* Customer Info Form */}
      <Card variant="elevated">
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={bookingData.customer_info?.first_name || ''}
                onChange={(e) => handleFieldChange('first_name', e.target.value)}
                error={errors.first_name}
                placeholder="John"
                required
              />
              
              <Input
                label="Last Name"
                value={bookingData.customer_info?.last_name || ''}
                onChange={(e) => handleFieldChange('last_name', e.target.value)}
                error={errors.last_name}
                placeholder="Smith"
                required
              />
            </div>
            
            <Input
              label="Email Address"
              type="email"
              value={bookingData.customer_info?.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              error={errors.email}
              placeholder="john.smith@email.com"
              helper="We'll send confirmation and tracking updates to this email"
              required
            />
            
            <Input
              label="Phone Number"
              type="tel"
              value={bookingData.customer_info?.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              error={errors.phone}
              placeholder="(555) 123-4567"
              helper="For pickup and delivery coordination"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card variant="default" className="border-gold-200 bg-gold-50">
        <CardContent>
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

      {/* VIP Program Signup */}
      <Card variant="luxury">
        <CardContent>
          <div className="text-center">
            <h4 className="font-serif text-lg font-bold text-navy-900 mb-2">
              Join ToteTaxi VIP
            </h4>
            <p className="text-navy-700 text-sm mb-4">
              Get priority scheduling, exclusive pricing, and seasonal storage benefits.
            </p>
            <label className="flex items-center justify-center">
              <input
                type="checkbox"
                className="mr-2"
                // This could be stored in booking data if you want to track VIP signups
              />
              <span className="text-sm text-navy-900">
                Yes, I want to join ToteTaxi VIP (free to join)
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Account Creation Notice */}
      <div className="text-center text-sm text-navy-600">
        <p>
          Already have an account? 
          <button className="text-navy-900 hover:underline ml-1">
            Sign in for faster checkout
          </button>
        </p>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          variant="primary" 
          onClick={validateAndContinue}
          disabled={!canContinue}
        >
          Continue to Review & Payment →
        </Button>
      </div>
    </div>
  );
}