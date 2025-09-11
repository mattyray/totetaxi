// frontend/src/app/about/page.tsx
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
            Redefining Luxury Transport
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto">
            ToteTaxi was born from a simple observation: the journey between Manhattan and the Hamptons 
            shouldn't be complicated by logistics. We exist to make seasonal living effortless.
          </p>
        </div>

        {/* Story Section */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-navy-700">
                <p>
                  Founded by Manhattan residents who split their time between the city and the Hamptons, 
                  ToteTaxi emerged from personal frustration with existing transport options. Traditional 
                  moving services were overkill for seasonal needs, while shipping services lacked the 
                  care and reliability our belongings deserved.
                </p>
                <p>
                  We envisioned a service that understood the unique rhythm of Hamptons life—the weekend 
                  essentials, the seasonal wardrobes, the cherished items that make a house feel like home. 
                  ToteTaxi bridges that gap with white-glove service tailored specifically for the 
                  Manhattan-to-Hamptons lifestyle.
                </p>
                <p>
                  Today, we're proud to serve discerning clients who value time, quality, and peace of mind. 
                  From Tribeca penthouses to East Hampton estates, we handle each move with the care and 
                  attention it deserves.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-cream-100 to-gold-50 rounded-lg p-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-navy-900 mb-2">500+</div>
                <p className="text-navy-600 mb-4">Successful Moves</p>
                
                <div className="text-4xl font-bold text-navy-900 mb-2">Zero</div>
                <p className="text-navy-600 mb-4">Items Lost or Damaged</p>
                
                <div className="text-4xl font-bold text-navy-900 mb-2">98%</div>
                <p className="text-navy-600">Customer Satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="elevated">
              <CardHeader>
                <div className="text-center">
                  <div className="text-4xl mb-4">🛡️</div>
                  <h3 className="text-xl font-medium text-navy-900">Trust & Security</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 text-center">
                  Your belongings are precious. We treat every item with the care we'd give our own, 
                  backed by comprehensive insurance and rigorous security protocols.
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <div className="text-center">
                  <div className="text-4xl mb-4">⭐</div>
                  <h3 className="text-xl font-medium text-navy-900">Excellence</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 text-center">
                  We don't just move items—we curate experiences. Every detail is considered, 
                  from protective wrapping to precise delivery timing.
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <div className="text-center">
                  <div className="text-4xl mb-4">🤝</div>
                  <h3 className="text-xl font-medium text-navy-900">Relationship</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 text-center">
                  We're not a faceless service—we're your trusted partners in maintaining your 
                  bi-coastal lifestyle. Many clients have been with us for years.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
            The Team Behind Your Trust
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <Card variant="luxury">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-navy-900 mb-2">Operations Team</h3>
                  <p className="text-navy-700 mb-4">
                    Our logistics coordinators are the backbone of every successful move. With backgrounds 
                    in luxury hospitality and high-end moving services, they orchestrate each delivery 
                    with precision timing and attention to detail.
                  </p>
                  <ul className="text-sm text-navy-600 space-y-1">
                    <li>• 24/7 customer communication</li>
                    <li>• Real-time tracking and updates</li>
                    <li>• Proactive problem resolution</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card variant="luxury">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-navy-900 mb-2">Handling Specialists</h3>
                  <p className="text-navy-700 mb-4">
                    Our trained professionals understand that your belongings aren't just objects—they're 
                    pieces of your life. Each team member is vetted, bonded, and trained in our 
                    white-glove handling protocols.
                  </p>
                  <ul className="text-sm text-navy-600 space-y-1">
                    <li>• Specialized packing techniques</li>
                    <li>• Fragile item expertise</li>
                    <li>• Respectful home service</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Partners Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
            Trusted Partners
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🚁</div>
              <h3 className="font-medium text-navy-900 mb-2">BLADE</h3>
              <p className="text-navy-600 text-sm">
                Official luggage transport partner for helicopter transfers to the Hamptons
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-medium text-navy-900 mb-2">Cultured Magazine</h3>
              <p className="text-navy-600 text-sm">
                Trusted distribution partner for premium lifestyle publications
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏃‍♀️</div>
              <h3 className="font-medium text-navy-900 mb-2">Tracy Anderson</h3>
              <p className="text-navy-600 text-sm">
                Equipment delivery for luxury fitness pop-up experiences
              </p>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="mb-20">
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-2xl font-serif font-bold text-navy-900 text-center">
                Licenses & Insurance
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Professional Credentials</h3>
                  <ul className="space-y-2 text-navy-700">
                    <li>• Licensed and bonded moving services</li>
                    <li>• DOT-compliant operations</li>
                    <li>• Professional liability coverage</li>
                    <li>• Background-checked team members</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Insurance Coverage</h3>
                  <ul className="space-y-2 text-navy-700">
                    <li>• Comprehensive cargo protection</li>
                    <li>• Full replacement value coverage</li>
                    <li>• Certificate of Insurance available</li>
                    <li>• Building requirement compliance</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
            Ready to Join Our Family of Satisfied Clients?
          </h2>
          <p className="text-navy-700 mb-8 max-w-2xl mx-auto">
            Experience the difference that true white-glove service makes. 
            Book your first move and discover why ToteTaxi is the preferred choice 
            for discerning Manhattan and Hamptons residents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book">
              <Button variant="primary" size="lg">
                Book Your Move
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Speak with Our Team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}