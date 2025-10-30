// frontend/src/app/press/page.tsx
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function PressPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-6">
            Tote Taxi in the Media
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto">
            Leading publications have featured Tote Taxi's innovative approach to luxury courier services and seasonal relocation.
          </p>
        </div>

        {/* Featured Press */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-8">
            Featured Coverage
          </h2>
          <Card variant="luxury">
            <CardContent>
              <div className="space-y-4">
                <PressLink 
                  publication="The New York Times"
                  title="Tote Taxi Brings Convenience to Hamptons Delivery"
                  date="July 2025"
                  url="https://www.nytimes.com/2025/07/18/style/tote-taxi-hamptons-delivery.html"
                />
                <PressLink 
                  publication="Vogue Business"
                  title="How Luxury Brands Reached Peak Hamptons This Summer"
                  url="https://www.voguebusiness.com/story/fashion/how-luxury-brands-reached-peak-hamptons-this-summer"
                />
                <PressLink 
                  publication="Business Insider"
                  title="A Day in the Life of Tote Taxi's Hamptons Service"
                  date="August 2020"
                  url="https://www.businessinsider.com/tote-taxi-hamptons-service-day-in-the-life-2020-8"
                />
                <PressLink 
                  publication="Newsday"
                  title="Tote Taxi Founder Danielle Candela on Building a Hamptons Essential"
                  date="2024"
                  url="https://www.newsday.com/business/tote-taxi-danielle-candela-jyujtn2g"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* All Press Coverage */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-8">
            All Press Coverage
          </h2>
          <Card variant="elevated">
            <CardContent>
              <div className="space-y-3">
                <PressLink 
                  publication="James Lane Post"
                  title="Tote Taxi Offers Expanded Lifestyle Services & One-Stop Shopping For Clients"
                  date="June 2025"
                  url="https://jameslanepost.com/tote-taxi-offers-expanded-lifestyle-services-one-stop-shopping-for-clients/06/11/2025/Hamptons-News-Happenings"
                />
                <PressLink 
                  publication="Hamptons Magazine"
                  title="Hamptons Delivery Service: Tote Taxi & Dora Maar Partnership"
                  url="https://mlhamptons.com/hamptons-delivery-service-tote-taxi-dora-maar"
                />
                <PressLink 
                  publication="Blade"
                  title="Move Your Belongings Back to the City This Fall with Tote Taxi"
                  url="https://www.blade.com/mini-moves"
                />
                <PressLink 
                  publication="Palm Beach Daily News"
                  title="Tote Taxi Luxury Courier Service Gains Foothold in Palm Beach"
                  url="https://www.palmbeachdailynews.com/restricted/?return=https%3A%2F%2Fwww.palmbeachdailynews.com%2Fstory%2Fnews%2Flocal%2F2022%2F04%2F25%2Ftote-taxi-luxury-courier-service-gains-foothold-palm-beach%2F9468481002%2F"
                />
                <PressLink 
                  publication="Bella Mag"
                  title="Dora Maar Announces Partnership with Tote Taxi for Summer Curation"
                  url="https://bellamag.co/dora-maar-announces-partnership-with-tote-taxi-for-summer-curation-hamptons-delivery/"
                />
                <PressLink 
                  publication="James Lane Post"
                  title="Tote Taxi Founder Danielle Candela Talks Entrepreneurial Journey"
                  date="August 2022"
                  url="https://jameslanepost.com/tote-taxi-founder-danielle-candela-talks-entrepreneurial-journey/08/29/2022/Hamptons-News-Happenings"
                />
                <PressLink 
                  publication="New York Post"
                  title="The Most Ridiculous Things Tote Taxi Has Hauled to the Hamptons"
                  date="May 2019"
                  url="https://nypost.com/2019/05/23/the-most-ridiculous-things-tote-taxi-has-hauled-to-the-hamptons/"
                />
                <PressLink 
                  publication="Hamptons Social"
                  title="Tote Taxi: The Hamptons' Essential Courier Service"
                  url="https://hamptons-social.com/tote-taxi/"
                />
                <PressLink 
                  publication="27 East"
                  title="Tote Taxi Teams Up with Heart of the Hamptons for Holiday Season"
                  url="https://www.27east.com/southampton-press/tote-taxi-teams-up-with-heart-of-the-hamptons-for-holiday-season-1591468/"
                />
                <PressLink 
                  publication="Dora Maar"
                  title="Tote Taxi Same-Day Hamptons Delivery Partnership"
                  url="https://dora-maar.com/pages/tote-taxi-same-day-hamptons-delivery"
                />
                <PressLink 
                  publication="Curbed"
                  title="Tote Taxi: Hamptons Courier Service Launches"
                  date="June 2018"
                  url="https://hamptons.curbed.com/2018/6/13/17439038/tote-taxi-hamptons-courier-service"
                />
                <PressLink 
                  publication="Dan's Papers"
                  title="Tote Taxi Takes Wheel on Door-to-Door Courier Service in the Hamptons"
                  date="June 2018"
                  url="https://www.danspapers.com/2018/06/tote-taxi-door-to-door-courier-service-hamptons/"
                />
                <PressLink 
                  publication="hamptons.com"
                  title="Tote Taxi Wins Inaugural RipTide $ink or $wim"
                  url="https://hamptons.com/community-community-news-24070-tote-taxi-wins-inaugural-riptide-ink-or-wim-html/"
                />
                <PressLink 
                  publication="Medium"
                  title="Pop Quiz Monday with Danielle Candela, Founder & CEO at Tote Taxi"
                  url="https://medium.com/artlegends/pop-quiz-monday-with-danielle-candela-founder-ceo-at-tote-taxi-4cc3d56b5d61"
                />
                <PressLink 
                  publication="Pure Wow"
                  title="Tote Taxi Courier Service: Hamptons Travel Made Easy"
                  url="https://www.purewow.com/travel/tote-taxi-courier-hamptons"
                />
                <PressLink 
                  publication="Newsday"
                  title="Tote Taxi: Hamptons Courier Service Launches"
                  url="https://www.newsday.com/news/tote-taxi-hamptons-courier-service-s47623"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Awards */}
        <section className="mb-12">
          <Card variant="luxury">
            <CardHeader>
              <h2 className="text-3xl font-serif font-bold text-navy-900 text-center">
                Awards & Recognition
              </h2>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="inline-block bg-gold-100 border-2 border-gold-400 rounded-lg p-6">
                  <div className="text-4xl mb-2">🏆</div>
                  <h3 className="text-xl font-bold text-navy-900 mb-2">
                    RipTide $ink or $wim Winner
                  </h3>
                  <p className="text-navy-700">
                    First place in Southampton's premier startup pitch competition (2017)
                  </p>
                  <p className="text-navy-600 text-sm mt-2">
                    $15,000 prize + mentorship from leading East End business leaders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Media Contact */}
        <section>
          <Card variant="elevated">
            <CardContent>
              <div className="text-center">
                <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
                  Media Inquiries
                </h2>
                <p className="text-navy-700 mb-4">
                  For press inquiries, please contact:
                </p>
                <p className="text-navy-900 font-medium">
                  Email: <a href="mailto:press@totetaxi.com" className="text-navy-600 hover:text-navy-900 underline">press@totetaxi.com</a>
                </p>
                <p className="text-navy-900 font-medium">
                  Phone: <a href="tel:631-595-5100" className="text-navy-600 hover:text-navy-900 underline">631-595-5100</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}

// Helper component for press links
function PressLink({ publication, title, date, url }: { 
  publication: string; 
  title: string; 
  date?: string;
  url: string;
}) {
  return (
    <div className="border-b border-gray-200 pb-3 last:border-0">
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block hover:bg-gold-50 rounded p-2 -m-2 transition-colors"
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <span className="font-medium text-navy-900 group-hover:text-navy-600">
              {publication}
            </span>
            <span className="text-navy-700"> — {title}</span>
          </div>
          {date && (
            <span className="text-sm text-navy-500 whitespace-nowrap">{date}</span>
          )}
        </div>
        <span className="text-xs text-navy-500 group-hover:text-navy-700">
          Read Article →
        </span>
      </a>
    </div>
  );
}