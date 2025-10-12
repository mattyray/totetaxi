'use client';

import { OnfleetTask } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeliveryTrackingProps {
  bookingStatus: string;
  onfleetTasks: OnfleetTask[];
}

export function DeliveryTracking({ bookingStatus, onfleetTasks }: DeliveryTrackingProps) {
  // Find pickup and dropoff tasks
  const pickupTask = onfleetTasks.find(task => task.task_type === 'pickup');
  const dropoffTask = onfleetTasks.find(task => task.task_type === 'dropoff');
  
  // Determine overall delivery status
  const getDeliveryStatus = () => {
    if (bookingStatus === 'completed') {
      return { label: '✅ Delivered', color: 'bg-green-100 text-green-800' };
    }
    
    if (dropoffTask?.status === 'active') {
      return { label: '🚚 Out for Delivery', color: 'bg-blue-100 text-blue-800' };
    }
    
    if (dropoffTask?.status === 'assigned' || pickupTask?.status === 'active') {
      return { label: '📦 Driver En Route', color: 'bg-purple-100 text-purple-800' };
    }
    
    if (bookingStatus === 'paid' || bookingStatus === 'confirmed') {
      return { label: '⏳ Awaiting Driver Assignment', color: 'bg-amber-100 text-amber-800' };
    }
    
    return { label: '📋 Pending', color: 'bg-gray-100 text-gray-800' };
  };
  
  const status = getDeliveryStatus();
  
  // If no tasks exist yet, show simple status
  if (!pickupTask && !dropoffTask) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-navy-900">🚚 Delivery Status</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${status.color} mb-4`}>
              {status.label}
            </div>
            <p className="text-navy-600 text-sm">
              Delivery tracking will be available once your booking is confirmed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-navy-900">🚚 Delivery Tracking</h3>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Tracking Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pickupTask && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-navy-900">📦 Pickup</span>
                <TaskStatusBadge status={pickupTask.status} />
              </div>
              
              {pickupTask.worker_name && (
                <p className="text-xs text-navy-600">
                  Driver: {pickupTask.worker_name}
                </p>
              )}
              
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => window.open(pickupTask.tracking_url, '_blank')}
              >
                Track Pickup →
              </Button>
            </div>
          )}
          
          {dropoffTask && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-navy-900">🚚 Delivery</span>
                <TaskStatusBadge status={dropoffTask.status} />
              </div>
              
              {dropoffTask.worker_name && (
                <p className="text-xs text-navy-600">
                  Driver: {dropoffTask.worker_name}
                </p>
              )}
              
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => window.open(dropoffTask.tracking_url, '_blank')}
              >
                Track Delivery →
              </Button>
            </div>
          )}
        </div>
        
        {/* Completion Info */}
        {bookingStatus === 'completed' && dropoffTask?.completed_at && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-900 mb-1">
              ✅ Delivery Complete
            </p>
            <p className="text-xs text-green-700">
              Delivered on {new Date(dropoffTask.completed_at).toLocaleDateString()} at{' '}
              {new Date(dropoffTask.completed_at).toLocaleTimeString()}
            </p>
            {dropoffTask.worker_name && (
              <p className="text-xs text-green-700 mt-1">
                By: {dropoffTask.worker_name}
              </p>
            )}
          </div>
        )}
        
        {/* SMS Notification Info */}
        <div className="text-xs text-navy-600 bg-navy-50 rounded p-3">
          <p className="font-medium mb-1">📱 SMS Notifications:</p>
          <p>You'll receive text updates when your driver starts pickup and delivery.</p>
        </div>
        
      </CardContent>
    </Card>
  );
}

// Helper component for status badges
function TaskStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    created: { label: 'Unassigned', color: 'bg-gray-100 text-gray-700' },
    assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
    active: { label: 'En Route', color: 'bg-purple-100 text-purple-700' },
    completed: { label: 'Complete', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
    deleted: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  };
  
  const config = statusConfig[status] || statusConfig.created;
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}