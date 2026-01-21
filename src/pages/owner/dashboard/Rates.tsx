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
        let currentProp = null;
        if (result.success) {
          currentProp = result.data;
          setRates({
            weekday: currentProp.weekday_price || currentProp.price || '',
            weekend: currentProp.weekend_price || '',
          });
        }

        // Fetch special dates from availability_calendar
        const calResponse = await fetch(`/api/properties/${id}/calendar`);
        const calResult = await calResponse.json();
        if (calResult.success && currentProp) {
          const customPrices = calResult.data
            .filter((d: any) => d.price && d.price.toString() !== currentProp.weekday_price?.toString() && d.price.toString() !== currentProp.weekend_price?.toString())
            .map((d: any) => ({
              date: format(new Date(d.date), 'yyyy-MM-dd'),
              price: d.price.toString()
            }));
          setSpecialDates(customPrices);
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
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('Update Response:', responseData);

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || 'Failed to update base rates');
      }

      // 2. Update special dates in calendar for real-time sync
      for (const sd of specialDates) {
        if (sd.date && sd.price) {
          await fetch(`/api/properties/${propertyId}/calendar`, {
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
          });
        }
      }
      
      toast.success('Rates and Special Dates updated successfully.');
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Error updating rates.');
    }
  };

  if (loading) return <div className="p-8 text-center text-[#D4AF37]">Loading rates...</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-[#D4AF37] font-display">Manage Prices & Rates</h1>
      
      <Card className="glass border-[#D4AF37]/30 bg-black/40">
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
