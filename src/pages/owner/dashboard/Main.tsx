import React, { useState, useEffect } from 'react';
import { CalendarSync } from "@/components/CalendarSync";
import { propertyAPI } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OwnerCalendar = () => {
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const propertyId = ownerData?.id || ownerData?.property_id;
  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!propertyId) return;
      // Use numeric ID for units
      const unitsRes = await propertyAPI.getUnits(propertyId);
      if (unitsRes.success) {
        setUnits(unitsRes.data);
        if (unitsRes.data.length > 0) setSelectedUnitId(unitsRes.data[0].id.toString());
      }
      // Get property category
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`/api/properties/${propertyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProperty(data.data);
    };
    fetchData();
  }, [propertyId]);

  const isCampingsCottages = property?.category === 'campings_cottages';

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#D4AF37] font-display tracking-tight">Availability Calendar</h1>
        {isCampingsCottages && units.length > 0 && (
          <div className="w-full sm:w-48">
            <Select value={selectedUnitId || ""} onValueChange={setSelectedUnitId}>
              <SelectTrigger className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white h-11">
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>
              <SelectContent className="bg-charcoal border-white/10 text-white">
                {units.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#D4AF37]/20 bg-black/40 shadow-2xl">
        <p className="text-[10px] sm:text-xs text-gray-400 mb-4 italic leading-relaxed">
          * Click on a date to toggle its booking status. This will update on the website and admin panel instantly.
        </p>
        {propertyId ? (
          <div className="w-full overflow-hidden">
            <CalendarSync 
              propertyId={ownerData?.property_id || propertyId} 
              unitId={selectedUnitId ? parseInt(selectedUnitId) : undefined} 
              unitName={units.find(u => u.id.toString() === selectedUnitId)?.name}
              isAdmin={true} 
              propertyName={property?.title}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 italic">
            No property linked to this account.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1A1A1A]/80 border border-[#D4AF37]/10 p-4 rounded-xl sm:rounded-2xl flex items-center space-x-3 transition-colors hover:bg-[#1A1A1A]">
          <div className="w-2.5 h-2.5 bg-[#00FF00] rounded-full shadow-[0_0_8px_#00FF00]" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-300">Available</span>
        </div>
        <div className="bg-[#1A1A1A]/80 border border-[#D4AF37]/10 p-4 rounded-xl sm:rounded-2xl flex items-center space-x-3 transition-colors hover:bg-[#1A1A1A]">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-300">Booked / Blocked</span>
        </div>
        <div className="bg-[#1A1A1A]/80 border border-[#D4AF37]/10 p-4 rounded-xl sm:rounded-2xl flex items-center space-x-3 transition-colors hover:bg-[#1A1A1A]">
          <div className="w-2.5 h-2.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-300">Today</span>
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendar;
