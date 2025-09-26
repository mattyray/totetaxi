// frontend/src/components/auth/user-menu.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useClickAway } from '@/hooks/use-click-away';
import { 
  ChevronDownIcon, 
  UserIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  PlusIcon,
  BookOpenIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface UserMenuProps {
  variant?: 'header' | 'mobile';
}

export function UserMenu({ variant = 'header' }: UserMenuProps) {
  const { user, customerProfile, logout, secureReset } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickAway(dropdownRef, () => setIsOpen(false));

  const handleLogout = async () => {
    try {
      console.log('User menu logout initiated');
      await logout();
      router.push('/');
      setIsOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to secure reset if logout fails
      secureReset();
      router.push('/');
      setIsOpen(false);
    }
  };

  const handleSecureReset = () => {
    console.log('SECURITY: User initiated secure reset');
    secureReset();
    router.push('/');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const menuItems = [
    {
      label: 'Book a Move',
      icon: PlusIcon,
      onClick: () => {
        router.push('/book');
        setIsOpen(false);
      },
      primary: true
    },
    {
      label: 'Dashboard',
      icon: UserIcon,
      onClick: () => {
        router.push('/dashboard');
        setIsOpen(false);
      }
    },
    {
      label: 'Booking History',
      icon: BookOpenIcon,
      onClick: () => {
        router.push('/dashboard/bookings');
        setIsOpen(false);
      }
    },
    {
      label: 'Account Settings',
      icon: Cog6ToothIcon,
      onClick: () => {
        alert('Account settings coming soon!');
        setIsOpen(false);
      }
    },
    {
      label: 'Sign Out',
      icon: ArrowRightOnRectangleIcon,
      onClick: handleLogout,
      danger: true
    },
    // Debug option - remove in production
    ...(process.env.NODE_ENV === 'development' ? [{
      label: 'Secure Reset (Debug)',
      icon: ExclamationTriangleIcon,
      onClick: handleSecureReset,
      danger: true
    }] : [])
  ];

  if (!user) return null;

  if (variant === 'mobile') {
    return (
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <div className="px-4 py-3 bg-gray-50 rounded-lg mx-4">
          <p className="font-medium text-navy-900">{user.first_name} {user.last_name}</p>
          <p className="text-sm text-navy-600">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            {customerProfile?.is_vip && (
              <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                VIP
              </span>
            )}
            {customerProfile && customerProfile.total_bookings > 0 && (
              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {customerProfile.total_bookings} bookings
              </span>
            )}
          </div>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                item.primary 
                  ? 'text-blue-600 hover:text-blue-700 font-medium' 
                  : item.danger 
                  ? 'text-red-600 hover:text-red-700' 
                  : 'text-navy-700 hover:text-navy-900'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-navy-700 hover:text-navy-900 transition-colors py-2 px-3 rounded-lg hover:bg-gray-50"
      >
        <div className="text-right">
          <div className="text-sm font-medium">{user.first_name}</div>
          {customerProfile?.is_vip && (
            <div className="text-xs text-yellow-600">VIP</div>
          )}
        </div>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 border border-gray-200">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="font-medium text-navy-900">{user.first_name} {user.last_name}</p>
              <p className="text-sm text-navy-600">{user.email}</p>
              {customerProfile && (
                <div className="flex items-center gap-2 mt-2">
                  {customerProfile.is_vip && (
                    <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      VIP
                    </span>
                  )}
                  {customerProfile.total_spent_dollars > 0 && (
                    <span className="text-xs text-navy-600">
                      ${customerProfile.total_spent_dollars} spent
                    </span>
                  )}
                </div>
              )}
            </div>

            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                    item.primary 
                      ? 'text-blue-600 hover:text-blue-700 font-medium' 
                      : item.danger 
                      ? 'text-red-600 hover:text-red-700' 
                      : 'text-navy-700 hover:text-navy-900'
                  } ${index === menuItems.length - 1 || (index === menuItems.length - 2 && process.env.NODE_ENV === 'development') ? 'border-t border-gray-100 mt-1' : ''}`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}