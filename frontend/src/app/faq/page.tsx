// frontend/src/app/faq/page.tsx - Real Tote Taxi FAQ content
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'service' | 'mini-moves' | 'booking';
}

const faqData: FAQItem[] = [
  // General
  {
    category: 'general',
    question: 'What areas do you currently service?',
    answer: 'We currently service the Hamptons, NYC and surrounding areas (by zipcode), and South Florida (by zipcode). If you don\'t see your zipcode or location listed as an option, you can always contact us for a custom quote. Certain zip codes surrounding our service areas may be an additional fee.'
  },
  {
    category: 'general',
    question: 'Do you handle airport baggage transportation?',
    answer: 'Yes. We deliver to JFK, LGA, EWR & Westchester FBO\'s. Please contact us for specific arrangements.'
  },
  {
    category: 'general',
    question: 'What about insurance coverage?',
    answer: 'Our total liability for items lost or damaged is half the purchase price of each item up to $150. For additional coverage, $100 extra covers your order for $1,000. TOTE TAXI assumes no responsibility for: money, negotiable papers, securities, business documents, irreplaceable books, manuscripts, photographic or electronic equipment, computers, jewelry, watches, eyeglasses, silverware, china, precious metals, heirlooms, furs, tobacco products, antiques, artifacts, paintings and other works of art, medicines, human organs, commercial items, cosmetics, samples, or any similar valuable or fragile items.'
  },
  {
    category: 'general',
    question: 'Do I need to tip the driver?',
    answer: 'Tipping is not required, but is greatly appreciated by the drivers.'
  },
  {
    category: 'general',
    question: 'Do you offer any discounts?',
    answer: 'We can offer a discount if you are paying via bank transfer, cash, or if you refer someone who books Tote Taxi. Please call or email for more information.'
  },
  {
    category: 'general',
    question: 'Do you offer daily luggage storage?',
    answer: 'Yes, this service is offered at 395 County Road, 39A. It\'s $20/day. Please call or email us to schedule.'
  },
  
  // Service Details
  {
    category: 'service',
    question: 'What happens if I\'m late to give my bag? How long will you wait?',
    answer: 'If there is a problem we will call/text you directly. Tote Taxi will wait up to 10 minutes to receive the bag. If the delivery is missed you will be charged an additional $20.'
  },
  {
    category: 'service',
    question: 'Can I leave my bag outside my door if I\'m not home?',
    answer: 'Yes. If you are not home, please leave the items in a safe place. Use the instruction form to inform us of pickup/delivery instructions.'
  },
  {
    category: 'service',
    question: 'I\'m staying in a hotel - where should I leave my bag?',
    answer: 'Go ahead and leave it at the front desk – the hotel will give you a claim ticket. Please respond to your confirmation email with a photo of the claim ticket.'
  },
  {
    category: 'service',
    question: 'Do you have a drop-off or pick-up location?',
    answer: 'Everything is delivered door-to-door. If you need this option, our office is at 395 County Road 39A, Southampton, NY 11968. Contact us for details.'
  },
  {
    category: 'service',
    question: 'Where will the driver meet me?',
    answer: 'Please have the person handing us the bag meet us on the first floor. We will contact you directly when we have arrived at your address.'
  },
  {
    category: 'service',
    question: 'Do I have to label my bag?',
    answer: 'Yes, please label the bag with the name on the order. We also highly recommend that you number your pieces (example: #3 of 5 pieces). Labels are available upon request.'
  },
  {
    category: 'service',
    question: 'When will my bag arrive in NYC/The Hamptons?',
    answer: 'Items are picked up in the mornings between 8am-11:30am and delivered before 6pm. When the driver is headed to your pickup/drop-off you will receive tracking information.'
  },
  {
    category: 'service',
    question: 'Do you offer local Hamptons service from retail stores?',
    answer: 'As a traditional courier, we can pick up and deliver items for you around the Hamptons.'
  },
  
  // Mini Moves
  {
    category: 'mini-moves',
    question: 'What is a mini move?',
    answer: 'A mini-move is a luxurious and worry-free solution for transporting a larger amount of luggage and other small items in a carefree way — to and from your destination in NYC, the Hamptons, and South Florida.'
  },
  {
    category: 'mini-moves',
    question: 'What is the difference between a Mini Move, Petite Move, and a Full Move?',
    answer: 'We suggest move types based on the number of individuals in a family: • Petite Move: Ideal for a family of 3- with 8-15 pieces • Mini Move (Standard): Our most popular option, ideal for a family of 5- with 15-30 pieces • Full Move: For larger families of 6+ with 50-60 pieces. Note: mini move packages do not include Peloton transport.'
  },
  {
    category: 'mini-moves',
    question: 'What do I need to know about transporting a Peloton?',
    answer: 'We ask that you please remove the screen from the bike before transport.'
  },
  {
    category: 'mini-moves',
    question: 'I have an item that is not listed on the website - how do I know how much it will cost?',
    answer: 'If you have a custom order please email us at info@totetaxi.com or call 631-595-5100. We work on custom orders and can provide a quote based on your specific needs.'
  },
  {
    category: 'mini-moves',
    question: 'Are there any additional fees with the Mini Move?',
    answer: 'There can be additional fees: if you give us more items than originally stated, if your items are not ready for pickup and/or drivers are required to wait more than 30 minutes (on either end) an hourly rate will accrue and be added to the Mini Move.'
  },
  {
    category: 'mini-moves',
    question: 'Can you provide us with a COI (Certificate of Insurance)?',
    answer: 'Yes, please send a sample COI for the building to info@totetaxi.com. It is $50 extra. We need to know when the pickup is scheduled if the building requires a COI.'
  },
  
  // Booking
  {
    category: 'booking',
    question: 'If I want to add a bag last minute can I?',
    answer: 'Tote Taxi can take as many bags as needed/requested by the client. Please inform the messenger of the change - we\'ll be able to properly document the delivery request in our system. The card on file will be billed for any additional items.'
  },
  {
    category: 'booking',
    question: 'What is your cancellation policy?',
    answer: 'You must cancel within 48 hours of booking for a full refund. This does not apply for holiday weekends or sold-out dates. Credit will be issued for any cancellations.'
  },
  {
    category: 'booking',
    question: 'How do I edit my order?',
    answer: 'Please email us at orders@totetaxi.com. We will gladly assist you with any changes.'
  }
];

const categories = {
  general: 'General Information',
  service: 'Service Details',
  'mini-moves': 'Mini Moves',
  booking: 'Booking & Orders'
};

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string>('general');
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
          <p className="text-xl text-navy-700 max-w-3xl mx-auto mb-4">
            Everything you need to know about Tote Taxi's delivery service.
          </p>
          <p className="text-lg text-navy-600">
            Can't find what you're looking for? <Link href="/contact" className="text-navy-900 hover:underline">Contact us</Link> for personalized assistance.
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
                    className="w-full text-left py-4 flex justify-between items-start"
                  >
                    <h3 className="text-lg font-medium text-navy-900 pr-4">
                      {faq.question}
                    </h3>
                    <span className={`text-navy-900 transition-transform flex-shrink-0 ${
                      openQuestions.has(index) ? 'rotate-180' : ''
                    }`}>
                      ↓
                    </span>
                  </button>
                  {openQuestions.has(index) && (
                    <div className="pb-4 pt-2 border-t border-gray-100">
                      <div className="text-navy-700 leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <section className="mb-16">
          <h2 className="text-2xl font-serif font-bold text-navy-900 text-center mb-8">
            Important Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card variant="default" className="border-red-200 bg-red-50">
              <CardContent>
                <h3 className="font-medium text-navy-900 mb-3">Liability Limitations</h3>
                <p className="text-navy-700 text-sm leading-relaxed">
                  In consideration of the rate charged, it is agreed that the value of shipments 
                  is not greater than $150.00 unless a greater value is declared and insurance 
                  purchased at the time the order is placed. All claims for loss or damage must 
                  be submitted verbally within 24 hours and in writing by certified mail within 
                  30 days of pickup or delivery.
                </p>
              </CardContent>
            </Card>

            <Card variant="default" className="border-gold-200 bg-gold-50">
              <CardContent>
                <h3 className="font-medium text-navy-900 mb-3">Office Location</h3>
                <div className="text-navy-700 text-sm">
                  <p className="mb-2"><strong>395 County Road 39A</strong></p>
                  <p className="mb-2">Southampton, NY 11968</p>
                  <p className="mb-2">Daily luggage storage available: $20/day</p>
                  <p>Contact us to arrange pickup/drop-off</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Items We Cannot Transport */}
        <section className="mb-16">
          <Card variant="elevated">
            <CardContent>
              <h2 className="text-2xl font-serif font-bold text-navy-900 mb-6 text-center">
                Items We Cannot Transport
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Prohibited Items Include:</h3>
                  <ul className="space-y-1 text-navy-700 text-sm">
                    <li>• Dangerous goods or hazardous materials</li>
                    <li>• Explosives, fireworks, flammable goods</li>
                    <li>• Cash, coins, currency, negotiable instruments</li>
                    <li>• Human or animal remains</li>
                    <li>• Lottery tickets and gambling devices</li>
                    <li>• Pornographic materials</li>
                    <li>• Tobacco products and cigarettes</li>
                    <li>• Prescription drugs (with limited exceptions)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Additional Restrictions:</h3>
                  <ul className="space-y-1 text-navy-700 text-sm">
                    <li>• Perishable foods requiring refrigeration</li>
                    <li>• Live plants and cut flowers</li>
                    <li>• Containers of liquids over 8 gallons</li>
                    <li>• Used gasoline tanks or gasoline-powered devices</li>
                    <li>• Packages that are wet, leaking, or emit odors</li>
                    <li>• Items requiring special licenses or permits</li>
                    <li>• Merchandise from sanctioned countries</li>
                    <li>• Switchblades and certain knives</li>
                  </ul>
                </div>
              </div>
              <p className="text-center text-navy-600 text-sm mt-6">
                If you're unsure about an item, please contact us before booking.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Still Have Questions */}
        <div className="text-center">
          <Card variant="luxury">
            <CardContent>
              <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
                Still Have Questions?
              </h2>
              <p className="text-navy-700 mb-6 max-w-2xl mx-auto">
                Our Customer Service Team is available to help with any questions. 
                We're here to make your delivery experience seamless.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button variant="primary" size="lg">
                    Contact Us
                  </Button>
                </Link>
                <Link href="mailto:info@totetaxi.com">
                  <Button variant="outline" size="lg">
                    Email: info@totetaxi.com
                  </Button>
                </Link>
                <Link href="tel:631-595-5100">
                  <Button variant="outline" size="lg">
                    Call: 631-595-5100
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