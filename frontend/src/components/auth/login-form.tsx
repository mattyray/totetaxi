// frontend/src/components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [apiError, setApiError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setNeedsVerification(false);

    try {
      const result = await login(email.toLowerCase().trim(), password);

      if (result.success) {
        // Save remember me preference
        if (rememberMe) {
          localStorage.setItem('totetaxi-remember-email', email.toLowerCase().trim());
        } else {
          localStorage.removeItem('totetaxi-remember-email');
        }

        router.push('/dashboard');
      } else {
        // Handle specific error types
        const errorMsg = result.error || 'Login failed';
        
        if (errorMsg.includes('verify') || errorMsg.includes('not active')) {
          setNeedsVerification(true);
          setApiError('Please verify your email before logging in. Check your inbox for the verification link.');
        } else if (errorMsg.includes('staff account')) {
          setApiError('This is a staff account. Please use the staff login at /staff/login');
        } else if (errorMsg.includes('Invalid') || errorMsg.includes('credentials')) {
          setApiError('Invalid email or password. Please try again.');
        } else {
          setApiError(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        setApiError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      await apiClient.post('/api/customer/auth/resend-verification/', {
        email: email.toLowerCase().trim()
      });
      setApiError('Verification email sent! Please check your inbox.');
      setNeedsVerification(false);
    } catch (error) {
      setApiError('Failed to resend verification email. Please try again later.');
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
            Sign in to your Tote Taxi account
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-1">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value.toLowerCase());
                  setApiError('');
                  setNeedsVerification(false);
                }}
                placeholder="your@email.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-900 mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setApiError('');
                    setNeedsVerification(false);
                  }}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                />
                <span className="ml-2 text-sm text-navy-700">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-sm text-navy-600 hover:text-navy-900 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-700 text-sm">{apiError}</p>
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-red-800 hover:text-red-900 underline text-sm mt-2"
                  >
                    Resend verification email
                  </button>
                )}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}