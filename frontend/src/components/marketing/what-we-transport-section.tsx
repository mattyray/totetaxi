// src/components/marketing/what-we-transport-section.tsx
import Image from 'next/image';

export function WhatWeTransportSection() {
  const transportItems = [
    {
      image: '/assets/images/LuxuryLuggageCollection.png',
      title: 'Weekend Essentials',
      description: 'Suitcases, travel bags, and personal items'
    },
    {
      image: '/assets/images/ModernLuggageSet.jpg',
      title: 'Travel Luggage',
      description: 'All types of luggage and carry-ons'
    },
    {
      image: '/assets/images/PinkBicycleBasket.jpg',
      title: 'Bicycles & Recreation',
      description: 'Bikes, sports equipment, and gear'
    },
    {
      image: '/assets/images/PelotonExerciseBike.jpg',
      title: 'Fitness Equipment',
      description: 'Pelotons, exercise bikes, and gym equipment'
    },
    {
      image: '/assets/images/BabyStrollerBlue.jpg',
      title: 'Family Items',
      description: 'Strollers, baby gear, and kids toys'
    },
    {
      image: '/assets/images/SummerDressesHangers.jpg',
      title: 'Clothing & Garments',
      description: 'Garment bags, clothing racks, and wardrobes'
    }
  ];

  return (
    <section className="py-16 bg-cream-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
            What We Transport
          </h2>
          <p className="text-lg text-navy-700 max-w-2xl mx-auto">
            From suitcases to surfboards, Pelotons to pop-up props — we handle it all
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {transportItems.map((item, index) => (
            <div key={index} className="text-center bg-white rounded-lg p-6 shadow-sm">
              <div className="mb-4 flex justify-center h-24 items-center">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={100}
                  height={100}
                  className="object-contain w-auto h-auto max-h-20"
                />
              </div>
              <h3 className="font-medium text-navy-900 mb-2">{item.title}</h3>
              <p className="text-navy-600 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}