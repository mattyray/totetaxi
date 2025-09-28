// src/components/marketing/testimonials-section.tsx
import { Card, CardContent } from '@/components/ui/card';

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "I've heard amazing things about Tote Taxi for awhile now and finally used it for the first time today when I took Blade from JFK to Manhattan and LOVED it! It was so easy and seamless!",
      author: "Natalie M."
    },
    {
      quote: "We have been using Tote Taxi for the last three years when we come out to East Hampton and when we head back to the city. They've always been wonderful! Makes moving bikes and extras easy and stress free!",
      author: "Kimberly R."
    },
    {
      quote: "Tote Taxi was a lifesaver! They were so easy to coordinate with, showed up exactly on time, communicated well. I highly recommend their services.",
      author: "Robyn M."
    },
    {
      quote: "Seamless and fast delivery between Palm Beach and Bridgehampton. The service was excellent, Danielle responded quickly and was flexible/accommodating to our needs for both pick up and delivery.",
      author: "Samantha M."
    },
    {
      quote: "Had them pick up a rental tux in NYC and drive it out on Labor Day weekend. Totally saved the wedding!",
      author: "Richard M."
    },
    {
      quote: "Danielle and her team helped us move many rolling racks of high end, delicate clothing from one NYC apartment to another. They were professional, timely and awesome to work with!",
      author: "Lauren S."
    }
  ];

  return (
    <section className="py-16 bg-cream-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
          What Our Customers Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} variant="elevated">
              <CardContent>
                <p className="text-navy-700 text-sm mb-4">
                  &quot;{testimonial.quote}&quot;
                </p>
                <p className="font-medium text-navy-900">- {testimonial.author}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}