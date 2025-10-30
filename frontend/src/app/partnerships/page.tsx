// frontend/src/app/partnerships/page.tsx
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PartnershipsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-6">
            Partner with Tote Taxi
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto">
            We collaborate with premier brands to create seamless, elevated experiences for our clients. From luxury fashion to hospitality, our partnerships enhance the Hamptons lifestyle.
          </p>
        </div>

        {/* Current Partners */}
        <section className="mb-16">
          <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
            Our Partners
          </h2>

          <div className="space-y-8">
            {/* Blade */}
            <Card variant="luxury">
              <CardHeader>
                <h3 className="text-2xl font-serif font-bold text-navy-900">
                  BLADE
                </h3>
                <p className="text-navy-600">Urban Air Mobility Partner</p>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 mb-4">
                  Tote Taxi is the official luggage delivery partner for Blade fliers. We transport belongings while you fly, eliminating weight restrictions and making your journey effortless. Featured partner since 2019.
                </p>
                <a 
                  href="https://www.blade.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-navy-600 hover:text-navy-900 underline"
                >
                  Visit Blade →
                </a>
              </CardContent>
            </Card>

            {/* Dora Maar */}
            <Card variant="luxury">
              <CardHeader>
                <h3 className="text-2xl font-serif font-bold text-navy-900">
                  DORA MAAR
                </h3>
                <p className="text-navy-600">Luxury Fashion Partner</p>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 mb-4">
                  Same-day delivery of luxury pre-owned fashion and home pieces from Dora Maar's curated collection directly to the Hamptons. We bring high-end shopping to your doorstep.
                </p>
                <p className="text-navy-600 italic mb-4">
                  "We love working with Tote Taxi — our customers don't know the phrase 'over-packing,' and neither do we! We are all about fun and fashion."
                </p>
                <a 
                  href="https://dora-maar.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-navy-600 hover:text-navy-900 underline"
                >
                  Visit Dora Maar →
                </a>
              </CardContent>
            </Card>

            {/* Red Horse Market */}
            <Card variant="luxury">
              <CardHeader>
                <h3 className="text-2xl font-serif font-bold text-navy-900">
                  RED HORSE MARKET
                </h3>
                <p className="text-navy-600">Welcome Package Partner</p>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 mb-4">
                  We've partnered with Red Horse Market to offer curated welcome packages with local favorites and essentials for families arriving at their Hamptons homes.
                </p>
                <p className="text-navy-600 italic mb-4">
                  "Collaborating with Tote Taxi ensures that renters and homeowners can kick off their time here with essentials and snacks while they settle in." — Christian Pineda, General Manager
                </p>
              </CardContent>
            </Card>

            {/* Hamptons Organizers */}
            <Card variant="luxury">
              <CardHeader>
                <h3 className="text-2xl font-serif font-bold text-navy-900">
                  HAMPTONS ORGANIZERS
                </h3>
                <p className="text-navy-600">Professional Organization Services</p>
              </CardHeader>
              <CardContent>
                <p className="text-navy-700 mb-4">
                  Tote Taxi partners with Hamptons Organizers for clients who need packing, unpacking, and home setup assistance. We handle the logistics while they handle the organization.
                </p>
                <p className="text-navy-600 italic">
                  "We handle the preparation of the house for the season and for everyone involved. Landlords rave about Tote Taxi's short-term storage service." — Lindsay McLoughlin, Founder
                </p>
              </CardContent>
            </Card>

            {/* Other Partners */}
            <Card variant="elevated">
              <CardHeader>
                <h3 className="text-2xl font-serif font-bold text-navy-900">
                  Additional Partners
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-navy-900">Saint James Iced Tea</h4>
                    <p className="text-navy-700 text-sm">Co-branded sprinter van partnership</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-navy-900">grüns</h4>
                    <p className="text-navy-700 text-sm">Wellness brand collaboration</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-navy-900">Tote Camps</h4>
                    <p className="text-navy-700 text-sm">Summer camp trunk delivery from White Plains, Paramus, Bethesda, and Cherry Hill</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Partnership Benefits */}
        <section className="mb-16">
          <Card variant="luxury">
            <CardHeader>
              <h2 className="text-3xl font-serif font-bold text-navy-900 text-center">
                Why Partner with Tote Taxi?
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h3 className="font-medium text-navy-900 mb-1">Access to Affluent Clientele</h3>
                    <p className="text-navy-700 text-sm">Reach high-net-worth families traveling between Manhattan and the Hamptons</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h3 className="font-medium text-navy-900 mb-1">Co-Marketing Opportunities</h3>
                    <p className="text-navy-700 text-sm">Featured in our communications, social media, and client touchpoints</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h3 className="font-medium text-navy-900 mb-1">Seamless Service Integration</h3>
                    <p className="text-navy-700 text-sm">We handle logistics so your brand delivers exceptional experiences</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h3 className="font-medium text-navy-900 mb-1">Luxury Lifestyle Alignment</h3>
                    <p className="text-navy-700 text-sm">Partner with a trusted name in Hamptons luxury services</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section>
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-8">
                <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
                  Interested in Partnering with Tote Taxi?
                </h2>
                <p className="text-navy-700 mb-6 max-w-2xl mx-auto">
                  We're always looking for like-minded luxury brands to create exceptional experiences for our mutual clients.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <Link href="/contact">
                    <Button variant="primary" size="lg">
                      Contact Us About Partnerships
                    </Button>
                  </Link>
                </div>
                <div className="text-navy-600">
                  <p>Email: <a href="mailto:partnerships@totetaxi.com" className="underline hover:text-navy-900">partnerships@totetaxi.com</a></p>
                  <p>Phone: <a href="tel:631-595-5100" className="underline hover:text-navy-900">631-595-5100</a></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}