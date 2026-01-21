import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isBefore, startOfDay, isWeekend } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarSyncProps {
  propertyId: string;
  isAdmin?: boolean;
  onDateSelect?: (date: Date) => void;
}

export const CalendarSync = ({ propertyId, isAdmin = false, onDateSelect }: CalendarSyncProps) => {
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [propertyPrices, setPropertyPrices] = useState<{
    base: string;
    weekday: string;
    weekend: string;
  }>({ base: "", weekday: "", weekend: "" });
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    try {
      if (!propertyId || propertyId === 'Generating...') return;
      const response = await fetch(`/api/properties/${propertyId}/calendar`);
      const result = await response.json();
      if (result.success) {
        setCalendarData(result.data);
      }
      
      // Fetch property details for pricing settings
      const propResponse = await fetch(`/api/properties/${propertyId}`);
      const propResult = await propResponse.json();
      if (propResult.success) {
        setPropertyPrices({
          base: propResult.data.price,
          weekday: propResult.data.weekday_price || propResult.data.price,
          weekend: propResult.data.weekend_price || propResult.data.price
        });
      }
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) fetchCalendar();
  }, [propertyId]);

  const getPriceForDate = (date: Date) => {
    const data = getDayData(date);
    if (data?.price) return data.price.toString();
    const price = isWeekend(date) ? propertyPrices.weekend : propertyPrices.weekday;
    return price ? price.toString() : "";
  };

  const handleUpdate = async (date: Date, isBooked: boolean) => {
    if (!isAdmin) return;
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return;
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const price = getPriceForDate(date);
      
      const response = await fetch(`/api/properties/${propertyId}/calendar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: format(date, 'yyyy-MM-dd'),
          is_booked: isBooked,
          price: price
        })
      });
      
      if (response.ok) {
        toast.success("Calendar updated");
        fetchCalendar();
      }
    } catch (error) {
      toast.error("Failed to update calendar");
    }
  };

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarData.find(d => format(new Date(d.date), 'yyyy-MM-dd') === dateStr);
  };

  return (
    <div className="w-full">
      <div className="calendar-container w-full overflow-x-visible">
        <div className="w-full">
          <Calendar
            mode="single"
            className="w-full p-0"
            disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
            onSelect={(date) => {
              if (date && isAdmin) {
                const current = getDayData(date);
                handleUpdate(date, !current?.is_booked);
              }
              if (date && onDateSelect) onDateSelect(date);
            }}
            components={{
              DayContent: ({ date }) => {
                const data = getDayData(date);
                const isBooked = data?.is_booked;
                const price = getPriceForDate(date);
                const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
                
                return (
                  <div className={cn(
                    "relative w-full h-full flex flex-col items-center justify-center p-0.5 rounded-md transition-all select-none",
                    isBooked ? "bg-[#FF0000] text-white" : "bg-[#00FF00] text-black",
                    isPast && "opacity-60 grayscale-[0.5]"
                  )}>
                    <span className="text-[11px] sm:text-xs font-bold leading-none">{format(date, 'd')}</span>
                    {price && (
                      <span className="text-[8px] sm:text-[10px] font-black leading-none mt-0.5 sm:mt-1 scale-90 sm:scale-100 origin-center truncate w-full text-center px-0.5">
                        {price.replace('₹', '').replace('/-', '').trim()}
                      </span>
                    )}
                  </div>
                );
              }
            }}
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              caption: "flex justify-center pt-1 relative items-center mb-4 px-8",
              caption_label: "text-base sm:text-lg font-bold text-[#D4AF37]",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 text-[#D4AF37] border-[#D4AF37]/30"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex w-full mb-3",
              head_cell: "text-gray-400 rounded-md flex-1 font-bold text-[10px] sm:text-xs uppercase tracking-tighter text-center",
              row: "flex w-full mt-1",
              cell: "flex-1 aspect-square h-auto relative p-0.5 text-center text-sm focus-within:relative focus-within:z-20",
              day: "h-full w-full p-0 font-normal aria-selected:opacity-100 transition-transform",
              day_today: "ring-1 sm:ring-2 ring-yellow-400 ring-offset-1 sm:ring-offset-2 ring-offset-black rounded-md",
              day_selected: "bg-transparent text-inherit hover:bg-transparent hover:text-inherit focus:bg-transparent focus:text-inherit",
              day_disabled: "opacity-50 cursor-not-allowed",
              day_outside: "hidden",
            }}
          />
        </div>
      </div>
    </div>
  );
};
