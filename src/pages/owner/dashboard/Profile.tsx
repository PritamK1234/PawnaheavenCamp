import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LogOut, User, Plus, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PWAInstallButton from '@/components/owner/pwa/PWAInstallButton';
import { propertyAPI } from '@/lib/api';

const OwnerProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ type: '', value: '', time: '' });
  const [details, setDetails] = useState({
    amenities: [] as string[],
    activities: [] as string[],
    highlights: [] as string[],
    policies: [] as string[],
    schedule: [] as {time: string, title: string}[],
    description: ''
  });

  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;

  useEffect(() => {
    const fetchProfile = async () => {
      const ownerDataString = localStorage.getItem('ownerData');
      if (!ownerDataString) return;
      const ownerDataObj = JSON.parse(ownerDataString);
      const propId = ownerDataObj.property_id || ownerDataObj.id;
      if (!propId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/properties/${propId}`);
        const result = await response.json();
        if (result.success) {
          const prop = result.data;
          setDetails({
            amenities: Array.isArray(prop.amenities) ? prop.amenities : [],
            activities: Array.isArray(prop.activities) ? prop.activities : [],
            highlights: Array.isArray(prop.highlights) ? prop.highlights : [],
            policies: Array.isArray(prop.policies) ? prop.policies : [],
            schedule: Array.isArray(prop.schedule) ? prop.schedule : [],
            description: prop.description || ''
          });
        }
      } catch (error) {
        console.error('Fetch profile error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ownerLoggedIn');
    navigate('/owner');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (ownerData?.property_id) {
        const response = await fetch(`/api/properties/update/${ownerData.property_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(details)
        });
        const result = await response.json();
        if (result.success) {
          toast.success('Profile updated successfully');
        } else {
          toast.error(result.message || 'Update failed');
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (type: string) => {
    if (type === 'schedule') {
      if (!newItem.value.trim() || !newItem.time.trim()) {
        toast.error('Please enter both time and title');
        return;
      }
      setDetails({
        ...details,
        schedule: [...(details.schedule || []), { time: newItem.time.trim(), title: newItem.value.trim() }]
      });
    } else {
      const t = type as 'amenities' | 'activities' | 'highlights' | 'policies';
      if (!newItem.value.trim()) return;
      setDetails({
        ...details,
        [t]: [...(details[t] || []), newItem.value.trim()]
      });
    }
    setNewItem({ type: '', value: '', time: '' });
  };

  const removeItem = (type: string, index: number) => {
    if (type === 'schedule') {
      const newList = [...(details.schedule || [])];
      newList.splice(index, 1);
      setDetails({ ...details, schedule: newList });
    } else {
      const t = type as 'amenities' | 'activities' | 'highlights' | 'policies';
      const newList = [...details[t]];
      newList.splice(index, 1);
      setDetails({ ...details, [t]: newList });
    }
  };

  const TagList = ({ type, items }: { type: 'amenities' | 'activities' | 'highlights' | 'policies', items: string[] }) => (
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
              enterKeyHint="done"
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
            <h3 className="font-bold text-xl text-[#D4AF37]">{ownerData?.propertyName || ownerData?.property_name || 'Property Name'}</h3>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">{ownerData?.ownerName || ownerData?.owner_name || 'Owner'} • {ownerData?.ownerNumber || ownerData?.mobile_number || 'Contact'}</p>
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
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Highlights</Label>
          <TagList type="highlights" items={details.highlights} />
        </div>

        {/* Schedule Section */}
        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Check-in/Check-out Schedule
          </Label>
          <div className="space-y-3">
            {(details.schedule || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-black/40 border border-[#D4AF37]/20 p-3 rounded-xl group">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  <div>
                    <p className="text-[10px] font-bold text-[#D4AF37] uppercase">{item.time}</p>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeItem('schedule', idx)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <div className="p-4 border border-dashed border-[#D4AF37]/30 rounded-xl space-y-3 bg-[#1A1A1A]/50">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add New Event</p>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  placeholder="Time (e.g. 04:00 PM)"
                  className="h-10 bg-black/60 border-[#D4AF37]/20 text-white text-xs"
                  value={newItem.type === 'schedule' ? newItem.time : ''}
                  onChange={e => setNewItem({ ...newItem, type: 'schedule', time: e.target.value })}
                />
                <Input 
                  placeholder="Title (e.g. Snacks)"
                  className="h-10 bg-black/60 border-[#D4AF37]/20 text-white text-xs"
                  value={newItem.type === 'schedule' ? newItem.value : ''}
                  onChange={e => setNewItem({ ...newItem, type: 'schedule', value: e.target.value })}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                onClick={() => addItem('schedule')}
              >
                <Plus className="w-3 h-3 mr-2" /> Add to Schedule
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Policies</Label>
          <TagList type="policies" items={details.policies} />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Description</Label>
          <Textarea 
            className="bg-[#1A1A1A] border-[#D4AF37]/20 text-gray-200 focus:border-[#D4AF37] min-h-[100px]"
            value={details.description} 
            onChange={e => setDetails({...details, description: e.target.value})}
            placeholder="Property description..."
          />
        </div>
        
        <Button onClick={handleSave} disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 shadow-xl">
          {loading ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
};

export default OwnerProfile;
