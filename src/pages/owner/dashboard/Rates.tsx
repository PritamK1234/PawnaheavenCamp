import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const OwnerRates = () => {
  const [rates, setRates] = useState({
    weekday: '',
    weekend: '',
  });
  const [specialDates, setSpecialDates] = useState<{ date: string; price: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      const ownerDataString = localStorage.getItem('ownerData');
      if (!ownerDataString) return;
      const ownerData = JSON.parse(ownerDataString);
      const id = ownerData.property_id || ownerData.propertyId;
      setPropertyId(id);

      try {
        const response = await fetch(`/api/properties/${id}`);
        const result = await response.json();
        if (result.success) {
          const prop = result.data;
          setRates({
            weekday: prop.weekday_price || prop.price || '',
            weekend: prop.weekend_price || '',
          });
          
          if (prop.special_dates) {
            const sd = Array.isArray(prop.special_dates) 
              ? prop.special_dates 
              : JSON.parse(prop.special_dates);
            setSpecialDates(sd);
          }
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  const handleAddSpecialDate = () => {
    setSpecialDates([...specialDates, { date: format(new Date(), 'yyyy-MM-dd'), price: '' }]);
  };

  const handleRemoveSpecialDate = (index: number) => {
    setSpecialDates(specialDates.filter((_, i) => i !== index));
  };

  const handleSpecialDateChange = (index: number, field: 'date' | 'price', value: string) => {
    const newSpecialDates = [...specialDates];
    newSpecialDates[index][field] = value;
    setSpecialDates(newSpecialDates);
  };

  const handleSave = async () => {
    if (!propertyId) return;
    
    try {
      const token = localStorage.getItem('ownerToken') || localStorage.getItem('adminToken');
      
      const payload = {
        weekday_price: rates.weekday,
        weekend_price: rates.weekend,
        price: rates.weekday,
        special_dates: specialDates
      };
      
      console.log('Saving rates with payload:', payload);

      // 1. Update base rates and special_dates
      const response = await fetch(`/api/properties/update/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update rates');
      }

      // 2. Update special dates in calendar for real-time sync
      const calendarUpdates = specialDates
        .filter(sd => sd.date && sd.price)
        .map(sd => 
          fetch(`/api/properties/${propertyId}/calendar`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              date: sd.date,
              price: sd.price,
              is_booked: false
            })
          })
        );
      
      if (calendarUpdates.length > 0) {
        await Promise.all(calendarUpdates);
      }
      
      toast.success('Rates and Special Dates updated successfully.');
      
      // Re-fetch data to ensure UI is in sync with backend
      const refreshResponse = await fetch(`/api/properties/${propertyId}`);
      const refreshResult = await refreshResponse.json();
      if (refreshResult.success) {
        const prop = refreshResult.data;
        setRates({
          weekday: prop.weekday_price || prop.price || '',
          weekend: prop.weekend_price || '',
        });
        if (prop.special_dates) {
          const sd = Array.isArray(prop.special_dates) 
            ? prop.special_dates 
            : JSON.parse(prop.special_dates);
          setSpecialDates(sd);
        }
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Error updating rates.');
    }
  };

  if (loading) return <div className="p-8 text-center text-[#D4AF37]">Loading rates...</div>;

  return (
    <div className="space-y-6 max-w-full sm:max-w-2xl mx-auto px-0 sm:px-4">
      <h1 className="text-2xl font-bold text-[#D4AF37] font-display px-4 sm:px-0">Manage Prices & Rates</h1>
      
      {/* Current Rates Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 sm:px-0">
        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl">
          <CardContent className="pt-6">
            <Label className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-2 block">Current Weekday Rate (Monday - Friday)</Label>
            <div className="text-2xl font-bold text-white">
              {rates.weekday ? `₹${rates.weekday}` : <span className="text-gray-500 text-sm font-normal italic">Not set</span>}
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl">
          <CardContent className="pt-6">
            <Label className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-2 block">Current Weekend Rate (Sat - Sunday)</Label>
            <div className="text-2xl font-bold text-white">
              {rates.weekend ? `₹${rates.weekend}` : <span className="text-gray-500 text-sm font-normal italic">Not set</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {specialDates.length > 0 && (
        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl mx-4 sm:mx-0">
          <CardContent className="pt-6">
            <Label className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-4 block">Active Special Rates</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {specialDates.map((sd, idx) => (
                <div key={idx} className="bg-black/40 p-2 rounded-lg border border-[#D4AF37]/10">
                  <div className="text-[10px] text-gray-400">{format(new Date(sd.date), 'MMM dd, yyyy')}</div>
                  <div className="text-sm font-bold text-white">₹{sd.price}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">Weekday Price (Mon-Fri)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                <Input 
                  type="text" 
                  className="pl-7 bg-black/60 border-[#D4AF37]/20 text-white" 
                  value={rates.weekday}
                  onChange={(e) => setRates({...rates, weekday: e.target.value})}
                  placeholder="e.g. 7499"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">Weekend Price (Sat-Sun)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                <Input 
                  type="text" 
                  className="pl-7 bg-black/60 border-[#D4AF37]/20 text-white" 
                  value={rates.weekend}
                  onChange={(e) => setRates({...rates, weekend: e.target.value})}
                  placeholder="e.g. 8999"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#D4AF37]/10">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">Special Date Prices</Label>
              <Button 
                onClick={handleAddSpecialDate}
                variant="outline" 
                size="sm"
                className="h-8 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Date
              </Button>
            </div>

            <div className="space-y-3">
              {specialDates.map((sd, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-black/20 p-3 rounded-lg border border-[#D4AF37]/10">
                  <div className="flex-1">
                    <Input 
                      type="date" 
                      className="bg-black/40 border-[#D4AF37]/20 text-white text-xs h-10 w-full" 
                      value={sd.date}
                      onChange={(e) => handleSpecialDateChange(index, 'date', e.target.value)}
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-gray-400 text-xs">₹</span>
                    <Input 
                      type="text" 
                      className="pl-7 bg-black/40 border-[#D4AF37]/20 text-white text-xs h-10 w-full" 
                      value={sd.price}
                      onChange={(e) => handleSpecialDateChange(index, 'price', e.target.value)}
                      placeholder="Price"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-400 h-10 w-10 self-end sm:self-auto"
                    onClick={() => handleRemoveSpecialDate(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {specialDates.length === 0 && (
                <p className="text-center text-[10px] text-gray-500 italic py-2">No special dates added.</p>
              )}
            </div>
          </div>

          <Button 
            className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold mt-4 h-12 rounded-xl"
            onClick={handleSave}
          >
            Update Rates & Sync Calendars
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerRates;
