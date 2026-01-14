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
    checkIn: undefined as Date | undefined,
    checkOut: undefined as Date | undefined,
  });

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

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

    const total = isVilla ? pricePerPerson * days : formData.persons * pricePerPerson;
    setTotalPrice(total);
    setAdvanceAmount(Math.round(total * 0.3)); // 30% advance
  }, [formData.persons, formData.checkIn, formData.checkOut, pricePerPerson, isVilla]);

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

  const handleBook = () => {
    if (!formData.name || !formData.mobile || !formData.checkIn || !formData.checkOut) {
      alert("Please fill all details");
      return;
    }

    if (formData.persons === 0) {
      alert("Please enter number of persons");
      return;
    }

    if (onClose) onClose();
    
    // Navigate to demo payment page with state
    navigate("/payment/demo", { 
      state: { 
        bookingData: {
          ...formData,
          propertyId: propertyId,
          propertyTitle: propertyName,
          checkIn: format(formData.checkIn, "PPP"),
          checkOut: format(formData.checkOut, "PPP"),
          totalPrice,
          advanceAmount
        },
        amount: advanceAmount.toString()
      } 
    });
  };

  return (
    <div className="space-y-4 py-0 pb-20 md:pb-0">
      <div className="grid gap-4 max-h-[60vh] md:max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <div className="grid gap-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            placeholder="Enter your name" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input 
            id="mobile" 
            type="tel"
            inputMode="tel"
            placeholder="Enter mobile number" 
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Check-in</Label>
            <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !formData.checkIn && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.checkIn ? format(formData.checkIn, "MMM d, yyyy") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.checkIn}
                  onSelect={handleCheckInSelect}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label>Check-out</Label>
            {isVilla ? (
              <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !formData.checkOut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.checkOut ? format(formData.checkOut, "MMM d, yyyy") : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
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
                      return date < minDate || date > maxDate;
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2 cursor-not-allowed opacity-70">
                <CalendarIcon className="h-4 w-4" />
                {formData.checkOut ? format(formData.checkOut, "MMM d, yyyy") : "Next day"}
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="persons">Number of Persons</Label>
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
            />
          </div>
          <div className="grid gap-2">
            <Label>Max Capacity</Label>
            <div className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center">
              {maxCapacity} Persons
            </div>
          </div>
        </div>

        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
          <p className="text-xs text-primary font-medium flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Note: Children below 5 years stay for free!
          </p>
        </div>
      </div>

      <div className="bg-secondary/50 p-4 rounded-2xl space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Price:</span>
          <span className="text-xl font-bold text-primary">₹{totalPrice}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Advance Payment (30%):</span>
          <span className="text-lg font-semibold text-primary">₹{advanceAmount}</span>
        </div>
      </div>

      <Button 
        className="w-full h-14 rounded-xl text-lg font-bold gap-2" 
        onClick={handleBook}
      >
        <CreditCard className="w-5 h-5" />
        Pay Advance & Confirm
      </Button>
    </div>
  );
}
