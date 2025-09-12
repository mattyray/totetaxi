// frontend/src/components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DjangoUser, CustomerProfile } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginResponse {
  message: string;
  user: DjangoUser;
  customer_profile: CustomerProfile;
  csrf_token: string;
}

export function LoginForm() {
  const router = useRouter();
  const { setAuth, setLoading } = useAuthStore();
  const [apiError, setApiError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData): Promise<LoginResponse> => {
      console.log('🔍 SENDING LOGIN REQUEST');
      console.log('📤 Request data:', data);
      console.log('🌐 API Base URL:', apiClient.defaults.baseURL);
      console.log('🍪 Request config:', {
        withCredentials: apiClient.defaults.withCredentials,
        headers: apiClient.defaults.headers
      });
      
      const response = await apiClient.post('/api/customer/auth/login/', data);
      
      console.log('📥 RAW RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      console.log('🎉 LOGIN SUCCESS!');
      console.log('✅ Response data:', JSON.stringify(data, null, 2));
      console.log('👤 User data:', data.user);
      console.log('📋 Profile data:', data.customer_profile);
      
      setDebugInfo({
        success: true,
        response: data,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Set auth with correct types
        setAuth(data.user, data.customer_profile);
        console.log('✅ Auth state updated successfully');
        
        // Try to navigate
        console.log('🚀 Attempting to navigate to dashboard...');
        router.push('/dashboard');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error in success handler';
        console.error('❌ Error in onSuccess handler:', err);
        setApiError(`Success handler error: ${errorMessage}`);
      }
    },
    onError: (error: any) => {
      console.log('❌ LOGIN ERROR');
      console.log('📊 Error details:', {
        name: error.name,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      
      setDebugInfo({
        success: false,
        error: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.response?.data?.message ||
                          'Login failed. Please check your credentials.';
      setApiError(errorMessage);
      setLoading(false);
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('🚀 FORM SUBMITTED');
    console.log('📝 Form data:', data);
    
    setApiError('');
    setDebugInfo(null);
    setLoading(true);
    
    try {
      loginMutation.mutate(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown submit error';
      console.error('❌ Submit error:', err);
      setApiError(`Submit error: ${errorMessage}`);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
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

            {/* Password Field */}
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
              disabled={isSubmitting || loginMutation.isPending}
            >
              {isSubmitting || loginMutation.isPending ? 'Signing In...' : 'Sign In'}
            </Button>

            {/* Register Link */}
            <div className="text-center pt-4 border-t border-cream-200">
              <p className="text-sm text-navy-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="text-navy-900 hover:underline font-medium"
                >
                  Create Account
                </button>
              </p>
            </div>

            {/* Forgot Password */}
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

      {/* Debug Information Panel */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Debug Information</h3>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Test Credentials Helper */}
      <Card>
        <CardContent>
          <p className="text-sm text-gray-600 text-center">
            Test with: mnraynor90@gmail.com / Dun3R0ad455@$$
          </p>
        </CardContent>
      </Card>
    </div>
  );
}