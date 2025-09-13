'use client';

import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';

interface StaffLayoutProps {
  children: React.ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const { staffProfile, clearAuth } = useStaffAuthStore();
  const router = useRouter();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/staff/auth/logout/');
    },
    onSuccess: () => {
      clearAuth();
      router.push('/staff/login');
    },
    onError: () => {
      clearAuth();
      router.push('/staff/login');
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Staff Navigation Bar */}
      <nav className="bg-navy-900 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="text-lg font-bold">ToteTaxi Staff</h1>
            <a 
              href="/staff/dashboard" 
              className="hover:text-gold-300 transition-colors"
            >
              Dashboard
            </a>
            <a 
              href="/staff/bookings" 
              className="hover:text-gold-300 transition-colors"
            >
              Bookings
            </a>
            {staffProfile?.permissions.can_view_financial_reports && (
              <a 
                href="/staff/reports" 
                className="hover:text-gold-300 transition-colors"
              >
                Reports
              </a>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {staffProfile?.full_name || 'Staff User'} ({staffProfile?.role || 'staff'})
            </span>
            <button 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-sm hover:text-gold-300 transition-colors disabled:opacity-50"
            >
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </nav>
      
      {/* Staff Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}