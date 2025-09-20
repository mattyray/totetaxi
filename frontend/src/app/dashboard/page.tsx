// frontend/src/app/dashboard/page.tsx  
'use client';

import { useEffect, Suspense } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function DashboardContent() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

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
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Welcome Message for New Users */}
          {isWelcome && (
            <Card variant="luxury" className="mb-8 border-gold-200 bg-gold-50">
              <CardContent className="p-6 text-center">
                <h2 className="text-xl font-serif font-bold text-navy-900 mb-2">
                  Welcome to ToteTaxi, {user.first_name}!
                </h2>
                <p className="text-navy-700 mb-4">
                  Your account has been created successfully. Ready to book your first luxury move?
                </p>
                <Button variant="primary" onClick={() => router.push('/book')}>
                  Book Your First Move
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-navy-900 mb-2">
              Welcome back, {user.first_name}!
            </h1>
            <p className="text-navy-700">
              Your ToteTaxi account dashboard
            </p>
          </div>

          {/* Dashboard Content */}
          <DashboardOverview />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium text-navy-900 mb-4">Book a Move</h3>
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
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium text-navy-900 mb-4">Manage Addresses</h3>
                <p className="text-sm text-navy-700 mb-4">
                  Save addresses for faster future bookings
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => alert('Address management coming soon!')}
                >
                  Manage Addresses
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
          <div className="text-navy-700">Loading...</div>
        </div>
      </MainLayout>
    }>
      <DashboardContent />
    </Suspense>
  );
}