'use client';

import { useState } from 'react';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';

interface StaffLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/staff/dashboard' },
  { name: 'Calendar', href: '/staff/calendar' },
  { name: 'Bookings', href: '/staff/bookings' },
  { name: 'Customers', href: '/staff/customers' },
  { name: 'Logistics', href: '/staff/logistics' },
  { name: 'Reports', href: '/staff/reports' }
];

export function StaffLayout({ children }: StaffLayoutProps) {
  const { staffProfile, clearAuth } = useStaffAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-cream-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-navy-900">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white text-white"
                onClick={() => setSidebarOpen(false)}
              >
                ×
              </button>
            </div>
            <SidebarContent navigation={navigation} pathname={pathname} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-navy-900">
        <SidebarContent navigation={navigation} pathname={pathname} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-1 flex-col">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-navy-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              {/* Breadcrumb or page title can go here */}
            </div>
            <div className="ml-4 flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {staffProfile?.full_name || 'Staff User'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-800">
                {staffProfile?.role || 'staff'}
              </span>
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
              >
                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navigation, pathname }: { 
  navigation: Array<{ name: string; href: string }>;
  pathname: string;
}) {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-navy-800">
        <h1 className="text-lg font-bold text-white">ToteTaxi Operations</h1>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-navy-800 text-white'
                    : 'text-navy-100 hover:bg-navy-700 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}