// src/components/staff/booking-calendar.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookingDetailModal } from './booking-detail-modal';

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

type ViewMode = 'month' | 'week' | 'day';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const router = useRouter();

  // Get date range based on view mode
  const getDateRange = () => {
    if (viewMode === 'month') {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return { startDate: startOfMonth, endDate: endOfMonth };
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Go to Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
      return { startDate: startOfWeek, endDate: endOfWeek };
    } else {
      // Day view
      return { startDate: new Date(currentDate), endDate: new Date(currentDate) };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['calendar', 'availability', viewMode, startDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<CalendarData> => {
      const response = await apiClient.get('/api/public/calendar/availability/', {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }
      });
      return response.data;
    }
  });

  // Navigate based on view mode
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    } else if (viewMode === 'week') {
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
    } else {
      // Day view
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    }
    setCurrentDate(newDate);
  };

  // Handle day click - switch to day view
  const handleDayClick = (dateStr: string) => {
    const clickedDate = new Date(dateStr);
    setCurrentDate(clickedDate);
    setViewMode('day');
  };

  // Handle booking click
  const handleBookingClick = (booking: CalendarBooking, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger day selection
    setSelectedBooking(booking.id);
  };

  // Get calendar grid for month view
  const getMonthCalendarDays = () => {
    if (!calendarData) return [];
    
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
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

  // Get week days for week view
  const getWeekDays = () => {
    if (!calendarData) return [];
    
    const days = [];
    const weekStart = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + i);
      const dateStr = currentDay.toISOString().split('T')[0];
      const dayData = calendarData.availability.find(day => day.date === dateStr);
      
      days.push({
        date: new Date(currentDay),
        dateStr,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        data: dayData
      });
    }
    
    return days;
  };

  // Get single day for day view
  const getDayData = () => {
    if (!calendarData) return null;
    
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = calendarData.availability.find(day => day.date === dateStr);
    
    return {
      date: new Date(currentDate),
      dateStr,
      isToday: dateStr === new Date().toISOString().split('T')[0],
      data: dayData
    };
  };

  // Get booking color based on count
  const getBookingColor = (day: any) => {
    if (!day.data || !day.data.bookings) return 'bg-gray-50';
    
    const bookingCount = day.data.bookings.length;
    if (bookingCount >= 5) return 'bg-red-100 border-red-300';
    if (bookingCount >= 3) return 'bg-amber-100 border-amber-300';
    if (bookingCount >= 1) return 'bg-yellow-100 border-yellow-300';
    return 'bg-green-100 border-green-300';
  };

  // Get display title based on view mode
  const getDisplayTitle = () => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const weekStart = new Date(startDate);
      const weekEnd = new Date(endDate);
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} - ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  const renderMonthView = () => {
    const calendarDays = getMonthCalendarDays();
    
    return (
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-0">
            {/* Header row */}
            {WEEKDAYS_SHORT.map(day => (
              <div key={day} className="bg-gray-50 px-3 py-2 text-sm font-medium text-navy-800 text-center border-b">
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
                onClick={() => handleDayClick(day.dateStr)}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-sm font-medium ${
                    day.isCurrentMonth ? 'text-navy-800' : 'text-navy-400'
                  }`}>
                    {day.date.getDate()}
                  </span>
                  
                  {day.data?.surcharges && day.data.surcharges.length > 0 && (
                    <span className="text-amber-600 text-xs">!</span>
                  )}
                </div>
                
                {day.data && (
                  <div className="mt-1 space-y-1">
                    {day.data.bookings?.slice(0, 2).map(booking => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-75 ${
                          booking.status === 'pending'
                            ? 'bg-amber-200 text-amber-800'
                            : booking.status === 'confirmed'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-green-200 text-green-800'
                        }`}
                        onClick={(e) => handleBookingClick(booking, e)}
                      >
                        {booking.booking_number}
                      </div>
                    ))}
                    
                    {day.data.bookings && day.data.bookings.length > 2 && (
                      <div className="text-xs text-navy-600">
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
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    return (
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-0">
            {/* Header row */}
            {weekDays.map((day, index) => (
              <div key={index} className="bg-gray-50 px-3 py-3 text-sm font-medium text-navy-800 text-center border-b">
                <div className="font-semibold">{WEEKDAYS_SHORT[index]}</div>
                <div className={`text-lg mt-1 ${day.isToday ? 'text-navy-900 font-bold' : 'text-navy-600'}`}>
                  {day.date.getDate()}
                </div>
              </div>
            ))}
            
            {/* Week days */}
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[200px] p-3 border-r border-b cursor-pointer hover:bg-gray-50 ${getBookingColor(day)} ${
                  day.isToday ? 'ring-2 ring-navy-500' : ''
                }`}
                onClick={() => handleDayClick(day.dateStr)}
              >
                <div className="flex items-start justify-between mb-2">
                  {day.data?.surcharges && day.data.surcharges.length > 0 && (
                    <span className="text-amber-600 text-xs bg-amber-100 px-1 rounded">Surcharge</span>
                  )}
                </div>
                
                {day.data && (
                  <div className="space-y-2">
                    {day.data.bookings?.map(booking => (
                      <div
                        key={booking.id}
                        className={`text-xs p-2 rounded cursor-pointer hover:opacity-75 ${
                          booking.status === 'pending'
                            ? 'bg-amber-200 text-amber-800'
                            : booking.status === 'confirmed'
                            ? 'bg-blue-200 text-blue-800'
                            : booking.status === 'paid'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                        onClick={(e) => handleBookingClick(booking, e)}
                      >
                        <div className="font-semibold">{booking.booking_number}</div>
                        <div className="text-xs mt-1">{booking.customer_name}</div>
                        <div className="text-xs">{booking.service_type}</div>
                        <div className="text-xs">${booking.total_price_dollars}</div>
                        {booking.coi_required && (
                          <div className="text-xs text-orange-600 font-medium">COI Required</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDayView = () => {
    const dayData = getDayData();
    
    if (!dayData?.data || !dayData.data.bookings || dayData.data.bookings.length === 0) {
      return (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-navy-900">
              {dayData?.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
          </CardHeader>
          <CardContent className="p-12 text-center">
            <p className="text-navy-600">No bookings scheduled for this date</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-navy-900">
            {dayData.date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <p className="text-navy-600">{dayData.data.bookings.length} bookings scheduled</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {dayData.data.bookings.map(booking => (
            <Card key={booking.id} variant="elevated">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-navy-900">{booking.booking_number}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'paid'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'confirmed'
                          ? 'bg-purple-100 text-purple-800'
                          : booking.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-navy-700">
                      <div>
                        <p><strong className="text-navy-900">Customer:</strong> {booking.customer_name}</p>
                        <p><strong className="text-navy-900">Service:</strong> {booking.service_type}</p>
                        <p><strong className="text-navy-900">Time:</strong> {booking.pickup_time}</p>
                      </div>
                      <div>
                        <p><strong className="text-navy-900">Total:</strong> ${booking.total_price_dollars}</p>
                        {booking.coi_required && (
                          <p className="text-orange-600 font-medium">COI Required</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleBookingClick(booking, e)}
                    >
                      Quick Edit
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/staff/bookings/${booking.id}`)}
                    >
                      Full Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {dayData.data.surcharges && dayData.data.surcharges.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <h4 className="font-medium text-amber-800 mb-2">Active Surcharges</h4>
                {dayData.data.surcharges.map((surcharge, index) => (
                  <p key={index} className="text-sm text-amber-700">
                    • {surcharge.name}: {surcharge.description}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-serif font-bold text-navy-900">
            Booking Calendar
          </h1>
          
          {/* View Mode Selector */}
          <div className="flex items-center space-x-2 bg-navy-100 rounded-lg p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === mode 
                    ? 'bg-navy-900 text-white' 
                    : 'text-navy-700 hover:bg-navy-200'
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('prev')}
            >
              ←
            </Button>
            <h2 className="text-lg font-medium min-w-[200px] text-center text-navy-900">
              {getDisplayTitle()}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('next')}
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

      {/* Calendar Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-navy-700">No bookings</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span className="text-navy-700">Light (1-2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
              <span className="text-navy-700">Busy (3-4)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-navy-700">Heavy (5+)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Views */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          bookingId={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}