// frontend/src/components/staff/logistics-management.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarIcon,
  PlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface OnfleetTask {
  id: string;
  booking_number: string;
  customer_name: string;
  task_type: 'pickup' | 'dropoff';
  onfleet_task_id: string;
  onfleet_short_id: string;
  tracking_url: string;
  recipient_name: string;
  recipient_phone: string;
  status: 'created' | 'assigned' | 'active' | 'completed' | 'failed' | 'deleted';
  worker_name: string;
  worker_id?: string;
  estimated_arrival?: string | null;
  completed_at?: string | null;
  started_at?: string | null;
  created_at: string;
  last_synced?: string | null;
  environment: 'sandbox' | 'production';
  linked_to?: string | null;
}

interface LogisticsSummary {
  active_tasks: number;
  tasks_today: number;
  completed_today: number;
  pending_tasks: number;
  completion_rate: number;
  onfleet_stats: {
    active_tasks: number;
    available_workers: number;
    organization_name: string;
  };
  integration_stats: {
    tasks_created_today: number;
    pickup_tasks: number;
    dropoff_tasks: number;
  };
  environment: 'sandbox' | 'production';
  mock_mode: boolean;
}

interface TasksResponse {
  success: boolean;
  tasks: OnfleetTask[];  // Backend returns 'tasks' not 'results'
  count: number;
}

interface TaskFilters {
  status: string;
  task_type: string;
  date: string;
  search: string;
}

export function LogisticsManagement() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TaskFilters>({
    status: '',
    task_type: '',
    date: '',
    search: '',
  });
  const [selectedTask, setSelectedTask] = useState<OnfleetTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createBookingId, setCreateBookingId] = useState('');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['staff', 'logistics', 'summary'],
    queryFn: async (): Promise<LogisticsSummary> => {
      const response = await apiClient.get('/api/staff/logistics/summary/');
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery<TasksResponse>({
    queryKey: ['staff', 'logistics', 'tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.task_type) params.append('task_type', filters.task_type);
      if (filters.date) params.append('date', filters.date);
      if (filters.search) params.append('search', filters.search);

      const response = await apiClient.get(`/api/staff/logistics/tasks/?${params}`);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/staff/logistics/sync/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'logistics'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post('/api/staff/logistics/create-task/', {
        booking_id: bookingId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'logistics'] });
      setShowCreateModal(false);
      setCreateBookingId('');
    },
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleCreateTask = () => {
    if (createBookingId.trim()) {
      createTaskMutation.mutate(createBookingId);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      created: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      active: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      deleted: 'bg-gray-100 text-gray-500',
    };
    return badges[status as keyof typeof badges] || badges.created;
  };

  const getTaskTypeIcon = (taskType: string) => {
    return taskType === 'pickup' ? (
      <MapPinIcon className="w-5 h-5 text-blue-600" />
    ) : (
      <TruckIcon className="w-5 h-5 text-green-600" />
    );
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-900">
            Logistics Management
          </h1>
          <p className="text-navy-600 mt-1">
            Real-time delivery tracking and task management
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Status'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Environment Badge */}
      {summary && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`px-3 py-1 rounded-full font-medium ${
            summary.environment === 'production'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {summary.environment.toUpperCase()}
          </span>
          {summary.mock_mode && (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
              MOCK MODE
            </span>
          )}
        </div>
      )}

      {/* Statistics Grid */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Active Tasks</p>
                  <p className="text-3xl font-bold text-navy-900 mt-2">
                    {summary.active_tasks}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TruckIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Today&apos;s Deliveries</p>
                  <p className="text-3xl font-bold text-navy-900 mt-2">
                    {summary.tasks_today}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Completed Today</p>
                  <p className="text-3xl font-bold text-navy-900 mt-2">
                    {summary.completed_today}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-navy-900 mt-2">
                    {summary.completion_rate}%
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onfleet Integration Stats */}
      {summary?.onfleet_stats && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-navy-900">Onfleet Integration</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-navy-600">Organization</p>
                <p className="text-lg font-semibold text-navy-900 mt-1">
                  {summary.onfleet_stats.organization_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-navy-600">Available Workers</p>
                <p className="text-lg font-semibold text-navy-900 mt-1">
                  {summary.onfleet_stats.available_workers}
                </p>
              </div>
              <div>
                <p className="text-sm text-navy-600">Tasks Today</p>
                <p className="text-lg font-semibold text-navy-900 mt-1">
                  {summary.integration_stats.pickup_tasks + summary.integration_stats.dropoff_tasks}
                  <span className="text-sm text-navy-500 ml-2">
                    ({summary.integration_stats.pickup_tasks} pickup, {summary.integration_stats.dropoff_tasks} dropoff)
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder="Search booking number..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="">All Statuses</option>
              <option value="created">Created</option>
              <option value="assigned">Assigned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filters.task_type}
              onChange={(e) => setFilters({ ...filters, task_type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="">All Task Types</option>
              <option value="pickup">Pickup</option>
              <option value="dropoff">Dropoff</option>
            </select>
            <Input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-navy-900">Active Tasks</h2>
            {tasksData && (
              <span className="text-sm text-navy-600">
                {tasksData.count} tasks
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
            </div>
          ) : !tasksData?.tasks || tasksData.tasks.length === 0 ? (
            <div className="text-center py-8 text-navy-600">
              No tasks found matching your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {tasksData.tasks.map((task: OnfleetTask) => (
                <div
                  key={task.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-navy-300 transition-colors cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getTaskTypeIcon(task.task_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-navy-900">
                            #{task.booking_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(task.status)}`}>
                            {task.status}
                          </span>
                          <span className="text-xs text-navy-600 bg-gray-100 px-2 py-0.5 rounded">
                            {task.task_type}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-navy-900 font-medium">
                            {task.customer_name}
                          </p>
                          {task.recipient_name && (
                            <div className="flex items-center gap-2 text-navy-600">
                              <PhoneIcon className="w-4 h-4" />
                              <span>{task.recipient_name} - {task.recipient_phone}</span>
                            </div>
                          )}
                          {task.worker_name && (
                            <p className="text-navy-600">
                              Driver: {task.worker_name}
                            </p>
                          )}
                          {task.estimated_arrival && (
                            <div className="flex items-center gap-2 text-navy-600">
                              <ClockIcon className="w-4 h-4" />
                              <span>ETA: {new Date(task.estimated_arrival).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {task.tracking_url && (
                        <a
                          href={task.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-navy-600 hover:text-navy-900 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Track
                        </a>
                      )}
                      <span className="text-xs text-navy-500">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-semibold text-navy-900">Create Manual Task</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Booking ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter booking ID or number..."
                    value={createBookingId}
                    onChange={(e) => setCreateBookingId(e.target.value)}
                  />
                  <p className="text-xs text-navy-600 mt-1">
                    This will create both pickup and dropoff tasks for the booking.
                  </p>
                </div>

                {createTaskMutation.isError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      {(createTaskMutation.error as any)?.response?.data?.error || 'Failed to create task'}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateBookingId('');
                    }}
                    disabled={createTaskMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateTask}
                    disabled={createTaskMutation.isPending || !createBookingId.trim()}
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Tasks'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-navy-900">
                    Task Details
                  </h2>
                  <p className="text-navy-600 mt-1">
                    Booking #{selectedTask.booking_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-navy-600 hover:text-navy-900"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-navy-700">Task Type</p>
                    <p className="text-navy-900 mt-1 capitalize">{selectedTask.task_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy-700">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusBadge(selectedTask.status)}`}>
                      {selectedTask.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-navy-700">Customer</p>
                  <p className="text-navy-900 mt-1">{selectedTask.customer_name}</p>
                </div>

                {selectedTask.recipient_name && (
                  <div>
                    <p className="text-sm font-medium text-navy-700">Recipient</p>
                    <p className="text-navy-900 mt-1">
                      {selectedTask.recipient_name} - {selectedTask.recipient_phone}
                    </p>
                  </div>
                )}

                {selectedTask.worker_name && (
                  <div>
                    <p className="text-sm font-medium text-navy-700">Assigned Driver</p>
                    <p className="text-navy-900 mt-1">{selectedTask.worker_name}</p>
                  </div>
                )}

                {selectedTask.estimated_arrival && (
                  <div>
                    <p className="text-sm font-medium text-navy-700">Estimated Arrival</p>
                    <p className="text-navy-900 mt-1">
                      {new Date(selectedTask.estimated_arrival).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedTask.started_at && (
                  <div>
                    <p className="text-sm font-medium text-navy-700">Started At</p>
                    <p className="text-navy-900 mt-1">
                      {new Date(selectedTask.started_at).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedTask.completed_at && (
                  <div>
                    <p className="text-sm font-medium text-navy-700">Completed At</p>
                    <p className="text-navy-900 mt-1">
                      {new Date(selectedTask.completed_at).toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-navy-700">Created At</p>
                  <p className="text-navy-900 mt-1">
                    {new Date(selectedTask.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-navy-700">Environment</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    selectedTask.environment === 'production'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedTask.environment.toUpperCase()}
                  </span>
                </div>

                {selectedTask.tracking_url && (
                  <div className="pt-4 border-t">
                    <a
                      href={selectedTask.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-900 font-medium"
                    >
                      <MapPinIcon className="w-5 h-5" />
                      View Live Tracking
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}