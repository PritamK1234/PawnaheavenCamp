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
        }

        // Fetch special dates from availability_calendar
        const calResponse = await fetch(`/api/properties/${id}/calendar`);
        const calResult = await calResponse.json();
        if (calResult.success) {
          const customPrices = calResult.data
            .filter((d: any) => d.price && d.price !== prop.weekday_price && d.price !== prop.weekend_price)
            .map((d: any) => ({
              date: format(new Date(d.date), 'yyyy-MM-dd'),
              price: d.price
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
      
      // 1. Update base rates and special_dates
      await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          weekday_price: rates.weekday,
          weekend_price: rates.weekend,
          price: rates.weekday,
          special_dates: specialDates
        })
      });

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
                <div key={index} className="flex items-center space-x-2 bg-black/20 p-2 rounded-lg border border-[#D4AF37]/10">
                  <Input 
                    type="date" 
                    className="bg-black/40 border-[#D4AF37]/20 text-white text-xs h-9" 
                    value={sd.date}
                    onChange={(e) => handleSpecialDateChange(index, 'date', e.target.value)}
                  />
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-gray-400 text-xs">₹</span>
                    <Input 
                      type="text" 
                      className="pl-5 bg-black/40 border-[#D4AF37]/20 text-white text-xs h-9" 
                      value={sd.price}
                      onChange={(e) => handleSpecialDateChange(index, 'price', e.target.value)}
                      placeholder="Price"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-400 h-9 w-9"
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
