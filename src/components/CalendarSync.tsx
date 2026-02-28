import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isBefore, startOfDay, isWeekend } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LedgerPopup } from "./LedgerPopup";

interface CalendarSyncProps {
  propertyId: string;
  isAdmin?: boolean;
  onDateSelect?: (date: Date) => void;
  unitId?: number;
  unitName?: string;
  propertyName?: string;
  isVilla?: boolean;
  isPublic?: boolean;
  isBookingForm?: boolean;
}

export const CalendarSync = ({ 
  propertyId, 
  isAdmin = false, 
  onDateSelect, 
  unitId, 
  unitName, 
  propertyName = "Property",
  isVilla = false,
  isPublic = false,
  isBookingForm = false
}: CalendarSyncProps) => {
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [calendarMeta, setCalendarMeta] = useState<{ totalCapacity?: number; isVilla?: boolean }>({});
  const [propertyPrices, setPropertyPrices] = useState<{
    base: string;
    weekday: string;
    weekend: string;
    specialDates: any[];
    capacity?: number;
    maxCapacity?: number;
  }>({ base: "", weekday: "", weekend: "", specialDates: [] });
  const [loading, setLoading] = useState(true);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedLedgerDate, setSelectedLedgerDate] = useState<Date | null>(null);

  const isOwnerOrAdmin = !isPublic && (isAdmin || !!localStorage.getItem('ownerToken') || !!localStorage.getItem('adminToken'));

  const fetchCalendar = async () => {
    try {
      if (!propertyId || propertyId === 'Generating...') return;
      const token = localStorage.getItem('ownerToken') || localStorage.getItem('adminToken');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = unitId 
        ? await fetch(`/api/properties/units/${unitId}/calendar`, { headers })
        : await fetch(`/api/properties/${propertyId}/calendar`, { headers });
      const result = await response.json();
      if (result.success) {
        setCalendarData(result.data);
        if (result.meta) setCalendarMeta(result.meta);
      }
      
      const propUrl = unitId
        ? `/api/properties/${propertyId}` 
        : (token ? `/api/properties/${propertyId}` : `/api/properties/public/${propertyId}`);
      
      const propResponse = await fetch(propUrl, { headers: token ? headers : {} });
      const propResult = await propResponse.json();
      
      if (propResult.success) {
        let specialDates: any[] = [];
        const data = propResult.data;
        
        const selectedUnit = unitId && Array.isArray(data.units) 
          ? data.units.find((u: any) => u.id === unitId)
          : null;

        if (data.special_dates) {
          try {
            specialDates = typeof data.special_dates === 'string' 
              ? JSON.parse(data.special_dates) 
              : data.special_dates;
          } catch (e) {
            console.error("Error parsing special dates:", e);
          }
        }

        setPropertyPrices({
          base: data.price ? String(data.price) : "",
          weekday: (data.weekday_price !== null && data.weekday_price !== undefined && data.weekday_price !== "") 
            ? String(data.weekday_price) 
            : (data.price ? String(data.price) : ""),
          weekend: (data.weekend_price !== null && data.weekend_price !== undefined && data.weekend_price !== "") 
            ? String(data.weekend_price) 
            : (data.price ? String(data.price) : ""),
          specialDates: Array.isArray(specialDates) ? specialDates : [],
          capacity: selectedUnit ? selectedUnit.available_persons : (data.capacity || data.available_persons),
          maxCapacity: selectedUnit ? selectedUnit.total_persons : (data.max_capacity || data.total_persons)
        });
      }
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId || unitId) fetchCalendar();
    
    const handleCalendarUpdate = () => {
      fetchCalendar();
    };
    window.addEventListener('calendarUpdate', handleCalendarUpdate);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchCalendar();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (isOwnerOrAdmin) {
      pollInterval = setInterval(() => fetchCalendar(), 30000);
    } else if (unitId) {
      pollInterval = setInterval(() => fetchCalendar(), 60000);
    }

    return () => {
      window.removeEventListener('calendarUpdate', handleCalendarUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [propertyId, unitId, isOwnerOrAdmin]);

  const getPriceForDate = (date: Date) => {
    const data = getDayData(date);
    if (data?.price) return data.price.toString();
    
    const dateStr = format(date, 'yyyy-MM-dd');
    if (Array.isArray(propertyPrices.specialDates)) {
      const special = propertyPrices.specialDates.find(sd => sd.date === dateStr);
      if (special?.price) return special.price.toString();
    }

    const price = isWeekend(date) ? propertyPrices.weekend : propertyPrices.weekday;
    
    return (price && price !== "0" ? price : propertyPrices.base || "").toString();
  };

  const handleUpdate = async (date: Date, isBooked: boolean) => {
    if (!isOwnerOrAdmin) return;
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return;
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
      const currentPrice = getPriceForDate(date);
      
      const newPrice = isVilla ? window.prompt("Enter price for this date:", currentPrice) : currentPrice;
      if (isVilla && newPrice === null) return;

      const url = unitId 
        ? `/api/properties/units/${unitId}/calendar`
        : `/api/properties/${propertyId}/calendar`;

      const response = await fetch(url, {
        method: unitId ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: format(date, 'yyyy-MM-dd'),
          is_booked: isBooked,
          price: isVilla ? newPrice : currentPrice
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

  const totalCapacity = calendarMeta.totalCapacity || propertyPrices.maxCapacity || 0;

  return (
    <div className="w-full">
      {unitName && (
        <div className="mb-4">
          <h3 className="text-gold font-display text-xl sm:text-2xl font-black uppercase tracking-tight">
            {unitName}
          </h3>
          <div className="h-1 w-20 bg-gold/30 mt-1 rounded-full" />
        </div>
      )}
      <div className="calendar-container w-full overflow-x-visible">
        <div className="w-full">
          <Calendar
            mode="single"
            className="w-full p-0"
            selected={undefined}
            disabled={(date) => {
              const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
              if (isPublic) {
                if (onDateSelect) {
                  const data = getDayData(date);
                  const isFullyBooked = isVilla 
                    ? data?.is_booked 
                    : (data?.available_quantity !== undefined && data.available_quantity <= 0);
                  const softAvailQty = data?.soft_available_quantity;
                  const isSoftLocked = !isFullyBooked && data?.is_soft_locked === true;
                  const isSoftFullyUnavail = isSoftLocked && (isVilla || (softAvailQty !== undefined && softAvailQty <= 0));
                  return isPast || !!isFullyBooked || isSoftFullyUnavail;
                }
                return true;
              }
              if (isBookingForm) {
                const data = getDayData(date);
                const isFullyBooked = isVilla 
                  ? data?.is_booked 
                  : (data?.available_quantity !== undefined && data.available_quantity <= 0);
                const softAvailQty = data?.soft_available_quantity;
                const isSoftLocked = !isFullyBooked && data?.is_soft_locked === true;
                const isSoftFullyUnavail = isSoftLocked && (isVilla || (softAvailQty !== undefined && softAvailQty <= 0));
                return isPast || !!isFullyBooked || isSoftFullyUnavail;
              }
              return isPast;
            }}
            onSelect={(date) => {
              if (isPublic && !onDateSelect) return;
              if (date && isOwnerOrAdmin && !isBookingForm && !isPublic) {
                setSelectedLedgerDate(date);
                setIsLedgerOpen(true);
              }
              if (date && onDateSelect) onDateSelect(date);
            }}
            components={{
              DayContent: ({ date }) => {
                const data = getDayData(date);
                const isBooked = data?.is_booked;
                const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
                const availableQuantity = data?.available_quantity !== undefined ? data.available_quantity : null;
                const softAvailableQuantity = data?.soft_available_quantity !== undefined ? data.soft_available_quantity : availableQuantity;
                const dayTotalCapacity = data?.total_capacity || totalCapacity;
                const isFullyBooked = isVilla ? isBooked : (availableQuantity !== null && availableQuantity <= 0);
                const isSoftLocked = !isFullyBooked && data?.is_soft_locked === true;
                const isSoftFullyUnavailable = isSoftLocked && (isVilla || (softAvailableQuantity !== null && softAvailableQuantity <= 0));
                
                const isDisabled = isPast || !!isFullyBooked || isSoftFullyUnavailable;
                
                return (
                  <div className={cn(
                    "relative w-full h-full flex flex-col items-center justify-center p-0.5 rounded-md transition-all select-none",
                    "!bg-[#00FF00] !text-black",
                    isSoftLocked && "!bg-[#808080] !text-white",
                    isFullyBooked && "!bg-[#FF0000] !text-white",
                    isPast && "opacity-60 grayscale-[0.5]",
                    isPublic && !onDateSelect && "cursor-default",
                    isPublic && onDateSelect && !isDisabled && "cursor-pointer",
                    isPublic && onDateSelect && isDisabled && "!cursor-not-allowed"
                  )}>
                    <span className="text-[11px] sm:text-xs font-bold leading-none">{format(date, 'd')}</span>
                    {!isPast && (
                      <div className="flex flex-col items-center mt-0.5 sm:mt-1 scale-90 sm:scale-100 font-black text-[8px] sm:text-[10px]">
                        {isVilla ? (
                          <span className={cn(
                            "uppercase",
                            isFullyBooked ? "text-white/80" : isSoftLocked ? "text-white/80" : "text-black/80"
                          )}>
                            {isFullyBooked ? "Booked" : isSoftLocked ? "Pending" : "Available"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-0.5">
                            <span className={cn(
                              isFullyBooked ? "text-white" : isSoftLocked ? "text-white" : "text-[#008000]"
                            )}>
                              {isSoftLocked
                                ? (softAvailableQuantity !== null ? softAvailableQuantity : dayTotalCapacity)
                                : (availableQuantity !== null ? availableQuantity : dayTotalCapacity)}
                            </span>
                            <span className={isFullyBooked || isSoftLocked ? "text-white/40" : "text-gray-500"}>/</span>
                            <span className={isFullyBooked || isSoftLocked ? "text-white/80" : "text-[#FF8C00]"}>
                              {dayTotalCapacity}
                            </span>
                          </div>
                        )}
                      </div>
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
              cell: cn(
                "flex-1 aspect-square h-auto relative p-0.5 text-center text-sm",
                isPublic && !onDateSelect && "pointer-events-none"
              ),
              day: cn(
                "h-full w-full p-0 font-normal aria-selected:opacity-100 transition-transform",
                isPublic && !onDateSelect && "!cursor-default hover:!bg-transparent"
              ),
              day_today: "ring-1 sm:ring-2 ring-yellow-400 ring-offset-1 sm:ring-offset-2 ring-offset-black rounded-md",
              day_selected: "bg-transparent text-inherit hover:bg-transparent hover:text-inherit focus:bg-transparent focus:text-inherit",
              day_disabled: (isPublic && !onDateSelect) ? "opacity-100 !cursor-default hover:!bg-transparent" : (isPublic && onDateSelect) ? "opacity-50 !cursor-not-allowed hover:!bg-transparent hover:!no-underline" : (isBookingForm ? "opacity-100 !cursor-not-allowed hover:!bg-transparent" : "opacity-50 !cursor-not-allowed hover:!bg-transparent"),
              day_outside: "hidden",
            }}
          />
        </div>
      </div>
      
      {isOwnerOrAdmin && (
        <LedgerPopup
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          date={selectedLedgerDate}
          propertyName={propertyName}
          propertyId={propertyId}
          unitId={unitId}
          unitName={unitName || propertyName}
          availablePersons={getDayData(selectedLedgerDate || new Date())?.available_quantity ?? (getDayData(new Date())?.available_quantity ?? (calendarMeta.totalCapacity || propertyPrices.capacity || 0))}
          totalPersons={calendarMeta.totalCapacity || getDayData(selectedLedgerDate || new Date())?.total_capacity || getDayData(new Date())?.total_capacity || propertyPrices.maxCapacity || 0}
          isVilla={isVilla}
        />
      )}
    </div>
  );
};
