import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const OwnerDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Mock data for availability: true = Available, false = Booked
  const [availability, setAvailability] = useState<Record<string, boolean>>({
    '2026-01-18': false,
    '2026-01-19': false,
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getDayStatus = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return availability[key] !== false; // Default true (Available)
  };

  const toggleAvailability = () => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    setAvailability({
      ...availability,
      [key]: !getDayStatus(selectedDate)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Availability</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-400">{day}</div>
            ))}
            {days.map((day) => (
              <div
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  aspect-square flex items-center justify-center rounded-md cursor-pointer text-sm font-medium transition-all
                  ${!isSameMonth(day, currentDate) ? 'opacity-10' : ''}
                  ${isSameDay(day, selectedDate) ? 'ring-2 ring-blue-600' : ''}
                  ${getDayStatus(day) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                `}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center space-x-6 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" />
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded" />
              <span>Booked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Selected Date</p>
                <p className="font-bold">{format(selectedDate, 'EEEE, MMM do')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  {getDayStatus(selectedDate) ? 'Available' : 'Booked'}
                </Label>
                <Switch 
                  id="status" 
                  checked={getDayStatus(selectedDate)} 
                  onCheckedChange={toggleAvailability}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDashboard;
