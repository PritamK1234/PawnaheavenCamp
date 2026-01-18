import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const OwnerRates = () => {
  const [rates, setRates] = useState({
    weekday: '1499',
    weekend: '3999'
  });

  const [customRates, setCustomRates] = useState([
    { date: 'Jan 26, 2026', price: '4999' }
  ]);

  const handleSave = () => {
    localStorage.setItem('propertyRates', JSON.stringify({ rates, customRates }));
    toast.success('Rates updated successfully');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Prices / Rates</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Base Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Weekday Rate (Mon–Thu)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input 
                className="pl-7" 
                type="number" 
                value={rates.weekday} 
                onChange={e => setRates({...rates, weekday: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Weekend Rate (Fri–Sun)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input 
                className="pl-7" 
                type="number" 
                value={rates.weekend} 
                onChange={e => setRates({...rates, weekend: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Custom Date Prices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {customRates.map((cr, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <span className="text-sm font-medium">{cr.date}</span>
              <div className="w-24 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                <Input 
                  className="pl-5 h-8 text-sm" 
                  value={cr.price} 
                  onChange={e => {
                    const newRates = [...customRates];
                    newRates[idx].price = e.target.value;
                    setCustomRates(newRates);
                  }}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full text-xs h-8">+ Add Special Date</Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-blue-600">Save Rates</Button>
    </div>
  );
};

export default OwnerRates;
