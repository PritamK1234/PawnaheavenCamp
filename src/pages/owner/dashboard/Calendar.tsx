import React, { useState, useEffect } from 'react';
import { CalendarSync } from "@/components/CalendarSync";

const OwnerCalendar = () => {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ownerDataString = localStorage.getItem('ownerData');
    if (ownerDataString) {
      const ownerData = JSON.parse(ownerDataString);
      setPropertyId(ownerData.property_id || ownerData.propertyId);
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8 text-center text-gold">Loading calendar...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold text-[#D4AF37] font-display">Property Availability</h1>
        <p className="text-xs text-gray-400 italic">
          * Click on future dates to toggle availability. Past dates are frozen.
        </p>
      </div>

      <div className="glass rounded-3xl border border-[#D4AF37]/30 overflow-hidden">
        {propertyId ? (
          <CalendarSync propertyId={propertyId} isAdmin={true} />
        ) : (
          <div className="p-12 text-center text-gray-500">
            No property linked to this account.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-center sm:space-x-6 text-xs font-bold uppercase tracking-widest">
        <div className="flex items-center space-x-2 bg-black/40 p-3 rounded-2xl border border-[#00FF00]/20">
          <div className="w-3 h-3 bg-[#00FF00] rounded-sm shadow-[0_0_8px_rgba(0,255,0,0.4)]" />
          <span className="text-[#00FF00]">Available</span>
        </div>
        <div className="flex items-center space-x-2 bg-black/40 p-3 rounded-2xl border border-[#FF0000]/20">
          <div className="w-3 h-3 bg-[#FF0000] rounded-sm shadow-[0_0_8px_rgba(255,0,0,0.4)]" />
          <span className="text-[#FF0000]">Booked</span>
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendar;
