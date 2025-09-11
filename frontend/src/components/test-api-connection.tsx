// frontend/src/components/test-api-connection.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function TestAPIConnection() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Test services endpoint
  const { data: services, isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ['test', 'services'],
    queryFn: async () => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  // Test availability endpoint
  const testAvailability = async () => {
    try {
      const response = await apiClient.get('/api/public/availability/');
      setTestResults(prev => ({ ...prev, availability: { success: true, data: response.data } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, availability: { success: false, error: error.message } }));
    }
  };

  // Test pricing preview endpoint
  const testPricing = async () => {
    try {
      const response = await apiClient.post('/api/public/pricing-preview/', {
        service_type: 'mini_move',
        pickup_date: new Date().toISOString().split('T')[0],
        mini_move_package_id: services?.mini_move_packages?.[0]?.id,
        include_packing: false,
        include_unpacking: false,
        coi_required: false
      });
      setTestResults(prev => ({ ...prev, pricing: { success: true, data: response.data } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, pricing: { success: false, error: error.message } }));
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Hide in production
  }

  return (
    <Card variant="elevated" className="mb-8">
      <CardHeader>
        <h3 className="text-lg font-medium text-navy-900">API Connection Test</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Services Test */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">Services Endpoint:</span>
              <div className="text-sm">
                {servicesLoading && <span className="text-blue-600">Loading...</span>}
                {servicesError && <span className="text-red-600">Error: {servicesError.message}</span>}
                {services && <span className="text-green-600">✓ Connected ({services.mini_move_packages?.length || 0} packages loaded)</span>}
              </div>
            </div>
          </div>

          {/* Availability Test */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">Availability Test:</span>
              <div className="text-sm">
                {testResults.availability?.success && <span className="text-green-600">✓ Working</span>}
                {testResults.availability?.success === false && (
                  <span className="text-red-600">✗ Failed: {testResults.availability.error}</span>
                )}
              </div>
            </div>
            <Button size="sm" onClick={testAvailability}>Test</Button>
          </div>

          {/* Pricing Test */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">Pricing Test:</span>
              <div className="text-sm">
                {testResults.pricing?.success && (
                  <span className="text-green-600">
                    ✓ Working (${testResults.pricing.data.pricing.total_price_dollars})
                  </span>
                )}
                {testResults.pricing?.success === false && (
                  <span className="text-red-600">✗ Failed: {testResults.pricing.error}</span>
                )}
              </div>
            </div>
            <Button size="sm" onClick={testPricing} disabled={!services}>Test</Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Backend URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}