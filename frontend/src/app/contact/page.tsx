// frontend/src/app/contact/page.tsx
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
    subject: '',
    message: '',
    preferredContact: 'email'
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
            <div className="text-6xl mb-6">✨</div>
            <h1 className="text-3xl font-serif font-bold text-navy-900 mb-6">
              Thank You for Reaching Out
            </h1>
            <Card variant="luxury">
              <CardContent>
                <p className="text-navy-700 mb-6">
                  We've received your message and will respond within 2 hours during business hours. 
                  For urgent requests, please call us directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/book">
                    <Button variant="primary">
                      Book Your Move
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
            Get in Touch
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto">
            Ready to experience white-glove service? Have questions about your move? 
            Our team is here to help make your Hamptons transport seamless.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card variant="elevated">
              <CardHeader>
                <h2 className="text-2xl font-serif font-bold text-navy-900">
                  Send Us a Message
                </h2>
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
                      placeholder="John Smith"
                    />
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@email.com"
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
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white"
                    >
                      <option value="">Select a subject</option>
                      <option value="booking-inquiry">Booking Inquiry</option>
                      <option value="pricing-question">Pricing Question</option>
                      <option value="service-areas">Service Areas</option>
                      <option value="organizing-services">Organizing Services</option>
                      <option value="building-requirements">Building Requirements</option>
                      <option value="partnership">Partnership Opportunity</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Tell us about your move or ask any questions..."
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-3">
                      Preferred Contact Method
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="preferredContact"
                          value="email"
                          checked={formData.preferredContact === 'email'}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        <span className="text-navy-700">Email</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="preferredContact"
                          value="phone"
                          checked={formData.preferredContact === 'phone'}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        <span className="text-navy-700">Phone</span>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Sending Message...' : 'Send Message'}
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
                  Speak with Our Team
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Phone</h4>
                    <p className="text-navy-700">
                      <a href="tel:+1-555-TOTE-TAXI" className="hover:underline">
                        (555) TOTE-TAXI
                      </a>
                    </p>
                    <p className="text-sm text-navy-600">
                      Monday - Friday: 8 AM - 8 PM<br />
                      Saturday - Sunday: 9 AM - 6 PM
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Email</h4>
                    <p className="text-navy-700">
                      <a href="mailto:hello@totetaxi.com" className="hover:underline">
                        hello@totetaxi.com
                      </a>
                    </p>
                    <p className="text-sm text-navy-600">
                      We respond within 2 hours during business hours
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Emergency</h4>
                    <p className="text-navy-700">
                      <a href="tel:+1-555-URGENT-99" className="hover:underline">
                        (555) URGENT-99
                      </a>
                    </p>
                    <p className="text-sm text-navy-600">
                      For time-sensitive delivery issues
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Areas */}
            <Card variant="elevated">
              <CardHeader>
                <h3 className="text-xl font-serif font-bold text-navy-900">
                  Service Areas
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Pickup Locations</h4>
                    <ul className="text-sm text-navy-700 space-y-1">
                      <li>• Manhattan (All neighborhoods)</li>
                      <li>• Brooklyn (Select areas)</li>
                      <li>• Long Island City</li>
                      <li>• Hoboken & Jersey City</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Delivery Areas</h4>
                    <ul className="text-sm text-navy-700 space-y-1">
                      <li>• East Hampton</li>
                      <li>• Southampton</li>
                      <li>• Bridgehampton</li>
                      <li>• Westhampton Beach</li>
                      <li>• Sag Harbor & Montauk</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Booking CTA */}
            <Card variant="default" className="border-gold-200 bg-gold-50">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-navy-900 mb-3">
                    Ready to Book?
                  </h3>
                  <p className="text-navy-700 text-sm mb-4">
                    Skip the contact form and start your booking directly. 
                    Get instant pricing and schedule your luxury move.
                  </p>
                  <Link href="/book">
                    <Button variant="primary" className="w-full">
                      Start Your Booking
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