import React, { useState, useEffect } from 'react';
import { CalendarSync } from "@/components/CalendarSync";
import { propertyAPI } from "@/lib/api";
import { CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const OwnerCalendar = () => {
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const propertyId = ownerData?.id || ownerData?.property_id;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('ownerToken') || localStorage.getItem('adminToken');
      const res = await fetch(`/api/properties/${propertyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProperty(data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  if (loading) return <div className="p-8 text-center text-[#D4AF37]">Loading...</div>;

  return (
    <div className="space-y-6 max-w-full sm:max-w-2xl mx-auto px-0 sm:px-4 pb-10">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#D4AF37] font-display">Manage Availability</h1>
      </div>
      
      <div className="space-y-8">
        <div className="bg-black/40 border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8">
          <div className="bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
            {property && (
              <div className="w-full overflow-hidden">
                <CalendarSync 
                  propertyId={propertyId} 
                  isAdmin={true} 
                  propertyName={property?.title}
                  isVilla={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendar;
