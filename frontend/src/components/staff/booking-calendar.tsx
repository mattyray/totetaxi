'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface CalendarBooking {
  id: string;
  booking_number: string;
  customer_name: string;
  service_type: string;
  pickup_time: string;
  status: string;
  total_price_dollars: number;
  coi_required: boolean;
}

interface CalendarDay {
  date: string;
  available: boolean;
  is_weekend: boolean;
  bookings: CalendarBooking[];
  surcharges: Array<{ name: string; type: string; description: string }>;
}

interface CalendarData {
  availability: CalendarDay[];
  start_date: string;
  end_date: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get start of month for API call
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['calendar', 'availability', startOfMonth.toISOString().split('T')[0]],
    queryFn: async (): Promise<CalendarData> => {
      const response = await apiClient.get('/api/public/calendar/availability/', {
        params: {
          start_date: startOfMonth.toISOString().split('T')[0],
          end_date: endOfMonth.toISOString().split('T')[0]
        }
      });
      return response.data;
    }
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['staff', 'bookings', 'calendar', startOfMonth.toISOString().split('T')[0]],
    queryFn: async () => {
      const response = await apiClient.get('/api/staff/bookings/', {
        params: {
          start_date: startOfMonth.toISOString().split('T')[0],
          end_date: endOfMonth.toISOString().split('T')[0]
        }
      });
      return response.data;
    }
  });

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Get calendar grid
  const getCalendarDays = () => {
    if (!calendarData) return [];
    
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    while (days.length < 42) { // 6 weeks × 7 days
      const dateStr = currentDay.toISOString().split('T')[0];
      const dayData = calendarData.availability.find(day => day.date === dateStr);
      
      days.push({
        date: new Date(currentDay),
        dateStr,
        isCurrentMonth: currentDay.getMonth() === currentDate.getMonth(),
        isToday: dateStr === new Date().toISOString().split('T')[0],
        data: dayData
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = getCalendarDays();

  // Get booking color based on count instead of capacity
  const getBookingColor = (day: any) => {
    if (!day.data || !day.data.bookings) return 'bg-gray-100';
    
    const bookingCount = day.data.bookings.length;
    if (bookingCount >= 5) return 'bg-red-100 border-red-300';
    if (bookingCount >= 3) return 'bg-amber-100 border-amber-300';
    if (bookingCount >= 1) return 'bg-yellow-100 border-yellow-300';
    return 'bg-green-100 border-green-300';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-serif font-bold text-navy-900">
            Booking Calendar
          </h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              ←
            </Button>
            <h2 className="text-lg font-medium min-w-[140px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              →
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="primary" size="sm">
            + New Booking
          </Button>
        </div>
      </div>

      {/* Updated Calendar Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>No bookings</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Light (1-2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
              <span>Busy (3-4)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Heavy (5+)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-0">
            {/* Header row */}
            {WEEKDAYS.map(day => (
              <div key={day} className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500 text-center border-b">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-r border-b cursor-pointer hover:bg-gray-50 ${getBookingColor(day)} ${
                  !day.isCurrentMonth ? 'opacity-30' : ''
                } ${day.isToday ? 'ring-2 ring-navy-500' : ''}`}
                onClick={() => setSelectedDate(day.dateStr)}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-sm font-medium ${
                    day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {day.date.getDate()}
                  </span>
                  
                  {day.data?.surcharges && day.data.surcharges.length > 0 && (
                    <span className="text-amber-600 text-xs">!</span>
                  )}
                </div>
                
                {day.data && (
                  <div className="mt-1 space-y-1">
                    {/* Removed booking count display */}
                    
                    {day.data.bookings?.slice(0, 2).map(booking => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded truncate ${
                          booking.status === 'pending'
                            ? 'bg-amber-200 text-amber-800'
                            : booking.status === 'confirmed'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-green-200 text-green-800'
                        }`}
                      >
                        {booking.booking_number}
                      </div>
                    ))}
                    
                    {day.data.bookings && day.data.bookings.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{day.data.bookings.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <SelectedDateDetails
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

function SelectedDateDetails({ date, onClose }: { date: string; onClose: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="text-lg font-medium">
          {new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>
        <Button variant="ghost" onClick={onClose}>
          ×
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Detailed booking information for this date would appear here.</p>
      </CardContent>
    </Card>
  );
}