// frontend/src/components/auth/user-menu.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useClickAway } from '@/hooks/use-click-away';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface UserMenuProps {
  variant?: 'header' | 'mobile';
}

export function UserMenu({ variant = 'header' }: UserMenuProps) {
  const { user, customerProfile, clearAuth } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useClickAway(dropdownRef, () => setIsOpen(false));

  const handleLogout = async () => {
    try {
      clearAuth();
      router.push('/');
      setIsOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
      clearAuth();
      router.push('/');
    }
  };

  const menuItems = [
    {
      label: 'Dashboard',
      icon: UserIcon,
      onClick: () => {
        router.push('/dashboard');
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
      className: 'text-red-600 hover:text-red-700'
    }
  ];

  if (!user) return null;

  if (variant === 'mobile') {
    return (
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <div className="px-4 py-2">
          <p className="font-medium text-navy-900">{user.first_name} {user.last_name}</p>
          <p className="text-sm text-navy-600">{user.email}</p>
          {customerProfile?.is_vip && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-gold-100 text-gold-800 rounded-full">
              VIP
            </span>
          )}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 ${item.className || 'text-navy-700 hover:text-navy-900'}`}
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
        className="flex items-center space-x-2 text-navy-700 hover:text-navy-900 transition-colors"
      >
        <div className="text-right">
          <div className="text-sm font-medium">{user.first_name}</div>
          {customerProfile?.is_vip && (
            <div className="text-xs text-gold-600">VIP</div>
          )}
        </div>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-medium text-navy-900">{user.first_name} {user.last_name}</p>
              <p className="text-sm text-navy-600">{user.email}</p>
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 transition-colors ${item.className || 'text-navy-700 hover:text-navy-900'}`}
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