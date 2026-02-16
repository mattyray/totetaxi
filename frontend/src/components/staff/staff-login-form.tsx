'use client';

import { useState, useEffect } from 'react';
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
  rememberMe: z.boolean().optional(),
});

type StaffLoginForm = z.infer<typeof staffLoginSchema>;

export function StaffLoginForm() {
  const router = useRouter();
  const { login, isLoading } = useStaffAuthStore();
  const [apiError, setApiError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<StaffLoginForm>({
    resolver: zodResolver(staffLoginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    }
  });

  // Load saved username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('staff-remember-username');
    if (savedUsername) {
      setValue('username', savedUsername);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  const onSubmit = async (data: StaffLoginForm) => {
    // Prevent double submit
    if (isSubmitting || isLoading) return;

    setApiError('');

    try {
      // Handle remember me
      if (data.rememberMe) {
        localStorage.setItem('staff-remember-username', data.username);
      } else {
        localStorage.removeItem('staff-remember-username');
      }

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

  // Sync DOM values to React Hook Form before validation.
  // Mobile password managers fill inputs without triggering React events,
  // so RHF's internal state can be empty even when fields are filled.
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const usernameEl = form.elements.namedItem('username') as HTMLInputElement;
    const passwordEl = form.elements.namedItem('password') as HTMLInputElement;
    if (usernameEl) setValue('username', usernameEl.value);
    if (passwordEl) setValue('password', passwordEl.value);
    await handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold text-navy-900">
            Staff Login
          </h2>
          <p className="mt-2 text-sm text-navy-600">
            Tote Taxi Operations Dashboard
          </p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-6">
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-navy-900 mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  autoComplete="username"
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
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    placeholder="Enter your password"
                    className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  {...register('rememberMe')}
                  className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-navy-700">
                  Remember my username
                </label>
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
                disabled={isLoading || isSubmitting}
              >
                {isLoading || isSubmitting ? 'Signing In...' : 'Sign In'}
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