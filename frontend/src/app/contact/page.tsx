// frontend/src/app/contact/page.tsx - Real Tote Taxi contact info
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">📦</div>
            <h1 className="text-3xl font-serif font-bold text-navy-900 mb-6">
              We'll Get Back to You ASAP!
            </h1>
            <Card variant="luxury">
              <CardContent>
                <p className="text-navy-700 mb-6">
                  Your message has been received. Our team will respond as quickly as possible 
                  to help with your delivery needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/book">
                    <Button variant="primary">
                      Book a Delivery
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline">
                      Return Home
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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-6">
            Contact Us Now
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto mb-4">
            Can't find what you are looking for? Our Customer Service Team is available to help with any questions.
          </p>
          <p className="text-lg text-navy-600">
            Be sure to check out our <Link href="/faq" className="text-navy-900 hover:underline">FAQ here</Link>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card variant="elevated">
              <CardHeader>
                <h2 className="text-2xl font-serif font-bold text-navy-900">
                  Get Started Here
                </h2>
                <p className="text-navy-700">
                  Please fill out our <strong>brief survey</strong> and we'll get back to you ASAP.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your Name"
                    />
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@email.com"
                    />
                  </div>

                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />

                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1">
                      Service Needed <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white"
                    >
                      <option value="">Select a service</option>
                      <option value="mini-move">Mini Move</option>
                      <option value="standard-delivery">Standard Delivery</option>
                      <option value="blade-luggage">BLADE Luggage</option>
                      <option value="storage">Storage</option>
                      <option value="south-florida">South Florida Delivery</option>
                      <option value="custom">Custom Service</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1">
                      Tell Us About Your Needs <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Describe what you need delivered, pickup/delivery locations, dates, etc."
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white resize-vertical"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Direct Contact */}
            <Card variant="luxury">
              <CardHeader>
                <h3 className="text-xl font-serif font-bold text-navy-900">
                  Get in Touch Directly
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Email</h4>
                    <p className="text-navy-700">
                      <a href="mailto:info@totetaxi.com" className="hover:underline text-lg">
                        info@totetaxi.com
                      </a>
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Phone</h4>
                    <p className="text-navy-700">
                      <a href="tel:631-595-5100" className="hover:underline text-lg">
                        631-595-5100
                      </a>
                    </p>
                    <p className="text-sm text-navy-600 mt-1">
                      <em>For Courier Service – Priority Delivery, please call us.</em>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Areas */}
            <Card variant="elevated">
              <CardHeader>
                <h3 className="text-xl font-serif font-bold text-navy-900">
                  Our Service Areas
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 mb-4">
                  <strong>Tote Taxi is a same-day door-to-door delivery service</strong> covering:
                </p>
                <ul className="space-y-2 text-navy-700">
                  <li>• <strong>The Hamptons</strong> (all areas)</li>
                  <li>• <strong>NYC</strong> (Manhattan, Brooklyn, and more)</li>
                  <li>• <strong>All Major NY Airports</strong> (JFK, LGA, EWR)</li>
                  <li>• <strong>Connecticut</strong></li>
                  <li>• <strong>South Florida</strong> (Palm Beach, Miami, Boca Raton, Jupiter, Fort Lauderdale)</li>
                </ul>
                <p className="text-sm text-navy-600 mt-4">
                  <strong>Custom deliveries and services are available upon request.</strong>
                </p>
              </CardContent>
            </Card>

            {/* Special Inquiries */}
            <Card variant="default" className="border-gold-200 bg-gold-50">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-navy-900 mb-3">
                    Marketing & PR Inquiries
                  </h3>
                  <p className="text-navy-700 text-sm mb-4">
                    For partnership opportunities and media inquiries, please contact us directly.
                  </p>
                  <Link href="mailto:info@totetaxi.com?subject=Marketing%20Inquiry">
                    <Button variant="outline" size="sm">
                      Contact for Partnerships
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Booking CTA */}
            <Card variant="luxury">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-navy-900 mb-3">
                    Ready to Book?
                  </h3>
                  <p className="text-navy-700 text-sm mb-4">
                    Skip the contact form and start your delivery booking directly.
                  </p>
                  <Link href="/book">
                    <Button variant="primary" className="w-full">
                      Book Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}