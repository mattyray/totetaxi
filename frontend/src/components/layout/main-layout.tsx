// frontend/src/components/layout/main-layout.tsx
import { cn } from '@/utils/cn';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  onBookNowClick?: () => void;
}

export function MainLayout({ children, className, onBookNowClick }: MainLayoutProps) {
  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-cream-50 to-cream-100',
      className
    )}>
      {/* Header */}
      <header className="border-b border-cream-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-serif font-bold text-navy-900">
              ToteTaxi
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/#services" className="text-navy-700 hover:text-navy-900 transition-colors">
                Services
              </Link>
              <Link href="/#about" className="text-navy-700 hover:text-navy-900 transition-colors">
                About
              </Link>
              <Link href="/#contact" className="text-navy-700 hover:text-navy-900 transition-colors">
                Contact
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
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-navy-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-xl font-serif mb-4">ToteTaxi</div>
              <p className="text-navy-300">Luxury delivery service for the Hamptons</p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Services</h4>
              <ul className="space-y-2 text-navy-300">
                <li>Mini Moves</li>
                <li>Standard Delivery</li>
                <li>Specialty Items</li>
                <li>Organizing Services</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Contact</h4>
              <div className="text-navy-300">
                <p>Manhattan to Hamptons</p>
                <p>Premium white-glove service</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}