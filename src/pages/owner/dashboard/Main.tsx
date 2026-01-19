import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWeekend, startOfToday, isBefore, getDay } from 'date-fns';
import { cn } from '@/lib/utils';

const OwnerDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rates, setRates] = useState({ weekday: '1499', weekend: '3999' });
  const [customRates, setCustomRates] = useState<{id: string, date: string, price: string}[]>([]);
  
  // Mock data for availability: true = Available, false = Booked
  const [availability, setAvailability] = useState<Record<string, boolean>>({
    '2026-01-18': false,
    '2026-01-19': false,
  });

  const loadRates = () => {
    const savedRates = localStorage.getItem('propertyRates');
    if (savedRates) {
      const parsed = JSON.parse(savedRates);
      if (parsed.rates) setRates(parsed.rates);
      if (parsed.customRates) setCustomRates(parsed.customRates);
    }
  };

  useEffect(() => {
    loadRates();
    // Also listen for storage changes in case the user updates rates in another tab
    window.addEventListener('storage', loadRates);
    return () => window.removeEventListener('storage', loadRates);
  }, []);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  
  // To ensure the calendar starts on the correct day of the week, 
  // we need to know what day the 1st of the month is.
  const startDay = getDay(firstDayOfMonth); // 0 (Sun) to 6 (Sat)
  
  const days = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });

  const getDayStatus = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return availability[key] !== false; // Default true (Available)
  };

  const getDayPrice = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const custom = customRates.find(r => r.date === dateKey);
    if (custom) return custom.price;
    // Sat (6) and Sun (0) are weekends
    const dayOfWeek = getDay(date);
    return (dayOfWeek === 0 || dayOfWeek === 6) ? rates.weekend : rates.weekday;
  };

  const today = startOfToday();
  const isPast = (date: Date) => isBefore(date, today);

  const toggleAvailability = () => {
    if (isPast(selectedDate)) return;
    const key = format(selectedDate, 'yyyy-MM-dd');
    setAvailability({
      ...availability,
      [key]: !getDayStatus(selectedDate)
    });
  };

  const isSelectedWeekend = getDay(selectedDate) === 0 || getDay(selectedDate) === 6;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-[#D4AF37]">Availability</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm text-[#D4AF37]">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#D4AF37]/20 shadow-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500">{day}</div>
            ))}
            
            {/* Empty slots for days before the 1st of the month */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map((day) => {
              const past = isPast(day);
              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-md cursor-pointer transition-all relative overflow-hidden",
                    !isSameMonth(day, currentDate) && "opacity-10",
                    isSameDay(day, selectedDate) && "ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-black z-10",
                    getDayStatus(day) 
                      ? "bg-[#00FF00] text-black shadow-[0_0_10px_rgba(0,255,0,0.3)]" 
                      : "bg-[#FF0000] text-white shadow-[0_0_10px_rgba(255,0,0,0.3)]",
                    past && "opacity-40 cursor-not-allowed saturate-50"
                  )}
                >
                  <span className="text-xs font-bold">{format(day, 'd')}</span>
                  <span className="text-[7px] font-bold opacity-80">₹{getDayPrice(day)}</span>
                  {past && <div className="absolute inset-0 bg-black/10 pointer-events-none" />}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center space-x-6 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#00FF00] rounded-full shadow-[0_0_5px_#00FF00]" />
              <span className="text-[#00FF00]">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#FF0000] rounded-full shadow-[0_0_5px_#FF0000]" />
              <span className="text-[#FF0000]">Booked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#1A1A1A] border-[#D4AF37]/20 shadow-xl">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Status for</p>
                <div className="flex items-baseline space-x-2">
                  <p className="font-bold text-white text-lg">{format(selectedDate, 'EEEE, MMM do')}</p>
                  <p className="text-[#D4AF37] font-bold">₹{getDayPrice(selectedDate)}</p>
                </div>
                <p className="text-[10px] text-[#D4AF37] uppercase">{isSelectedWeekend ? 'Weekend (Sat-Sun)' : 'Weekday (Mon-Fri)'}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Label htmlFor="status" className={cn(
                  "text-xs font-bold uppercase transition-colors",
                  getDayStatus(selectedDate) ? "text-[#00FF00]" : "text-[#FF0000]",
                  isPast(selectedDate) && "opacity-50"
                )}>
                  {getDayStatus(selectedDate) ? 'Available' : 'Booked'}
                </Label>
                <Switch 
                  id="status" 
                  checked={getDayStatus(selectedDate)} 
                  onCheckedChange={toggleAvailability}
                  disabled={isPast(selectedDate)}
                  className="data-[state=checked]:bg-[#00FF00] data-[state=unchecked]:bg-[#FF0000]"
                />
              </div>
            </div>
            {isPast(selectedDate) && (
              <p className="text-[9px] text-gray-500 italic text-center border-t border-white/5 pt-2">
                Past dates are frozen and cannot be edited
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDashboard;
