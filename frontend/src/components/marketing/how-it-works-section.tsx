// src/components/marketing/how-it-works-section.tsx
import Image from 'next/image';

export function HowItWorksSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
          Same Day Delivery Made Stress-Free
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 - Pickup */}
          <div className="text-center">
            <div className="mb-6 flex justify-center h-32 items-center">
              <Image
                src="/assets/images/ToteTaxiVanBlue.jpg"
                alt="Tote Taxi Van"
                width={120}
                height={120}
                className="object-contain w-auto h-auto max-h-28"
              />
            </div>
            <h3 className="text-xl font-medium text-navy-900 mb-3">Pickup</h3>
            <p className="text-navy-700">Schedule a pickup and we'll come to you.</p>
          </div>

          {/* Step 2 - Travel */}
          <div className="text-center">
            <div className="mb-6 flex justify-center h-32 items-center">
              <Image
                src="/assets/images/StylishWomanToteBag.jpg"
                alt="Travel Hands-Free"
                width={120}
                height={120}
                className="object-contain w-auto h-auto max-h-28"
              />
            </div>
            <h3 className="text-xl font-medium text-navy-900 mb-3">Travel</h3>
            <p className="text-navy-700">You travel hands-free. Très chic!</p>
          </div>

          {/* Step 3 - Delivery */}
          <div className="text-center">
            <div className="mb-6 flex justify-center h-32 items-center">
              <Image
                src="/assets/images/HamptonsBeachHouse.jpg"
                alt="Hamptons Delivery"
                width={120}
                height={120}
                className="object-contain w-auto h-auto max-h-28"
              />
            </div>
            <h3 className="text-xl font-medium text-navy-900 mb-3">Delivery</h3>
            <p className="text-navy-700">We'll deliver to your desired destination.</p>
          </div>
        </div>
      </div>
    </section>
  );
}