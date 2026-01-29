import React, { useState, useEffect } from 'react';
import { CalendarSync } from "@/components/CalendarSync";
import { propertyAPI } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OwnerCalendar = () => {
  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const ownerDataString = localStorage.getItem('ownerData');
    if (!ownerDataString) {
      setLoading(false);
      return;
    }
    
    const ownerData = JSON.parse(ownerDataString);
    const propertyId = ownerData.property_id || ownerData.propertyId;

    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`/api/properties/${propertyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.success && result.data) {
        setProperty(result.data);
        
        if (result.data.category === 'campings_cottages') {
          const unitsRes = await propertyAPI.getUnits(propertyId);
          if (unitsRes.success) {
            setUnits(unitsRes.data);
            if (unitsRes.data.length > 0) {
              setSelectedUnitId(unitsRes.data[0].id.toString());
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gold">Loading calendar...</div>;

  const isCampingsCottages = property?.category === 'campings_cottages';

  return (
    <div className="space-y-6 w-full px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold text-[#D4AF37] font-display">Availability</h1>
          <p className="text-[10px] text-gray-400 italic">
            * Toggle future dates. Past dates frozen.
          </p>
        </div>
        
        {isCampingsCottages && units.length > 0 && (
          <div className="w-48">
            <Select value={selectedUnitId || ""} onValueChange={setSelectedUnitId}>
              <SelectTrigger className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white">
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>
              <SelectContent className="bg-charcoal border-white/10 text-white">
                {units.map(u => (
                  <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="w-full">
        {property?.id ? (
          <CalendarSync 
            propertyId={property.id.toString()} 
            unitId={selectedUnitId ? parseInt(selectedUnitId) : undefined}
            isAdmin={true} 
          />
        ) : (
          <div className="p-12 text-center text-gray-500 glass rounded-3xl">
            No property linked to this account.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-tighter">
        <div className="flex items-center justify-center space-x-2 bg-black/40 p-2 rounded-xl border border-[#00FF00]/20">
          <div className="w-2 h-2 bg-[#00FF00] rounded-full" />
          <span className="text-[#00FF00]">Available</span>
        </div>
        <div className="flex items-center justify-center space-x-2 bg-black/40 p-2 rounded-xl border border-[#FF0000]/20">
          <div className="w-2 h-2 bg-[#FF0000] rounded-full" />
          <span className="text-[#FF0000]">Booked</span>
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendar;
