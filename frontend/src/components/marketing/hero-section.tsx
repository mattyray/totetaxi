// src/components/marketing/hero-section.tsx
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface HeroSectionProps {
  onBookNowClick: () => void;
}

export function HeroSection({ onBookNowClick }: HeroSectionProps) {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Responsive Background Image */}
      <picture className="absolute inset-0 w-full h-full">
        {/* Desktop - Large screens (1024px+) */}
        <source 
          media="(min-width: 1024px)" 
          srcSet="/assets/images/hero-large.webp" 
          type="image/webp" 
        />
        <source 
          media="(min-width: 1024px)" 
          srcSet="/assets/images/hero-large.jpg" 
          type="image/jpeg" 
        />
        
        {/* Tablet - Medium screens (768px - 1023px) */}
        <source 
          media="(min-width: 768px)" 
          srcSet="/assets/images/hero-medium.webp" 
          type="image/webp" 
        />
        <source 
          media="(min-width: 768px)" 
          srcSet="/assets/images/hero-medium.jpg" 
          type="image/jpeg" 
        />
        
        {/* Mobile - Small screens (< 768px) */}
        <source 
          srcSet="/assets/images/hero-small.webp" 
          type="image/webp" 
        />
        <source 
          srcSet="/assets/images/hero-small.jpg" 
          type="image/jpeg" 
        />
        
        {/* Fallback img tag */}
        <img 
          src="/assets/images/hero-large.jpg"
          alt="Tote Taxi luxury delivery service"
          className="w-full h-full object-cover object-center"
        />
      </picture>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 text-center text-white px-4">
        <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
          Door-to-Door Delivery Service
        </h1>
        <p className="text-xl mb-4 max-w-3xl mx-auto">
          Tote Taxi will deliver your luggage to and from the city stress-free.
        </p>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          From suitcases to surfboards, Pelotons to pop-up props — we handle it all between 
          NYC, the Hamptons, South Florida, and all major airports.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" size="lg" onClick={onBookNowClick}>
            Book Now
          </Button>
          <Link href="/services">
            <Button variant="outline" size="lg" className="bg-white/10 border-white text-white hover:bg-white hover:text-navy-900">
              View Services & Pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}