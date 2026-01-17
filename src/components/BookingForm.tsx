import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Users, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaytmPaymentService } from "@/lib/paytmPayment";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface BookingFormProps {
  propertyName: string;
  propertyId: string;
  pricePerPerson: number;
  propertyCategory?: string;
  maxCapacity?: number;
  onClose?: () => void;
}

export function BookingForm({ 
  propertyName, 
  propertyId, 
  pricePerPerson, 
  propertyCategory = "camping", 
  maxCapacity = 4,
  onClose 
}: BookingFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    persons: 1,
    vegPersons: 1,
    nonVegPersons: 0,
    checkIn: undefined as Date | undefined,
    checkOut: undefined as Date | undefined,
  });

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [totalPrice, setTotalPrice] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);

  const isVilla = propertyCategory?.toLowerCase() === "villa";

  useEffect(() => {
    let days = 1;
    if (formData.checkIn && formData.checkOut) {
      const diffTime = Math.abs(formData.checkOut.getTime() - formData.checkIn.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (days < 1) days = 1;
    }

    let total = 0;
    if (isVilla) {
      total = pricePerPerson * days;
    } else {
      const totalPersons = (formData.vegPersons || 0) + (formData.nonVegPersons || 0);
      total = totalPersons * pricePerPerson;
      // Keep persons count in sync for other logic if needed
      if (formData.persons !== totalPersons) {
        setFormData(prev => ({ ...prev, persons: totalPersons }));
      }
    }
    
    setTotalPrice(total);
    setAdvanceAmount(Math.round(total * 0.3)); // 30% advance
  }, [formData.persons, formData.vegPersons, formData.nonVegPersons, formData.checkIn, formData.checkOut, pricePerPerson, isVilla]);

  const handleCheckInSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    
    setFormData(prev => ({
      ...prev,
      checkIn: date,
      checkOut: isVilla ? (prev.checkOut && prev.checkOut > date ? prev.checkOut : nextDay) : nextDay
    }));
    setIsCheckInOpen(false);
  };

  const handleBook = async () => {
    if (!formData.name || !formData.mobile || !formData.checkIn || !formData.checkOut) {
      alert("Please fill all details");
      return;
    }

    if (isVilla) {
      if (formData.persons === 0) {
        alert("Please enter number of persons");
        return;
      }
    } else {
      if ((formData.vegPersons || 0) + (formData.nonVegPersons || 0) === 0) {
        alert("Please enter number of persons");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (onClose) onClose();

      const apiBaseUrl = '';

      const checkInDateTime = new Date(formData.checkIn);
      checkInDateTime.setHours(14, 0, 0, 0);

      const checkOutDateTime = new Date(formData.checkOut);
      checkOutDateTime.setHours(11, 0, 0, 0);

      const bookingPayload: any = {
        property_id: propertyId,
        property_name: propertyName,
        property_type: isVilla ? "VILLA" : "CAMPING",
        guest_name: formData.name,
        guest_phone: formData.mobile,
        owner_phone: "+918806092609",
        admin_phone: "+918806092609",
        checkin_datetime: checkInDateTime.toISOString(),
        checkout_datetime: checkOutDateTime.toISOString(),
        advance_amount: advanceAmount,
      };

      if (isVilla) {
        bookingPayload.persons = formData.persons;
        bookingPayload.max_capacity = 6;
      } else {
        bookingPayload.veg_guest_count = formData.vegPersons || 0;
        bookingPayload.nonveg_guest_count = formData.nonVegPersons || 0;
      }

      const bookingResponse = await fetch(`${apiBaseUrl}/api/bookings/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!bookingResponse.ok) {
        const error = await bookingResponse.json();
        throw new Error(error.error || "Failed to create booking");
      }

      const bookingData = await bookingResponse.json();

      if (!bookingData.booking || !bookingData.booking.booking_id) {
        throw new Error("Invalid booking response");
      }

      await PaytmPaymentService.initiateAndRedirect(bookingData.booking.booking_id, "WEB");
    } catch (error) {
      console.error("Booking error:", error);
      alert(`Booking failed: ${error.message}. Please try again.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-0 pb-10 md:pb-0">
      <div className="grid gap-4 pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="Your name" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mobile">Mobile Number (whatsapp)</Label>
            <Input 
              id="mobile" 
              type="tel"
              inputMode="tel"
              placeholder="Mobile" 
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="h-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Check-in</Label>
            <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 justify-start text-left font-normal px-3",
                    !formData.checkIn && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{formData.checkIn ? format(formData.checkIn, "MMM d") : "Date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.checkIn}
                  onSelect={handleCheckInSelect}
                  initialFocus
                  disabled={(date) => {
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    if (isVilla) {
                      const day = date.getDate();
                      const isBooked = day === 15 || day === 16 || day === 20;
                      return isPast || isBooked;
                    }
                    return isPast;
                  }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1.5">
            <Label>Check-out</Label>
            {isVilla ? (
              <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 justify-start text-left font-normal px-3",
                      !formData.checkOut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{formData.checkOut ? format(formData.checkOut, "MMM d") : "Date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={formData.checkOut}
                    onSelect={(date) => {
                      setFormData({ ...formData, checkOut: date });
                      setIsCheckOutOpen(false);
                    }}
                    disabled={(date) => {
                      if (!formData.checkIn) return true;
                      const minDate = new Date(formData.checkIn);
                      minDate.setDate(formData.checkIn.getDate() + 1);
                      const maxDate = new Date(formData.checkIn);
                      maxDate.setDate(formData.checkIn.getDate() + 7);
                      
                      const day = date.getDate();
                      const isBooked = day === 15 || day === 16 || day === 20;
                      
                      return date < minDate || date > maxDate || isBooked;
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="h-11 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2 cursor-not-allowed opacity-70">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {formData.checkOut ? format(formData.checkOut, "MMM d") : "Next day"}
              </div>
            )}
          </div>
        </div>
        
        {isVilla ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="persons">Persons</Label>
              <Input 
                id="persons" 
                type="number" 
                min="1"
                max={maxCapacity}
                value={formData.persons}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val <= maxCapacity) {
                    setFormData({ ...formData, persons: val });
                  } else if (e.target.value === "") {
                    setFormData({ ...formData, persons: 0 });
                  }
                }}
                className="h-11"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Max Capacity</Label>
              <div className="h-11 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center">
                {maxCapacity} Guests
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vegPersons">Veg</Label>
                <Input 
                  id="vegPersons" 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.vegPersons === 0 ? "" : formData.vegPersons}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]+$/.test(val)) {
                      setFormData({ ...formData, vegPersons: val === "" ? 0 : parseInt(val) });
                    }
                  }}
                  className="h-11"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nonVegPersons">Non-Veg</Label>
                <Input 
                  id="nonVegPersons" 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.nonVegPersons === 0 ? "" : formData.nonVegPersons}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]+$/.test(val)) {
                      setFormData({ ...formData, nonVegPersons: val === "" ? 0 : parseInt(val) });
                    }
                  }}
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Total Persons</Label>
              <div className="h-11 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center">
                {formData.persons} Persons
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="referral">Referral Code (Optional)</Label>
          <Input 
            id="referral" 
            placeholder="Enter code for 5% discount" 
            value={(formData as any).referralCode || ""}
            onChange={(e) => setFormData({ ...formData, referralCode: e.target.value } as any)}
            className="h-11 border-primary/30 focus:border-primary"
          />
        </div>

        <div className="bg-primary/5 p-2 rounded-lg border border-primary/10">
          <p className="text-[10px] text-primary font-medium flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Children below 5 years stay for free!
          </p>
        </div>
      </div>

      <div className="bg-secondary/50 p-3 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-xs font-medium block text-muted-foreground">Advance Payment (30%)</span>
          <span className="text-lg font-bold text-primary">₹{advanceAmount}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-medium block text-muted-foreground">Total: ₹{totalPrice}</span>
        </div>
      </div>

      <Button
        className="w-full h-12 rounded-xl text-base font-bold gap-2 shadow-gold"
        onClick={handleBook}
        disabled={isLoading}
      >
        <CreditCard className="w-4 h-4" />
        {isLoading ? "Processing..." : "Pay & Confirm"}
      </Button>
    </div>
  );
}
