import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarSync } from "@/components/CalendarSync";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isWeekend } from "date-fns";
import { Calendar as CalendarIcon, Users, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SpecialDate {
  date: string;
  price: string;
}

interface BookingFormProps {
  propertyName: string;
  propertyId: string;
  pricePerPerson: number;
  weekendPrice?: number;
  specialDates?: SpecialDate[];
  propertyCategory?: string;
  maxCapacity?: number;
  onClose?: () => void;
  selectedUnitId?: number;
  ownerPhone?: string;
  ownerName?: string;
  initialCheckIn?: Date;
}

export function BookingForm({
  propertyName,
  propertyId,
  pricePerPerson,
  weekendPrice,
  specialDates = [],
  propertyCategory = "camping",
  maxCapacity = 4,
  onClose,
  selectedUnitId,
  ownerPhone,
  ownerName,
  initialCheckIn,
}: BookingFormProps) {
  const navigate = useNavigate();

  const { toast } = useToast();

  const getInitialDates = () => {
    if (initialCheckIn) {
      const nextDay = new Date(initialCheckIn);
      nextDay.setDate(initialCheckIn.getDate() + 1);
      return { checkIn: initialCheckIn, checkOut: nextDay };
    }
    return {
      checkIn: undefined as Date | undefined,
      checkOut: undefined as Date | undefined,
    };
  };

  const initialDates = getInitialDates();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    persons: 1,
    vegPersons: 1,
    nonVegPersons: 0,
    checkIn: initialDates.checkIn,
    checkOut: initialDates.checkOut,
    referralCode: localStorage.getItem("applied_referral_code") || "",
  });

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [totalPrice, setTotalPrice] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);

  const isVilla = propertyCategory?.toLowerCase() === "villa";

  const getPriceForNight = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (Array.isArray(specialDates) && specialDates.length > 0) {
      const special = specialDates.find(sd => sd.date === dateStr);
      if (special?.price) {
        const p = parseInt(String(special.price).replace(/[^\d]/g, ""));
        if (p > 0) return p;
      }
    }
    if (isWeekend(date) && weekendPrice && weekendPrice > 0) return weekendPrice;
    return pricePerPerson;
  };

  useEffect(() => {
    const totalPersons =
      (formData.vegPersons || 0) + (formData.nonVegPersons || 0);

    if (formData.persons !== totalPersons && !isVilla) {
      setFormData((prev) => ({ ...prev, persons: totalPersons }));
    }

    let total = 0;

    if (formData.checkIn && formData.checkOut) {
      const current = new Date(formData.checkIn);
      current.setHours(12, 0, 0, 0);
      const end = new Date(formData.checkOut);
      end.setHours(12, 0, 0, 0);

      while (current < end) {
        const nightPrice = getPriceForNight(current);
        if (isVilla) {
          total += nightPrice;
        } else {
          total += totalPersons * nightPrice;
        }
        current.setDate(current.getDate() + 1);
      }

      if (total === 0) {
        total = isVilla ? pricePerPerson : totalPersons * pricePerPerson;
      }
    } else {
      total = isVilla ? pricePerPerson : totalPersons * pricePerPerson;
    }

    setTotalPrice(total);
    setAdvanceAmount(Math.round(total * 0.3));
  }, [
    formData.persons,
    formData.vegPersons,
    formData.nonVegPersons,
    formData.checkIn,
    formData.checkOut,
    pricePerPerson,
    weekendPrice,
    specialDates,
    isVilla,
  ]);

  const handleCheckInSelect = (date: Date | undefined) => {
    if (!date) return;

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    setFormData((prev) => ({
      ...prev,
      checkIn: date,
      checkOut: isVilla
        ? prev.checkOut && prev.checkOut > date
          ? prev.checkOut
          : nextDay
        : nextDay,
    }));
    setIsCheckInOpen(false);
  };

  const validateForm = (): boolean => {
    const name = formData.name.trim();
    const mobile = formData.mobile.trim();

    // ✅ Name validation
    const nameRegex = /^[A-Za-z\s]{3,50}$/;
    if (!name) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!nameRegex.test(name)) {
      toast({
        title: "Validation Error",
        description: "Name must be 3-50 letters only",
        variant: "destructive",
      });
      return false;
    }

    // ✅ Mobile validation (Indian 10-digit)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      toast({
        title: "Validation Error",
        description: "Enter valid 10-digit mobile number",
        variant: "destructive",
      });
      return false;
    }

    // ✅ Date validation
    if (!formData.checkIn || !formData.checkOut) {
      toast({
        title: "Validation Error",
        description: "Please select check-in and check-out dates",
        variant: "destructive",
      });
      return false;
    }

    // ✅ Persons validation
    if (isVilla) {
      if (!Number.isInteger(formData.persons)) {
        toast({
          title: "Validation Error",
          description: "Invalid number of persons",
          variant: "destructive",
        });
        return false;
      }

      if (formData.persons < 1) {
        toast({
          title: "Validation Error",
          description: "At least 1 person required",
          variant: "destructive",
        });
        return false;
      }

      if (formData.persons > maxCapacity) {
        toast({
          title: "Validation Error",
          description: `Maximum ${maxCapacity} guests allowed`,
          variant: "destructive",
        });
        return false;
      }
    } else {
      const totalPersons =
        (formData.vegPersons || 0) + (formData.nonVegPersons || 0);

      if (totalPersons < 1) {
        toast({
          title: "Validation Error",
          description: "At least 1 guest required",
          variant: "destructive",
        });
        return false;
      }

      if (totalPersons > maxCapacity) {
        toast({
          title: "Validation Error",
          description: `Maximum ${maxCapacity} guests allowed`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleBook = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const checkInDateTime = new Date(formData.checkIn);
      checkInDateTime.setHours(14, 0, 0, 0);

      const checkOutDateTime = new Date(formData.checkOut);
      checkOutDateTime.setHours(11, 0, 0, 0);

      const referralCode = formData.referralCode || "";

      const bookingPayload: any = {
        property_id: propertyId,
        property_name: propertyName,
        property_type: isVilla ? "VILLA" : "CAMPING",
        guest_name: formData.name,
        guest_phone: formData.mobile,
        owner_phone: ownerPhone
          ? ownerPhone.startsWith("+91")
            ? ownerPhone
            : `+91${ownerPhone}`
          : "+918806092609",
        admin_phone: "+918806092609",
        owner_name: ownerName || undefined,
        checkin_datetime: checkInDateTime.toISOString(),
        checkout_datetime: checkOutDateTime.toISOString(),
        advance_amount: advanceAmount,
        total_amount: totalPrice,
        referral_code: referralCode || undefined,
        unit_id: selectedUnitId || undefined,
      };

      if (isVilla) {
        bookingPayload.persons = formData.persons;
        bookingPayload.max_capacity = maxCapacity;
      } else {
        bookingPayload.veg_guest_count = formData.vegPersons || 0;
        bookingPayload.nonveg_guest_count = formData.nonVegPersons || 0;
      }

      const bookingResponse = await fetch(`/api/bookings/initiate`, {
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

      const bookingId = bookingData.booking.booking_id;
      localStorage.setItem("pending_booking_id", bookingId);
      localStorage.setItem("pending_booking_time", Date.now().toString());
      localStorage.setItem("booking_return_url", window.location.pathname);

      window.dispatchEvent(new CustomEvent("calendarUpdate"));

      setIsLoading(false);
      navigate("/payment-processing", {
        state: { bookingId, returnPath: window.location.pathname },
      });
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
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
              placeholder="Enter Your Full Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value.replace(/[^A-Za-z\s]/g, ""),
                })
              }
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mobile">Mobile Number (whatsapp)</Label>
            <Input
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              id="mobile"
              type="tel"
              inputMode="tel"
              placeholder="Enter WhatsApp Mobile number"
              value={formData.mobile}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  mobile: e.target.value.replace(/\D/g, ""),
                })
              }
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
                    !formData.checkIn && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {formData.checkIn
                      ? format(formData.checkIn, "MMM d")
                      : "Date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <div className="p-3">
                  <CalendarSync
                    propertyId={propertyId}
                    unitId={selectedUnitId}
                    isVilla={isVilla}
                    isBookingForm={true}
                    onDateSelect={handleCheckInSelect}
                  />
                </div>
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
                      !formData.checkOut && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {formData.checkOut
                        ? format(formData.checkOut, "MMM d")
                        : "Date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="end">
                  <div className="p-3">
                    <CalendarSync
                      propertyId={propertyId}
                      unitId={selectedUnitId}
                      isVilla={isVilla}
                      isBookingForm={true}
                      onDateSelect={(date) => {
                        if (!date || !formData.checkIn) return;

                        // ❌ Prevent selecting check-out before or same as check-in
                        if (date <= formData.checkIn) {
                          toast({
                            title: "Invalid Date",
                            description:
                              "Check-out must be after check-in date",
                            variant: "destructive",
                          });
                          return;
                        }

                        setFormData({ ...formData, checkOut: date });
                        setIsCheckOutOpen(false);
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="h-11 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2 cursor-not-allowed opacity-70">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {formData.checkOut
                  ? format(formData.checkOut, "MMM d")
                  : "Next day"}
              </div>
            )}
          </div>
        </div>

        {isVilla ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="persons">Person's Count</Label>
              <Input
                id="persons"
                type="number"
                min="1"
                max={maxCapacity}
                value={formData.persons === 0 ? "" : formData.persons}
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
                <Label htmlFor="vegPersons">Veg Person's Count</Label>
                <Input
                  id="vegPersons"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="No. of Veg Guests"
                  value={formData.vegPersons === 0 ? "" : formData.vegPersons}
                  onChange={(e) => {
                    const val = e.target.value;

                    if (val === "" || /^[0-9]+$/.test(val)) {
                      const newVeg = val === "" ? 0 : parseInt(val);
                      const total = newVeg + (formData.nonVegPersons || 0);

                      if (total > maxCapacity) {
                        toast({
                          title: "Capacity Exceeded",
                          description: `Maximum ${maxCapacity} guests allowed`,
                          variant: "destructive",
                        });
                        return;
                      }

                      setFormData({
                        ...formData,
                        vegPersons: newVeg,
                        persons: total,
                      });
                    }
                  }}
                  className="h-11"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nonVegPersons">Non-Veg Person's Count</Label>
                <Input
                  id="nonVegPersons"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="No. of Non-Veg Guests"
                  value={
                    formData.nonVegPersons === 0 ? "" : formData.nonVegPersons
                  }
                  onChange={(e) => {
                    const val = e.target.value;

                    if (val === "" || /^[0-9]+$/.test(val)) {
                      const newNonVeg = val === "" ? 0 : parseInt(val);
                      const total = (formData.vegPersons || 0) + newNonVeg;

                      if (total > maxCapacity) {
                        toast({
                          title: "Capacity Exceeded",
                          description: `Maximum ${maxCapacity} guests allowed`,
                          variant: "destructive",
                        });
                        return;
                      }

                      setFormData({
                        ...formData,
                        nonVegPersons: newNonVeg,
                        persons: total,
                      });
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

        {formData.referralCode && (
          <div className="grid gap-1.5">
            <Label htmlFor="referral">Referral Code</Label>
            <Input
              id="referral"
              value={formData.referralCode}
              readOnly
              className="h-11 border-primary/30 bg-primary/5 cursor-default"
            />
          </div>
        )}

        <div className="bg-primary/5 p-2 rounded-lg border border-primary/10">
          <p className="text-[10px] text-primary font-medium flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Children below 5 years stay for free!
          </p>
        </div>
      </div>

      <div className="bg-secondary/50 p-3 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-xs font-medium block text-white-foreground">
            Advance Payment (30%)
          </span>
          <span className="text-lg font-bold text-primary">
            ₹{advanceAmount}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-medium block text-white-foreground">
            Total: ₹{totalPrice}
          </span>
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
