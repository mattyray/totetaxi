'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ServiceCatalog } from '@/types';

export function TestAPIConnection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-blue-700">Loading services from backend...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-700">Error connecting to backend:</p>
        <pre className="text-sm text-red-600 mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
      <h3 className="text-green-800 font-medium mb-2">✅ Backend Connected!</h3>
      <p className="text-green-700 text-sm">
        Found {data?.mini_move_packages?.length || 0} mini move packages
      </p>
      {data?.mini_move_packages && (
        <ul className="mt-2 text-sm text-green-600">
          {data.mini_move_packages.map((pkg) => (
            <li key={pkg.id}>
              {pkg.name}: ${pkg.base_price_dollars}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}