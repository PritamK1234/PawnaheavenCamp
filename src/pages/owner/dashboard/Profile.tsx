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

import { CalendarSync } from "@/components/CalendarSync";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  const handleLogout = () => {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerData');
    toast.success('Logged out successfully');
    navigate('/owner/login');
  };

  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;

  useEffect(() => {
    const fetchProfile = async () => {
      const ownerDataString = localStorage.getItem('ownerData');
      if (!ownerDataString) return;
      const ownerDataObj = JSON.parse(ownerDataString);
      
      const propId = ownerDataObj.property_id || ownerDataObj.propertyId || ownerDataObj.id;
      if (!propId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/owners/my-property/${propId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const prop = result.data;
          
          const parseData = (data: any) => {
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (typeof data === 'string') {
              let trimmed = data.trim();
              if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                trimmed = trimmed.substring(1, trimmed.length - 1).replace(/""/g, '"').replace(/\\"/g, '"');
              }
              if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                return trimmed.substring(1, trimmed.length - 1)
                  .split(',')
                  .map((s: string) => s.trim().replace(/^"(.*)"$/, '$1'))
                  .filter(Boolean);
              }
              try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed;
                return parsed ? [parsed] : [];
              } catch (e) {
                if (trimmed.includes(',')) {
                  return trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
                return trimmed ? [trimmed] : [];
              }
            }
            return [];
          };

          setDetails({
            amenities: parseData(prop.amenities),
            activities: parseData(prop.activities),
            highlights: parseData(prop.highlights),
            policies: parseData(prop.policies),
            schedule: parseData(prop.schedule).map((item: any) => {
              if (typeof item === 'string') {
                const trimmedItem = item.trim();
                if (trimmedItem.startsWith('{') && trimmedItem.endsWith('}')) {
                  try {
                    const cleaned = trimmedItem.replace(/\\"/g, '"');
                    const parsed = JSON.parse(cleaned);
                    return { time: parsed.time || '', title: parsed.title || parsed.event || '' };
                  } catch (e) {
                    return { time: '', title: trimmedItem };
                  }
                }
                try {
                  const parsedItem = JSON.parse(trimmedItem);
                  return typeof parsedItem === 'object' ? parsedItem : { time: '', title: parsedItem };
                } catch (e) {
                  return { time: '', title: trimmedItem };
                }
              }
              if (item && typeof item === 'object') {
                return {
                  time: item.time || '',
                  title: item.title || item.event || ''
                };
              }
              return { time: '', title: String(item) };
            }),
            description: prop.description || ''
          });

          localStorage.setItem('linkedProperty', JSON.stringify(prop));
        }
      } catch (error) {
        console.error('Fetch profile error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const propId = ownerData?.property_id || ownerData?.propertyId;
      const token = localStorage.getItem('ownerToken');
      if (propId) {
        const response = await fetch(`/api/properties/update/${propId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(details)
        });
        const result = await response.json();
        if (result.success) {
          toast.success('Profile updated successfully');
          // Trigger reload in other tabs
          localStorage.setItem('propertyUpdated', Date.now().toString());
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
              onChange={e => setNewItem({ ...newItem, value: e.target.value, time: newItem.time })}
              onKeyDown={e => e.key === 'Enter' && addItem(type)}
              onBlur={() => newItem.value ? addItem(type) : setNewItem({ type: '', value: '', time: '' })}
            />
          </div>
        ) : (
          <button 
            onClick={() => setNewItem({ type, value: '', time: '' })}
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                  <LogOut className="w-4 h-4 mr-1" /> Logout
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] bg-black border-[#D4AF37]/20 rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-[#D4AF37] font-display text-xl">Confirm Logout</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Are you sure you want to log out of your dashboard?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 mt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  onClick={() => {}}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Highlights (What You'll Love)</Label>
          <TagList type="highlights" items={details.highlights} />
        </div>

        {/* Schedule Section */}
        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Property Schedule
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
          <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Rules & Policies</Label>
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
