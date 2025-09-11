// frontend/src/app/about/page.tsx - Real Tote Taxi story
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-6">
            Welcome to Tote Taxi
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto">
            A door-to-door delivery, storage, courier, and mini moving service serving the Hamptons, 
            NYC, all major NY airports, Connecticut, and South Florida.
          </p>
        </div>

        {/* What We Do */}
        <section className="mb-20">
          <Card variant="luxury">
            <CardHeader>
              <h2 className="text-3xl font-serif font-bold text-navy-900 text-center">
                What We Do + Where We Go
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-navy-700 text-lg">
                  Tote Taxi offers a luxury <strong>multi-arm delivery service</strong> with additional{' '}
                  <strong>custom service offerings</strong> for people traveling to and from{' '}
                  <strong>New York</strong>, <strong>the Hamptons</strong>, <strong>South Florida</strong>{' '}
                  (Palm Beach, Boca Raton, Miami, Jupiter, Fort Lauderdale, and more), and{' '}
                  <strong>all major NYC airports</strong> (JFK, LGA, and EWR).
                </p>
                
                <div className="bg-gold-50 border border-gold-200 rounded-lg p-6">
                  <h3 className="font-medium text-navy-900 mb-3">We Carry It All</h3>
                  <p className="text-navy-700">
                    Same-day, door-to-door service for <strong>luggage, golf clubs, shopping bags, bikes, 
                    exercise equipment, baby gear, pet supplies, clothing, forgotten items, small furniture, 
                    accessories, and so much more.</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Our Philosophy */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-6">
                We Are Hands-On... So You Can Be Hands-Off
              </h2>
              <div className="space-y-4 text-navy-700">
                <p>
                  <strong>Convenience is a luxury.</strong> Don't want to take everything back with you? 
                  We offer day, weekend, and seasonal storage options – whether it's for a short trip 
                  or winter storage for your summer gear and essentials.
                </p>
                <p>
                  Every family needs a <strong>Mini Move</strong>. Tote Taxi offers the ability to pack 
                  whatever you need and get it quickly to your summer home and back to the city at the 
                  end of the season.
                </p>
                <p>
                  Do you need help packing? We are happy to recommend any one of our packing partners 
                  to ensure a clutter-free summer vacation. We truly tote it all – treating your items 
                  as if they were our own.
                </p>
              </div>
            </div>
            
            <Card variant="elevated">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-navy-900 mb-4">
                    A Trusted Luxury Delivery Service
                  </h3>
                  <p className="text-navy-700 mb-6">
                    Our professional same-day luxe courier service is perfect for forgotten or 
                    last-minute items. We also offer an array of <strong>custom services upon request</strong>.
                  </p>
                  <p className="text-navy-600 text-sm">
                    Providing seamless assistance and expert guidance, Tote Taxi elevates the travel experience – the haute courier.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Founder Story */}
        <section className="mb-20">
          <Card variant="luxury">
            <CardHeader>
              <h2 className="text-3xl font-serif font-bold text-navy-900 text-center">
                About Our Founder
              </h2>
            </CardHeader>
            <CardContent>
              <div className="max-w-3xl mx-auto">
                <h3 className="text-xl font-medium text-navy-900 mb-4 text-center">
                  Meet Danielle!
                </h3>
                
                <div className="space-y-4 text-navy-700">
                  <p>
                    Hello! It's a pleasure to meet you.
                  </p>
                  <p>
                    I started this business because I wanted a seamless way to get my suitcase 
                    (which was packed with too many shoes) to and from the Hamptons and NYC.
                  </p>
                  <p>
                    Are you flying with BLADE and need your golf bags waiting for you at Sebonack? 
                    Are you spending a Sunday at Surf Lodge and need a place to store your luggage 
                    for the day? Or, maybe you are spending the summer in the Hamptons and want to 
                    bring your Peloton?
                  </p>
                  <p>
                    Are you in the Hamptons and need a dress delivered to you for an event from 
                    Bergdorf Goodman last minute? Did you leave something small, but absolutely 
                    essential in the city? Let us help!
                  </p>
                  <p>
                    Whatever the case may be, we are here to help get your things where they need 
                    to go and with the utmost professional care.
                  </p>
                  <p className="text-center font-medium text-navy-900">
                    Thank you for the opportunity to serve you – see you at the beach!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Company Timeline */}
        <section className="mb-20">
          <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
            Our Journey
          </h2>
          <div className="space-y-8">
            <Card variant="elevated">
              <CardContent>
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-navy-900 text-white rounded-full flex items-center justify-center text-xl font-bold mr-6">
                    2016
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-navy-900">Founded</h3>
                    <p className="text-navy-700">Danielle Candela founded Tote Taxi to solve the stress of traveling with cumbersome luggage between Manhattan and the Hamptons.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardContent>
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-navy-900 text-white rounded-full flex items-center justify-center text-xl font-bold mr-6">
                    2018
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-navy-900">Official Launch</h3>
                    <p className="text-navy-700">Tote Taxi officially launched operations, focusing on convenience, style, and peace of mind for luxury travelers.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardContent>
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-navy-900 text-white rounded-full flex items-center justify-center text-xl font-bold mr-6">
                    2024
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-navy-900">Expanded Service</h3>
                    <p className="text-navy-700">Now serving NYC, Hamptons, Connecticut, South Florida, and all major NYC airports with partnerships including BLADE and Cultured Magazine.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
            Ready to Experience Hands-Free Travel?
          </h2>
          <p className="text-navy-700 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied clients who trust Tote Taxi for seamless delivery service. 
            From forgotten essentials to seasonal moves, we handle it all with professional care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book">
              <Button variant="primary" size="lg">
                Book Your Move
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Contact Our Team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}