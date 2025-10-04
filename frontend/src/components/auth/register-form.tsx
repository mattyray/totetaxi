'use client';
// frontend/src/components/auth/register-form.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    const value = formData[field as keyof typeof formData];
    let error = '';

    switch (field) {
      case 'first_name':
        if (!value.trim()) error = 'First name is required';
        break;
      case 'last_name':
        if (!value.trim()) error = 'Last name is required';
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        const cleanPhone = value.replace(/\D/g, '');
        if (!cleanPhone) {
          error = 'Phone number is required';
        } else if (cleanPhone.length < 10) {
          error = 'Phone number must be at least 10 digits';
        }
        break;
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 8) {
          error = 'Password must be at least 8 characters';
        }
        break;
      case 'password_confirm':
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateAll = () => {
    const fields = ['first_name', 'last_name', 'email', 'phone', 'password', 'password_confirm'];
    const allValid = fields.map(field => validateField(field)).every(Boolean);
    fields.forEach(field => setTouched(prev => ({ ...prev, [field]: true })));
    return allValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validateAll()) {
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/api/customer/auth/register/', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        password: formData.password,
        password_confirm: formData.password_confirm
      });
      
      setIsSuccess(true);
    } catch (error: any) {
      setApiError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card variant="elevated" className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">
            Check Your Email
          </h2>
          <p className="text-navy-600 mb-4">
            We've sent a verification link to <strong>{formData.email}</strong>
          </p>
          <p className="text-sm text-navy-500 mb-6">
            Click the link in the email to verify your account and complete registration.
          </p>
          <div className="space-y-3">
            <p className="text-xs text-navy-500">
              Didn't receive the email?
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                try {
                  await apiClient.post('/api/customer/auth/resend-verification/', {
                    email: formData.email
                  });
                  setApiError('Verification email resent! Please check your inbox.');
                } catch (error) {
                  setApiError('Failed to resend email. Please try again later.');
                }
              }}
              className="w-full"
            >
              Resend Verification Email
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              onBlur={() => handleBlur('first_name')}
              error={touched.first_name ? errors.first_name : ''}
              placeholder="John"
              required
            />

            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              onBlur={() => handleBlur('last_name')}
              error={touched.last_name ? errors.last_name : ''}
              placeholder="Doe"
              required
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value.toLowerCase())}
            onBlur={() => handleBlur('email')}
            error={touched.email ? errors.email : ''}
            placeholder="john.doe@example.com"
            required
            realTimeValidation={false}
          />

          <Input
            label="Phone Number"
            type="tel"
            mask="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            error={touched.phone ? errors.phone : ''}
            placeholder="(555) 123-4567"
            required
            realTimeValidation={false}
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            error={touched.password ? errors.password : ''}
            placeholder="••••••••"
            helper="Must be at least 8 characters"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={formData.password_confirm}
            onChange={(e) => handleChange('password_confirm', e.target.value)}
            onBlur={() => handleBlur('password_confirm')}
            error={touched.password_confirm ? errors.password_confirm : ''}
            placeholder="••••••••"
            required
          />

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{apiError}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <div className="text-center text-sm">
            <span className="text-navy-600">Already have an account? </span>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-navy-900 font-medium hover:underline"
            >
              Log in
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}