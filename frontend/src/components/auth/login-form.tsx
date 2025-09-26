// frontend/src/components/auth/login-form.tsx
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

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const TEST_USER = {
  email: 'dev.tester@totetaxi.local',
  password: 'DevTest2024!'
};

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [apiError, setApiError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const fillTestUser = () => {
    setValue('email', TEST_USER.email);
    setValue('password', TEST_USER.password);
  };

  const onSubmit = async (data: LoginFormData) => {
    setApiError('');
    
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        console.log('Login successful, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        setApiError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setApiError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="luxury">
        <CardHeader>
          <h2 className="text-2xl font-serif font-bold text-navy-900 text-center">
            Welcome Back
          </h2>
          <p className="text-navy-700 text-center">
            Sign in to your ToteTaxi account
          </p>
        </CardHeader>

        <CardContent>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-center mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fillTestUser}
                className="text-xs"
              >
                Fill Test User
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-1">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="your@email.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-900 mb-1">
                Password
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

            <div className="text-center pt-4 border-t border-cream-200">
              <p className="text-sm text-navy-600">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="text-navy-900 hover:underline font-medium"
                >
                  Create Account
                </button>
              </p>
            </div>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-navy-600 hover:text-navy-900 hover:underline"
                onClick={() => {
                  alert('Forgot password functionality coming soon!');
                }}
              >
                Forgot your password?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
