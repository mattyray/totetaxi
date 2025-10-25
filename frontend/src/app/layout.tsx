// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair' });

// This is what controls your social media previews
export const metadata: Metadata = {
  title: {
    default: "Tote Taxi - Premium Door-to-Door Delivery Service",
    template: "%s | Tote Taxi"
  },
  description: "Tote Taxi delivers your luggage and belongings stress-free between NYC, the Hamptons, South Florida, and all major airports. From suitcases to surfboards, Pelotons to pop-up props.",
  keywords: ["luggage delivery", "door-to-door service", "NYC", "Hamptons", "Florida", "airport delivery", "luxury transport"],
  
  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://totetaxi.com",
    siteName: "Tote Taxi",
    title: "Tote Taxi - Premium Door-to-Door Delivery Service",
    description: "Stress-free delivery between NYC, the Hamptons, and South Florida. We handle everything from suitcases to surfboards.",
    images: [
      {
        url: "https://totetaxi.com/assets/images/totetaxilogo.png",
        width: 1200,
        height: 630,
        alt: "Tote Taxi - Premium Delivery Service",
      },
      {
        url: "https://totetaxi.com/assets/images/hero-large.jpg",
        width: 1200,
        height: 630,
        alt: "Tote Taxi luxury delivery service",
      }
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Tote Taxi - Premium Door-to-Door Delivery",
    description: "Stress-free delivery between NYC, the Hamptons, and South Florida.",
    images: ["https://totetaxi.com/assets/images/totetaxilogo.png"],
  },
  
  // Additional SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  category: "business",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}