// frontend/src/app/faq/page.tsx
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
  category: 'booking' | 'service' | 'pricing' | 'logistics';
}

const faqData: FAQItem[] = [
  {
    category: 'booking',
    question: 'How far in advance should I book my move?',
    answer: 'We recommend booking at least 48 hours in advance, especially during peak Hamptons season (May-September). However, we often accommodate same-day requests based on availability. For organizing services, we suggest booking 3-5 days ahead to ensure our best specialists are available.'
  },
  {
    category: 'booking',
    question: 'Can I modify or cancel my booking?',
    answer: 'Yes, you can modify your booking up to 24 hours before your scheduled pickup at no charge. Cancellations made more than 24 hours in advance receive a full refund. Within 24 hours, a 50% cancellation fee applies to cover logistics costs.'
  },
  {
    category: 'service',
    question: 'What areas do you service?',
    answer: 'We provide pickup services throughout Manhattan, Brooklyn (select neighborhoods), Long Island City, and parts of New Jersey. Delivery destinations include all major Hamptons communities: East Hampton, Southampton, Bridgehampton, Westhampton Beach, Sag Harbor, and Montauk.'
  },
  {
    category: 'service',
    question: 'How do you handle fragile or valuable items?',
    answer: 'All items receive our standard protective wrapping. For fragile or high-value items, we use specialized packing materials and techniques. We recommend our Specialty Item service for valuable pieces like artwork, antiques, or electronics over $1,000. Each move includes comprehensive insurance coverage.'
  },
  {
    category: 'service',
    question: 'Do you provide packing and unpacking services?',
    answer: 'Yes! Our Professional Organizing Services include expert packing at your Manhattan location and unpacking/setup at your Hamptons destination. Our specialists use premium materials and can organize items exactly how you prefer them. This service is available as an add-on to any Mini Move package.'
  },
  {
    category: 'pricing',
    question: 'How is pricing calculated?',
    answer: 'Mini Moves are priced as complete packages based on the tier you select. Standard Delivery is priced per item with a minimum order. Specialty Items have individual fixed pricing. Additional fees may apply for same-day delivery, COI requirements, or weekend/holiday surcharges. You\'ll see the complete breakdown before booking.'
  },
  {
    category: 'pricing',
    question: 'Are there any hidden fees?',
    answer: 'Absolutely not. Our pricing is transparent. The quote you receive includes all standard services. The only additional costs are optional add-ons you select (like organizing services) or surcharges that are clearly disclosed during booking (weekend, holiday, or building-specific fees).'
  },
  {
    category: 'pricing',
    question: 'Do you charge extra for stairs or elevators?',
    answer: 'No additional fees for standard stairs or elevator access. However, buildings with freight elevator requirements or unusual access restrictions may incur additional charges, which we\'ll discuss during booking. We handle all coordination with building management.'
  },
  {
    category: 'logistics',
    question: 'What happens if I\'m not available during delivery?',
    answer: 'We offer flexible delivery options including doorman delivery, concierge service, or secure placement in agreed-upon locations. We coordinate with you and your building staff to ensure seamless delivery even if you\'re not present. Detailed delivery instructions can be provided during booking.'
  },
  {
    category: 'logistics',
    question: 'How do you ensure the security of my belongings?',
    answer: 'All team members are background-checked and bonded. Items are inventoried at pickup and delivery. Our vehicles are GPS-tracked and secured. We carry comprehensive insurance coverage and can provide Certificates of Insurance for building requirements. Your items are never left unattended.'
  },
  {
    category: 'logistics',
    question: 'Can you coordinate with my building\'s requirements?',
    answer: 'Absolutely. We handle all building coordination including freight elevator reservations, COI submission, and compliance with move-in/move-out procedures. Many Manhattan buildings have specific requirements, and we\'re experienced with all major properties and management companies.'
  },
  {
    category: 'service',
    question: 'What if something gets damaged during transport?',
    answer: 'While damage is extremely rare thanks to our careful handling protocols, we carry comprehensive insurance that covers full replacement value. Any damage claims are processed quickly and fairly. We stand behind our work and will make things right immediately.'
  }
];

const categories = {
  booking: 'Booking Process',
  service: 'Service Details',
  pricing: 'Pricing & Fees',
  logistics: 'Logistics & Delivery'
};

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string>('booking');
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set());

  const toggleQuestion = (index: number) => {
    const newOpenQuestions = new Set(openQuestions);
    if (newOpenQuestions.has(index)) {
      newOpenQuestions.delete(index);
    } else {
      newOpenQuestions.add(index);
    }
    setOpenQuestions(newOpenQuestions);
  };

  const filteredFAQs = faqData.filter(faq => faq.category === activeCategory);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto">
            Everything you need to know about ToteTaxi's luxury delivery service. 
            Can't find what you're looking for? We're here to help.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {Object.entries(categories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeCategory === key
                  ? 'bg-navy-900 text-white'
                  : 'bg-white text-navy-700 border border-gray-200 hover:border-navy-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <Card key={index} variant="elevated">
                <CardContent>
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full text-left py-4 flex justify-between items-center"
                  >
                    <h3 className="text-lg font-medium text-navy-900 pr-4">
                      {faq.question}
                    </h3>
                    <span className={`text-navy-900 transition-transform ${
                      openQuestions.has(index) ? 'rotate-180' : ''
                    }`}>
                      ↓
                    </span>
                  </button>
                  {openQuestions.has(index) && (
                    <div className="pb-4 pt-2 border-t border-gray-100">
                      <p className="text-navy-700 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Still Have Questions */}
        <div className="text-center">
          <Card variant="luxury">
            <CardContent>
              <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
                Still Have Questions?
              </h2>
              <p className="text-navy-700 mb-6 max-w-2xl mx-auto">
                Our team is available to answer any specific questions about your move. 
                We're here to ensure you have complete confidence in our service.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button variant="primary" size="lg">
                    Contact Our Team
                  </Button>
                </Link>
                <Link href="/book">
                  <Button variant="outline" size="lg">
                    Start Your Booking
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}