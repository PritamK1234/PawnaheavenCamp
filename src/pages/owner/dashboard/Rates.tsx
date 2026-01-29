import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { propertyAPI } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OwnerRates = () => {
  const [rates, setRates] = useState({
    weekday: '',
    weekend: '',
  });
  const [specialDates, setSpecialDates] = useState<{ date: string; price: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const fetchData = async () => {
    const ownerDataString = localStorage.getItem('ownerData');
    if (!ownerDataString) return;
    const ownerData = JSON.parse(ownerDataString);
    const id = ownerData.property_id || ownerData.propertyId;

    try {
      const token = localStorage.getItem('ownerToken') || localStorage.getItem('adminToken');
      const response = await fetch(`/api/properties/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setProperty(result.data);
        
        if (result.data.category === 'campings_cottages') {
          const unitsRes = await propertyAPI.getUnits(id);
          if (unitsRes.success) {
            setUnits(unitsRes.data);
            if (unitsRes.data.length > 0 && !selectedUnitId) {
              setSelectedUnitId(unitsRes.data[0].id.toString());
              return; // Effect will re-run with selectedUnitId
            }
          }
        }
        
        if (result.data.category === 'villa' || !selectedUnitId) {
          applyPropertyRates(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitRates = async (unitId: string) => {
    setLoading(true);
    try {
      const unitsRes = await propertyAPI.getUnits(property.id);
      if (unitsRes.success) {
        const unit = unitsRes.data.find((u: any) => u.id.toString() === unitId);
        if (unit) {
          // In unit-based mode, weekday/weekend prices are managed via unit calendar
          // For now, let's load unit's base pricing if available or use empty
          setRates({
            weekday: unit.price_per_person || '',
            weekend: '',
          });
          
          // Fetch unit calendar for special dates
          const calendarRes = await propertyAPI.getUnitCalendar(parseInt(unitId));
          if (calendarRes.success) {
            const special = calendarRes.data
              .filter((d: any) => d.is_special)
              .map((d: any) => ({
                date: format(new Date(d.date), 'yyyy-MM-dd'),
                price: d.price
              }));
            setSpecialDates(special);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching unit rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPropertyRates = (prop: any) => {
    const weekdayVal = prop.weekday_price !== null && prop.weekday_price !== undefined ? prop.weekday_price : (prop.price || '');
    const weekendVal = prop.weekend_price !== null && prop.weekend_price !== undefined ? prop.weekend_price : '';
    
    setRates({
      weekday: weekdayVal !== '' ? String(weekdayVal) : '',
      weekend: weekendVal !== '' ? String(weekendVal) : '',
    });
    
    if (prop.special_dates) {
      try {
        const sd = Array.isArray(prop.special_dates) ? prop.special_dates : JSON.parse(prop.special_dates);
        setSpecialDates(sd);
      } catch (e) {
        setSpecialDates([]);
      }
    } else {
      setSpecialDates([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUnitId && property?.category === 'campings_cottages') {
      fetchUnitRates(selectedUnitId);
    }
  }, [selectedUnitId]);

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
    if (!property) return;
    
    try {
      const token = localStorage.getItem('ownerToken') || localStorage.getItem('adminToken');
      
      if (property.category === 'campings_cottages' && selectedUnitId) {
        // Update Unit Calendar for both base and special dates
        // This mirrors Admin behavior for units
        const unitId = parseInt(selectedUnitId);
        
        // 1. Update Special Dates
        const calendarUpdates = specialDates
          .filter(sd => sd.date && sd.price)
          .map(sd => 
            propertyAPI.updateUnitCalendar(unitId, {
              date: sd.date,
              price: sd.price,
              is_booked: false,
              is_special: true
            })
          );
        
        // 2. Also update unit's base price if needed
        const unitUpdate = propertyAPI.updateUnit(unitId, {
          price_per_person: rates.weekday
        });

        await Promise.all([...calendarUpdates, unitUpdate]);
        toast.success('Unit rates updated successfully.');
      } else {
        // Villa path - untouched logic
        const payload = {
          weekday_price: rates.weekday,
          weekend_price: rates.weekend,
          price: rates.weekday,
          special_dates: specialDates
        };
        
        const response = await fetch(`/api/properties/update/${property.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to update rates');

        // Update special dates in property calendar
        const calendarUpdates = specialDates
          .filter(sd => sd.date && sd.price)
          .map(sd => 
            fetch(`/api/properties/${property.id}/calendar`, {
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
        
        if (calendarUpdates.length > 0) await Promise.all(calendarUpdates);
        toast.success('Rates updated successfully.');
      }
      
      await fetchData();
    } catch (error) {
      console.error('Error saving rates:', error);
      toast.error('Error updating rates.');
    }
  };

  if (loading) return <div className="p-8 text-center text-[#D4AF37]">Loading rates...</div>;

  const isCampingsCottages = property?.category === 'campings_cottages';

  return (
    <div className="space-y-6 max-w-full sm:max-w-2xl mx-auto px-0 sm:px-4 pb-10">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#D4AF37] font-display">Manage Prices & Rates</h1>
        
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
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 sm:px-0">
        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl">
          <CardContent className="pt-6">
            <Label className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">
              Weekdays (Base)
            </Label>
            <div className="text-2xl font-bold text-white">
              {rates.weekday ? `₹${rates.weekday}` : <span className="text-gray-500 text-sm font-normal italic">Not set</span>}
            </div>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Mon-Thu Pricing</p>
          </CardContent>
        </Card>
        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl">
          <CardContent className="pt-6">
            <Label className="text-green-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">
              Weekends
            </Label>
            <div className="text-2xl font-bold text-white">
              {rates.weekend ? `₹${rates.weekend}` : <span className="text-gray-500 text-sm font-normal italic">Not set</span>}
            </div>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Fri-Sun Pricing</p>
          </CardContent>
        </Card>
        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl">
          <CardContent className="pt-6">
            <Label className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">
              Special Days
            </Label>
            <div className="text-2xl font-bold text-white">
              {specialDates.length > 0 ? `₹${specialDates[0].price}` : <span className="text-gray-500 text-sm font-normal italic">None</span>}
            </div>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Holidays & Events</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
                Weekday Price (Base)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                <Input 
                  type="text" 
                  className="pl-7 bg-black/60 border-[#D4AF37]/20 text-white" 
                  value={rates.weekday}
                  onChange={(e) => setRates({...rates, weekday: e.target.value})}
                  placeholder="e.g. 1499"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">Weekend Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                <Input 
                  type="text" 
                  className="pl-7 bg-black/60 border-[#D4AF37]/20 text-white" 
                  value={rates.weekend}
                  onChange={(e) => setRates({...rates, weekend: e.target.value})}
                  placeholder="e.g. 1999"
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
