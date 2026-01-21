import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarSyncProps {
  propertyId: string;
  isAdmin?: boolean;
  onDateSelect?: (date: Date) => void;
}

export const CalendarSync = ({ propertyId, isAdmin = false, onDateSelect }: CalendarSyncProps) => {
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [propertyPrice, setPropertyPrice] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    try {
      if (!propertyId || propertyId === 'Generating...') return;
      const response = await fetch(`/api/properties/${propertyId}/calendar`);
      const result = await response.json();
      if (result.success) {
        setCalendarData(result.data);
      }
      
      // Fetch property details for base price
      const propResponse = await fetch(`/api/properties/${propertyId}`);
      const propResult = await propResponse.json();
      if (propResult.success) {
        setPropertyPrice(propResult.data.price);
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

  const handleUpdate = async (date: Date, isBooked: boolean) => {
    if (!isAdmin) return;
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return;
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const response = await fetch(`/api/properties/${propertyId}/calendar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: format(date, 'yyyy-MM-dd'),
          is_booked: isBooked,
          price: propertyPrice
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
    <div className="p-2 sm:p-4 bg-black/40 rounded-3xl border border-white/10 w-full overflow-hidden">
      <Calendar
        mode="single"
        className="w-full"
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
            const price = data?.price || propertyPrice;
            const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
            
            return (
              <div className={cn(
                "relative w-full h-full flex flex-col items-center justify-center p-1 rounded-md transition-all",
                isBooked ? "bg-[#FF0000] text-white" : "bg-[#00FF00] text-black",
                isPast && "opacity-60 grayscale-[0.5]"
              )}>
                <span className="text-[10px] sm:text-xs font-bold leading-none">{format(date, 'd')}</span>
                {price && (
                  <span className="text-[8px] sm:text-[10px] font-medium leading-none mt-0.5 whitespace-nowrap">
                    {price.replace('₹', '')}
                  </span>
                )}
              </div>
            );
          }
        }}
        classNames={{
          day: "h-12 w-12 sm:h-14 sm:w-14 p-0 font-normal aria-selected:opacity-100",
          day_today: "ring-2 ring-yellow-500 ring-offset-2 ring-offset-black",
          day_selected: "bg-transparent text-inherit hover:bg-transparent hover:text-inherit focus:bg-transparent focus:text-inherit",
          day_disabled: "opacity-50 cursor-not-allowed",
          table: "w-full border-collapse space-y-1",
          head_cell: "text-gray-400 rounded-md w-12 sm:w-14 font-medium text-[10px] sm:text-xs uppercase tracking-wider",
          cell: "h-12 w-12 sm:h-14 sm:w-14 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        }}
      />
    </div>
  );
};
