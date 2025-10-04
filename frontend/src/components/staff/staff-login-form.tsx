// frontend/src/components/staff/staff-login-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStaffAuthStore } from '@/stores/staff-auth-store';

const staffLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type StaffLoginForm = z.infer<typeof staffLoginSchema>;

export function StaffLoginForm() {
  const router = useRouter();
  const { login, isLoading } = useStaffAuthStore();
  const [apiError, setApiError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<StaffLoginForm>({
    resolver: zodResolver(staffLoginSchema)
  });

  const onSubmit = async (data: StaffLoginForm) => {
    setApiError('');
    
    try {
      const result = await login(data.username, data.password);
      
      if (result.success) {
        console.log('Staff login successful, redirecting to dashboard');
        router.push('/staff/dashboard');
      } else {
        setApiError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Staff login error:', error);
      setApiError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold text-navy-900">
            Staff Login
          </h2>
          <p className="mt-2 text-sm text-navy-600">
            ToteTaxi Operations Dashboard
          </p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-navy-900 mb-1">
                  Username *
                </label>
                <Input
                  id="username"
                  {...register('username')}
                  placeholder="Enter your username"
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-navy-900 mb-1">
                  Password *
                </label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Enter your password"
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

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
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-navy-600">
          <p>
            Need access? Contact your administrator.<br/>
            This system logs all authentication attempts.
          </p>
        </div>
      </div>
    </div>
  );
}