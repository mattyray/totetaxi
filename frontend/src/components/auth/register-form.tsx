// frontend/src/components/auth/register-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(150, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(150, 'Last name too long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  password_confirm: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [apiError, setApiError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    console.log('Registration form submitted');
    setApiError('');
    
    try {
      const result = await registerUser({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone
      });
      
      if (result.success) {
        console.log('Registration successful, redirecting to login');
        router.push('/login?message=Registration successful! Please sign in with your new account.');
      } else {
        setApiError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setApiError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Card variant="luxury" className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-serif font-bold text-navy-900 text-center">
          Create Your Account
        </h2>
        <p className="text-navy-700 text-center">
          Join ToteTaxi for faster booking and VIP benefits
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* First Name & Last Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-navy-900 mb-1">
                First Name *
              </label>
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder="John"
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && (
                <p className="text-red-600 text-sm mt-1">{errors.first_name.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-navy-900 mb-1">
                Last Name *
              </label>
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder="Smith"
                className={errors.last_name ? 'border-red-500' : ''}
              />
              {errors.last_name && (
                <p className="text-red-600 text-sm mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-1">
              Email Address *
            </label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john@example.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-navy-900 mb-1">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="(555) 123-4567"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
            )}
            <p className="text-xs text-navy-600 mt-1">Optional - for booking updates</p>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-navy-900 mb-1">
              Password *
            </label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Create a strong password"
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-navy-900 mb-1">
              Confirm Password *
            </label>
            <Input
              id="password_confirm"
              type="password"
              {...register('password_confirm')}
              placeholder="Repeat your password"
              className={errors.password_confirm ? 'border-red-500' : ''}
            />
            {errors.password_confirm && (
              <p className="text-red-600 text-sm mt-1">{errors.password_confirm.message}</p>
            )}
          </div>

          {/* API Error Display */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{apiError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          {/* Login Link */}
          <div className="text-center pt-4 border-t border-cream-200">
            <p className="text-sm text-navy-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-navy-900 hover:underline font-medium"
              >
                Sign In
              </button>
            </p>
          </div>

          {/* Terms Notice */}
          <div className="text-center">
            <p className="text-xs text-navy-600">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="underline hover:text-navy-900">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="underline hover:text-navy-900">Privacy Policy</a>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}