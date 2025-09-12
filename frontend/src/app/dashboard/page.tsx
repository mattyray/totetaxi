// frontend/src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, customerProfile, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
          <div className="text-navy-700">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-navy-900 mb-2">
              Welcome back, {user.first_name}!
            </h1>
            <p className="text-navy-700">
              Your ToteTaxi account dashboard
            </p>
          </div>

          {/* Account Info Card */}
          <Card variant="luxury" className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-navy-900">
                Account Information
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-navy-900 mb-2">Personal Details</h3>
                  <p className="text-sm text-navy-700">Name: {user.first_name} {user.last_name}</p>
                  <p className="text-sm text-navy-700">Email: {user.email}</p>
                  <p className="text-sm text-navy-700">Phone: {customerProfile?.phone || 'Not provided'}</p>
                  <p className="text-sm text-navy-700">
                    VIP Status: {customerProfile?.is_vip ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-navy-900 mb-2">Booking Stats</h3>
                  <p className="text-sm text-navy-700">
                    Total Bookings: {customerProfile?.total_bookings || 0}
                  </p>
                  <p className="text-sm text-navy-700">
                    Total Spent: ${customerProfile?.total_spent_dollars || 0}
                  </p>
                  <p className="text-sm text-navy-700">
                    Preferred Time: {customerProfile?.preferred_pickup_time || 'Morning'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Book a Move</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-navy-700 mb-4">
                  Schedule your next ToteTaxi delivery or move
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => router.push('/book')}
                  className="w-full"
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Booking History</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-navy-700 mb-4">
                  View your past bookings and receipts
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => alert('Booking history coming soon!')}
                >
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Debug Info for Development */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-navy-900">Debug Info</h3>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                >
                  Logout
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => console.log('Auth State:', { user, customerProfile, isAuthenticated })}
                >
                  Log Auth State
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}