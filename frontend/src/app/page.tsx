import { MainLayout } from '@/components/layout/main-layout';

export default function Home() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-serif font-bold text-navy-900 mb-6">
            Luxury Delivery to the Hamptons
          </h1>
          <p className="text-xl text-navy-700 mb-8 max-w-2xl mx-auto">
            From suitcases to surfboards, ToteTaxi makes seasonal relocation effortless, polished, and convenient.
          </p>
          <button className="bg-navy-900 text-white px-8 py-3 rounded-md hover:bg-navy-800 transition-colors text-lg font-medium">
            Book Your Move
          </button>
        </div>
      </div>
    </MainLayout>
  );
}