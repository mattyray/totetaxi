// frontend/src/components/booking/auth-choice-step.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

export function AuthChoiceStep() {
  const { isAuthenticated, user, login } = useAuthStore();
  const { nextStep, initializeForUser, setCurrentStep } = useBookingWizard();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [mode, setMode] = useState<'guest' | 'login' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Already authenticated, skipping to service selection');
      localStorage.removeItem('totetaxi-booking-wizard');
      initializeForUser(user.id.toString(), false);
      setCurrentStep(1);
    }
  }, [isAuthenticated, user, initializeForUser, setCurrentStep]);

  const handleGuestContinue = () => {
    initializeForUser('guest', true);
    nextStep();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setNeedsVerification(false);
    
    try {
      queryClient.clear();
      console.log('Cleared React Query cache before login');
      
      const result = await login(email.toLowerCase().trim(), password);
      
      if (result.success) {
        localStorage.removeItem('totetaxi-booking-wizard');
        initializeForUser(result.user?.id?.toString(), false);
        setCurrentStep(1);
      } else {
        const errorMsg = result.error || 'Login failed';
        
        if (errorMsg.includes('verify') || errorMsg.includes('not active')) {
          setNeedsVerification(true);
          setError('Please verify your email before logging in. Check your inbox for the verification link.');
        } else if (errorMsg.includes('staff account')) {
          setError('This is a staff account. Please use the staff login.');
        } else if (errorMsg.includes('Invalid') || errorMsg.includes('credentials')) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await apiClient.post('/api/customer/auth/resend-verification/', {
        email: email.toLowerCase().trim()
      });
      setError('Verification email sent! Please check your inbox.');
      setNeedsVerification(false);
    } catch (error) {
      setError('Failed to resend verification email. Please try again later.');
    }
  };

  if (!mode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-navy-900 mb-2">How would you like to continue?</h3>
          <p className="text-navy-700">Choose your preferred booking method</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <Card className="cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all" onClick={handleGuestContinue}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h4 className="font-medium text-navy-900 mb-2">Continue as Guest</h4>
              <p className="text-sm text-navy-700 mb-4">Quick checkout without creating an account</p>
              <Button 
                variant="outline" 
                className="w-full"
              >
                Continue as Guest
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:ring-2 hover:ring-navy-500 transition-all" onClick={() => setMode('login')}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h4 className="font-medium text-navy-900 mb-2">Sign In</h4>
              <p className="text-sm text-navy-700 mb-4">Access your saved addresses and booking history</p>
              <Button 
                variant="primary" 
                className="w-full"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-navy-600">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="text-navy-900 hover:underline font-medium"
            >
              Create one here
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-navy-900">Sign In to Your Account</h3>
          <Button variant="ghost" onClick={() => setMode(null)}>← Back</Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700 text-sm">{error}</p>
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

        <form onSubmit={handleLogin} className="space-y-4">
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
                setError('');
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
                  setError('');
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
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-sm text-navy-600 hover:text-navy-900 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="submit"
              variant="primary" 
              disabled={isLoading || !email || !password}
              className="flex-1"
            >
              {isLoading ? 'Signing In...' : 'Sign In & Continue'}
            </Button>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleGuestContinue}
              className="flex-1"
            >
              Guest Instead
            </Button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-cream-200">
          <p className="text-sm text-navy-600">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="text-navy-900 hover:underline font-medium"
            >
              Create one here
            </button>
          </p>
        </div>
      </div>
    );
  }

  return null;
}