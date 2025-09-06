'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { TestAPIConnection } from '@/components/test-api-connection';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useState } from 'react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* API Connection Test */}
        <div className="mb-8">
          <TestAPIConnection />
        </div>
        
        {/* Component Testing */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-serif font-bold text-navy-900">Component Testing</h2>
          
          {/* Button Variants */}
          <Card variant="elevated" className="space-y-4">
            <CardHeader>
              <h3 className="text-lg font-medium text-navy-900">Button Variants</h3>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" size="sm">Primary Small</Button>
                <Button variant="secondary" size="md">Secondary Medium</Button>
                <Button variant="outline" size="lg">Outline Large</Button>
                <Button variant="ghost" size="xl">Ghost XL</Button>
              </div>
            </CardContent>
          </Card>

          {/* Card Variants */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default">
              <CardContent>
                <h4 className="font-medium text-navy-900 mb-2">Default Card</h4>
                <p className="text-navy-600 text-sm">Standard card styling</p>
              </CardContent>
            </Card>
            
            <Card variant="elevated">
              <CardContent>
                <h4 className="font-medium text-navy-900 mb-2">Elevated Card</h4>
                <p className="text-navy-600 text-sm">With shadow elevation</p>
              </CardContent>
            </Card>
            
            <Card variant="luxury">
              <CardContent>
                <h4 className="font-medium text-navy-900 mb-2">Luxury Card</h4>
                <p className="text-navy-600 text-sm">Premium styling with gold border</p>
              </CardContent>
            </Card>
          </div>

          {/* Modal Test */}
          <Card variant="default">
            <CardContent>
              <Button onClick={() => setIsModalOpen(true)}>Open Modal Test</Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Original Hero */}
        <div className="text-center">
          <h1 className="text-5xl font-serif font-bold text-navy-900 mb-6">
            Luxury Delivery to the Hamptons
          </h1>
          <p className="text-xl text-navy-700 mb-8 max-w-2xl mx-auto">
            From suitcases to surfboards, ToteTaxi makes seasonal relocation effortless, polished, and convenient.
          </p>
          <Button variant="primary" size="lg">
            Book Your Move
          </Button>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Test Modal"
        description="This is a test of the modal component"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-navy-700">Modal content goes here. You can put forms, information, or any other content.</p>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}