import React, { useState, useEffect } from "react";
import { CalendarSync } from "@/components/CalendarSync";
import { CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { villaAPI } from "@/lib/api";

const OwnerCalendar = () => {
  const ownerDataString = localStorage.getItem("ownerData");
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const propertyId = ownerData?.property_id || ownerData?.id;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState({
    weekday: "",
    weekend: "",
    special: [] as { date: string; price: string }[],
  });

  const fetchData = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      // Use villa-specific API route
      // Try with alphanumeric propertyId (property_id field) first
      const propId = ownerData?.property_id || propertyId;
      const data = await villaAPI.getById(propId);

      if (data.success) {
        setProperty(data.data);
      } else {
        // Fallback for numeric ID (id field) if alphanumeric fails
        const numericId = ownerData?.id;
        if (numericId && numericId.toString() !== propId.toString()) {
          const dataFallback = await villaAPI.getById(numericId.toString());
          if (dataFallback.success) {
            setProperty(dataFallback.data);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  useEffect(() => {
    if (property) {
      setPrices({
        weekday: property.weekday_price || "",
        weekend: property.weekend_price || "",
        special: property.special_dates
          ? typeof property.special_dates === "string"
            ? JSON.parse(property.special_dates)
            : property.special_dates
          : [],
      });
    }
  }, [property]);

  const handlePriceUpdate = async () => {
    try {
      // Use villa-specific API route
      const data = await villaAPI.update(propertyId, {
        weekday_price: prices.weekday,
        weekend_price: prices.weekend,
        special_dates: prices.special,
      });
      if (data.success) {
        toast.success("Prices updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update prices");
    }
  };

  if (loading)
    return <div className="p-8 text-center text-[#D4AF37]">Loading...</div>;

  return (
    <div className="space-y-6 max-w-full sm:max-w-2xl mx-auto px-0 sm:px-4 pb-10">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#D4AF37] font-display">
          Manage Availability & Prices
        </h1>
      </div>

      <div className="space-y-8">
        {/* Availability Calendar First */}
        <div className="bg-black/40 border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <span className="w-1.5 h-6 bg-[#D4AF37] rounded-full" />
            Availability Calendar
          </h2>
          <div className="bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
            {property && (
              <div className="w-full overflow-hidden">
                <CalendarSync
                  propertyId={propertyId}
                  isAdmin={false}
                  propertyName={property?.title}
                  isVilla={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Prices Section Second */}
        <div className="bg-black/40 border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#D4AF37] rounded-full" />
            Standard Rates
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 Capatalize tracking-widest">
                Weekday Price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">
                  ₹
                </span>
                <Input
                  type="number"
                  value={prices.weekday}
                  onChange={(e) =>
                    setPrices({ ...prices, weekday: e.target.value })
                  }
                  className="pl-7 bg-white/5 border-white/10 text-white focus:border-[#D4AF37]"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 Capatalize tracking-widest">
                Weekend Price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">
                  ₹
                </span>
                <Input
                  type="number"
                  value={prices.weekend}
                  onChange={(e) =>
                    setPrices({ ...prices, weekend: e.target.value })
                  }
                  className="pl-7 bg-white/5 border-white/10 text-white focus:border-[#D4AF37]"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400 Capatalize tracking-widest">
                Special Day Prices
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPrices({
                    ...prices,
                    special: [...prices.special, { date: "", price: "" }],
                  })
                }
                className="h-8 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Special Day
              </Button>
            </div>

            <div className="space-y-3">
              {prices.special.map((special, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 items-center bg-white/5 p-3 rounded-xl border border-white/10"
                >
                  <Input
                    type="date"
                    value={special.date}
                    onChange={(e) => {
                      const newSpecial = [...prices.special];
                      newSpecial[idx].date = e.target.value;
                      setPrices({ ...prices, special: newSpecial });
                    }}
                    className="flex-1 bg-black/40 border-white/10 text-white text-xs"
                  />
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37] text-xs">
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={special.price}
                      onChange={(e) => {
                        const newSpecial = [...prices.special];
                        newSpecial[idx].price = e.target.value;
                        setPrices({ ...prices, special: newSpecial });
                      }}
                      className="pl-7 bg-black/40 border-white/10 text-white text-xs"
                      placeholder="Price"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPrices({
                        ...prices,
                        special: prices.special.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-gray-500 hover:text-red-500 p-2 h-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handlePriceUpdate}
            className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-11"
          >
            Update Prices
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendar;
