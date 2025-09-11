// frontend/src/components/layout/main-layout.tsx
import { cn } from '@/utils/cn';

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
            <div className="text-2xl font-serif font-bold text-navy-900">
              ToteTaxi
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-navy-700 hover:text-navy-900 transition-colors">
                Services
              </a>
              <a href="#about" className="text-navy-700 hover:text-navy-900 transition-colors">
                About
              </a>
              <a href="#contact" className="text-navy-700 hover:text-navy-900 transition-colors">
                Contact
              </a>
              <button 
                onClick={onBookNowClick}
                className="bg-navy-900 text-white px-4 py-2 rounded-md hover:bg-navy-800 transition-colors"
              >
                Book Now
              </button>
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
          <div className="text-center">
            <div className="text-xl font-serif mb-4">ToteTaxi</div>
            <p className="text-navy-300">Luxury delivery service for the Hamptons</p>
          </div>
        </div>
      </footer>
    </div>
  );
}