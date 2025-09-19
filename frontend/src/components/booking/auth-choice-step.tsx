'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AuthChoiceStep() {
  const [mode, setMode] = useState<'guest' | 'login' | 'register' | null>(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    first_name: '', last_name: '', email: '', password: '', phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuthStore();
  const { nextStep, initializeForUser } = useBookingWizard();
  const router = useRouter();

  const handleGuestContinue = () => {
    initializeForUser('guest', true);
    nextStep();
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(loginData.email, loginData.password);
      if (result.success) {
        initializeForUser(result.user?.id?.toString(), false);
        nextStep();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await register({
        email: registerData.email,
        password: registerData.password,
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        phone: registerData.phone
      });
      
      if (result.success) {
        // Auto-login after registration
        const loginResult = await login(registerData.email, registerData.password);
        if (loginResult.success) {
          initializeForUser(loginResult.user?.id?.toString(), false);
          nextStep();
        }
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-navy-900 mb-2">How would you like to continue?</h3>
          <p className="text-navy-700">Choose your preferred booking method</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Guest Option */}
          <Card className="cursor-pointer hover:ring-2 hover:ring-navy-500 transition-all">
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
                onClick={handleGuestContinue}
                className="w-full"
              >
                Continue as Guest
              </Button>
            </CardContent>
          </Card>

          {/* Login Option */}
          <Card className="cursor-pointer hover:ring-2 hover:ring-navy-500 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h4 className="font-medium text-navy-900 mb-2">Sign In</h4>
              <p className="text-sm text-navy-700 mb-4">Access your saved addresses and booking history</p>
              <Button 
                variant="outline" 
                onClick={() => setMode('login')}
                className="w-full"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>

          {/* Register Option */}
          <Card className="cursor-pointer hover:ring-2 hover:ring-navy-500 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h4 className="font-medium text-navy-900 mb-2">Create Account</h4>
              <p className="text-sm text-navy-700 mb-4">Save preferences and earn VIP benefits</p>
              <Button 
                variant="primary" 
                onClick={() => setMode('register')}
                className="w-full"
              >
                Create Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-navy-900">Sign In to Your Account</h3>
          <Button variant="ghost" onClick={() => setMode(null)}>← Back</Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={loginData.email}
            onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={loginData.password}
            onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Your password"
            required
          />
        </div>

        <div className="flex gap-3">
          <Button 
            variant="primary" 
            onClick={handleLogin}
            disabled={isLoading || !loginData.email || !loginData.password}
            className="flex-1"
          >
            {isLoading ? 'Signing In...' : 'Sign In & Continue'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGuestContinue}
            className="flex-1"
          >
            Continue as Guest Instead
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'register') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-navy-900">Create Your Account</h3>
          <Button variant="ghost" onClick={() => setMode(null)}>← Back</Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={registerData.first_name}
              onChange={(e) => setRegisterData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="John"
              required
            />
            
            <Input
              label="Last Name"
              value={registerData.last_name}
              onChange={(e) => setRegisterData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="Doe"
              required
            />
          </div>
          
          <Input
            label="Email"
            type="email"
            value={registerData.email}
            onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            required
          />
          
          <Input
            label="Phone"
            type="tel"
            value={registerData.phone}
            onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="(555) 123-4567"
          />
          
          <Input
            label="Password"
            type="password"
            value={registerData.password}
            onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Create a secure password"
            required
          />
        </div>

        <div className="flex gap-3">
          <Button 
            variant="primary" 
            onClick={handleRegister}
            disabled={isLoading || !registerData.email || !registerData.password || !registerData.first_name || !registerData.last_name}
            className="flex-1"
          >
            {isLoading ? 'Creating Account...' : 'Create Account & Continue'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGuestContinue}
            className="flex-1"
          >
            Continue as Guest Instead
          </Button>
        </div>
      </div>
    );
  }

  return null;
}