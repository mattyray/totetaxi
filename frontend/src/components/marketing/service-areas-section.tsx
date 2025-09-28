// src/components/marketing/service-areas-section.tsx
import Image from 'next/image';

export function ServiceAreasSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
            Where We Deliver
          </h2>
          <p className="text-lg text-navy-700">
            Comprehensive delivery service across multiple locations
          </p>
        </div>

        {/* Main Route Visualization */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-12">
          <div className="text-center">
            <div className="h-40 flex items-center justify-center mb-4">
              <Image
                src="/assets/images/NycSkylineView.jpg"
                alt="NYC Skyline"
                width={200}
                height={150}
                className="object-contain w-auto h-auto max-h-36"
              />
            </div>
            <h3 className="font-medium text-navy-900">NYC & Surrounding Areas</h3>
          </div>
          
          <div className="hidden lg:block text-4xl text-navy-600">→</div>
          <div className="lg:hidden text-4xl text-navy-600">↓</div>
          
          <div className="text-center">
            <div className="h-40 flex items-center justify-center mb-4">
              <Image
                src="/assets/images/HamptonsBeachHouse.jpg"
                alt="Hamptons Beach House"
                width={200}
                height={150}
                className="object-contain w-auto h-auto max-h-36"
              />
            </div>
            <h3 className="font-medium text-navy-900">The Hamptons</h3>
          </div>
        </div>

        {/* Service Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <h3 className="font-medium text-navy-900 mb-2">NYC</h3>
            <p className="text-navy-600 text-sm">Manhattan, Brooklyn, and surrounding areas</p>
          </div>
          <div className="text-center">
            <h3 className="font-medium text-navy-900 mb-2">The Hamptons</h3>
            <p className="text-navy-600 text-sm">East Hampton, Southampton, Montauk, and more</p>
          </div>
          <div className="text-center">
            <h3 className="font-medium text-navy-900 mb-2">NYC Airports</h3>
            <p className="text-navy-600 text-sm">JFK, LaGuardia, Newark</p>
          </div>
          <div className="text-center">
            <h3 className="font-medium text-navy-900 mb-2">South Florida</h3>
            <p className="text-navy-600 text-sm">Palm Beach, Miami, Boca Raton, Jupiter</p>
          </div>
        </div>
      </div>
    </section>
  );
}