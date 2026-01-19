import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LogOut, User, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PWAInstallButton from '@/components/owner/pwa/PWAInstallButton';

const OwnerProfile = () => {
  const navigate = useNavigate();
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : { propertyName: 'My Property', ownerName: 'Owner', ownerNumber: '9999999999' };

  const [details, setDetails] = useState({
    amenities: ['Lake View', 'Private Washroom', 'BBQ Facility'],
    activities: ['Boating', 'Swimming', 'Bonfire'],
    policy: 'No Smoking in tents. Check-in: 4 PM.'
  });

  const [newItem, setNewItem] = useState({ type: '', value: '' });

  const handleLogout = () => {
    localStorage.removeItem('ownerLoggedIn');
    navigate('/owner');
  };

  const handleSave = () => {
    localStorage.setItem('ownerProfileDetails', JSON.stringify(details));
    toast.success('Profile details saved');
  };

  const addItem = (type: 'amenities' | 'activities') => {
    if (!newItem.value.trim()) return;
    setDetails({
      ...details,
      [type]: [...details[type], newItem.value.trim()]
    });
    setNewItem({ type: '', value: '' });
  };

  const removeItem = (type: 'amenities' | 'activities', index: number) => {
    const newList = [...details[type]];
    newList.splice(index, 1);
    setDetails({ ...details, [type]: newList });
  };

  const TagList = ({ type, items }: { type: 'amenities' | 'activities', items: string[] }) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center bg-black/40 border border-[#D4AF37]/30 px-3 py-1.5 rounded-md group">
            <span className="text-xs text-gray-200">{item}</span>
            <button 
              onClick={() => removeItem(type, idx)}
              className="ml-2 text-gray-500 hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {newItem.type === type ? (
          <div className="flex items-center space-x-2">
            <Input 
              autoFocus
              className="h-8 text-xs bg-black/60 border-[#D4AF37] text-white w-32"
              value={newItem.value}
              onChange={e => setNewItem({ ...newItem, value: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addItem(type)}
              onBlur={() => newItem.value ? addItem(type) : setNewItem({ type: '', value: '' })}
            />
          </div>
        ) : (
          <button 
            onClick={() => setNewItem({ type, value: '' })}
            className="flex items-center justify-center w-8 h-8 rounded-md border border-dashed border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#D4AF37]">Profile</h2>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:bg-red-500/10">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-[#1A1A1A] to-black border-[#D4AF37]/30 text-white shadow-2xl">
        <CardContent className="pt-6 flex items-center space-x-4">
          <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <User className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-[#D4AF37]">{ownerData.propertyName}</h3>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">{ownerData.ownerName} • {ownerData.ownerNumber}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Amenities</Label>
          <TagList type="amenities" items={details.amenities} />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Activities</Label>
          <TagList type="activities" items={details.activities} />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Property Policy</Label>
          <Textarea 
            className="bg-[#1A1A1A] border-[#D4AF37]/20 text-gray-200 focus:border-[#D4AF37] min-h-[100px]"
            value={details.policy} 
            onChange={e => setDetails({...details, policy: e.target.value})}
            placeholder="Property policies..."
          />
        </div>
        
        <Button onClick={handleSave} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 shadow-xl">
          Save Profile
        </Button>
      </div>
    </div>
  );
};

export default OwnerProfile;
