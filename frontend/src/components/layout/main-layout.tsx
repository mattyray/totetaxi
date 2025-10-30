// frontend/src/components/layout/main-layout.tsx
'use client';

import { cn } from '@/utils/cn';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/user-menu';
import { useAuthStore } from '@/stores/auth-store';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  onBookNowClick?: () => void;
}

export function MainLayout({ children, className, onBookNowClick }: MainLayoutProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-cream-50 to-cream-100',
      className
    )}>
      {/* Header */}
      <header className="border-b border-cream-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image
                src="/assets/images/totetaxilogo.png"
                alt="Tote Taxi"
                width={180}
                height={86}
                priority
                className="h-auto w-[120px] md:w-[180px]"
              />
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link href="/services" className="text-navy-700 hover:text-navy-900 transition-colors font-medium">
                Services
              </Link>
              <Link href="/about" className="text-navy-700 hover:text-navy-900 transition-colors font-medium">
                About
              </Link>
              <Link href="/press" className="text-navy-700 hover:text-navy-900 transition-colors font-medium">
                Press
              </Link>
              <Link href="/partnerships" className="text-navy-700 hover:text-navy-900 transition-colors font-medium">
                Partnerships
              </Link>
              <Link href="/faq" className="text-navy-700 hover:text-navy-900 transition-colors font-medium">
                FAQ
              </Link>
              <Link href="/contact" className="text-navy-700 hover:text-navy-900 transition-colors font-medium">
                Contact
              </Link>
              
              {/* Auth-Aware Navigation */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link href="/dashboard" className="text-navy-700 hover:text-navy-900 transition-colors font-medium">
                    Dashboard
                  </Link>
                  <UserMenu />
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/login">
                    <Button variant="ghost">
                      Sign In
                    </Button>
                  </Link>
                  {onBookNowClick ? (
                    <Button variant="primary" onClick={onBookNowClick}>
                      Book Now
                    </Button>
                  ) : (
                    <Link href="/book">
                      <Button variant="primary">
                        Book Now
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-navy-700 hover:text-navy-900"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-cream-200">
              <nav className="flex flex-col space-y-4 mt-4">
                <Link 
                  href="/services" 
                  className="text-navy-700 hover:text-navy-900 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Services
                </Link>
                <Link 
                  href="/about" 
                  className="text-navy-700 hover:text-navy-900 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link 
                  href="/press" 
                  className="text-navy-700 hover:text-navy-900 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Press
                </Link>
                <Link 
                  href="/partnerships" 
                  className="text-navy-700 hover:text-navy-900 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Partnerships
                </Link>
                <Link 
                  href="/faq" 
                  className="text-navy-700 hover:text-navy-900 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </Link>
                <Link 
                  href="/contact" 
                  className="text-navy-700 hover:text-navy-900 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                
                {/* Mobile Auth Section */}
                {isAuthenticated ? (
                  <>
                    <Link 
                      href="/dashboard" 
                      className="text-navy-700 hover:text-navy-900 transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <UserMenu variant="mobile" />
                  </>
                ) : (
                  <div className="flex flex-col space-y-2 pt-4 border-t border-cream-200">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start">
                        Create Account
                      </Button>
                    </Link>
                    {onBookNowClick ? (
                      <Button 
                        variant="primary" 
                        onClick={() => {
                          onBookNowClick();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full"
                      >
                        Book Now
                      </Button>
                    ) : (
                      <Link href="/book" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="primary" className="w-full">
                          Book Now
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-navy-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-serif mb-4">Tote Taxi</div>
              <p className="text-navy-300 text-sm">
                Luxury delivery service for Manhattan to Hamptons transport
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Services</h4>
              <ul className="space-y-2 text-navy-300 text-sm">
                <li><Link href="/services#mini-moves" className="hover:text-white transition-colors">Mini Moves</Link></li>
                <li><Link href="/services#standard-delivery" className="hover:text-white transition-colors">Standard Delivery</Link></li>
                <li><Link href="/services#specialty-items" className="hover:text-white transition-colors">Specialty Items</Link></li>
                <li><Link href="/services#organizing" className="hover:text-white transition-colors">Organizing Services</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Company</h4>
              <ul className="space-y-2 text-navy-300 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
                <li><Link href="/partnerships" className="hover:text-white transition-colors">Partnerships</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Contact</h4>
              <div className="text-navy-300 text-sm space-y-1">
                <p>
                  <a href="tel:+16315955100" className="hover:text-white transition-colors">
                    (631) 595-5100
                  </a>
                </p>
                <p>
                  <a href="mailto:info@totetaxi.com" className="hover:text-white transition-colors">
                    info@totetaxi.com
                  </a>
                </p>
                <p>Manhattan to Hamptons</p>
              </div>
            </div>
          </div>
          <div className="border-t border-navy-800 mt-8 pt-8 text-center text-navy-400 text-sm">
            <p>&copy; 2024 Tote Taxi. All rights reserved. | Premium delivery service for discerning clients.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}