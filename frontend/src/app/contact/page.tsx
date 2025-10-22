// frontend/src/app/contact/page.tsx
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      await apiClient.post('/api/customer/contact/', formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
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
                  Your message has been received. Our team will respond within 24 hours 
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
            Contact Us
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto mb-4">
            Have questions about our services? Our team is here to help.
          </p>
          <p className="text-lg text-navy-600">
            Be sure to check out our <Link href="/faq" className="text-navy-900 hover:underline font-medium">FAQ</Link> for quick answers.
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
                <p className="text-navy-700">
                  Fill out the form below and we'll respond within 24 hours.
                </p>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-navy-900 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your Name"
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@email.com"
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-navy-900 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(631) 555-1234"
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-navy-900 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white"
                    >
                      <option value="">Select a subject</option>
                      <option value="General">General Inquiry</option>
                      <option value="Booking Question">Booking Question</option>
                      <option value="BLADE">BLADE Airport Transfer</option>
                      <option value="Custom Quote">Custom Quote</option>
                      <option value="Issue">Issue with Service</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-navy-900 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Tell us about your needs..."
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
                      <a href="tel:+16315955100" className="hover:underline text-lg">
                        (631) 595-5100
                      </a>
                    </p>
                    <p className="text-sm text-navy-600 mt-1">
                      Available for immediate assistance
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Business Hours</h4>
                    <p className="text-navy-700 text-sm">
                      Monday - Friday: 8 AM - 6 PM EST<br />
                      Saturday - Sunday: 9 AM - 5 PM EST
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
                  <strong>Tote Taxi provides premium delivery service</strong> covering:
                </p>
                <ul className="space-y-2 text-navy-700">
                  <li>• <strong>Manhattan</strong> ↔ <strong>The Hamptons</strong></li>
                  <li>• <strong>Manhattan</strong> ↔ <strong>North Fork</strong></li>
                  <li>• <strong>Manhattan</strong> ↔ <strong>Connecticut</strong></li>
                  <li>• <strong>NYC Airports</strong> (JFK, LGA, EWR)</li>
                </ul>
                <p className="text-sm text-navy-600 mt-4">
                  <strong>Extended service available</strong> within 30 miles of Manhattan for an additional fee.
                </p>
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