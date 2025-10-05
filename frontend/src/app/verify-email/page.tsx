'use client';
// frontend/src/app/verify-email/page.tsx
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Extract the component that uses useSearchParams
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await apiClient.post('/api/customer/auth/verify-email/', {
          token
        });

        setStatus('success');
        setEmail(response.data.email);
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error.response?.data?.error || 
          'Verification failed. The link may be expired or invalid.'
        );
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      await apiClient.post('/api/customer/auth/resend-verification/', {
        email
      });
      setErrorMessage('A new verification email has been sent. Please check your inbox.');
    } catch (error) {
      setErrorMessage('Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card variant="elevated" className="max-w-md w-full">
      <CardContent className="p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">
              Verifying Your Email
            </h2>
            <p className="text-navy-600">
              Please wait while we verify your account...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-navy-600 mb-6">
              Your account has been successfully verified. You can now log in and start booking.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-red-600 mb-6">
              {errorMessage}
            </p>
            
            {email && (
              <Button
                variant="primary"
                size="lg"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full mb-3"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/register')}
              className="w-full"
            >
              Back to Registration
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Loading fallback component
function VerifyEmailLoading() {
  return (
    <Card variant="elevated" className="max-w-md w-full">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 border-4 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">
          Loading...
        </h2>
        <p className="text-navy-600">
          Please wait...
        </p>
      </CardContent>
    </Card>
  );
}

// Main page component with Suspense wrapper
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 py-12 px-4">
      <Suspense fallback={<VerifyEmailLoading />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}