import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Building2,
  Save,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  Star,
  MapPin,
  IndianRupee,
  Users,
  Clock,
  Phone,
  Upload,
  ImageIcon,
  Calendar
} from 'lucide-react';
import { propertyAPI } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminPropertyFormProps {
  property?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

import { CalendarSync } from "@/components/CalendarSync";

const UnitManager = ({ propertyId, category, units, onRefresh }: { propertyId: string, category: string, units: any[], onRefresh: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [unitForm, setUnitForm] = useState({ 
    name: '', 
    available_persons: '0',
    total_persons: '0',
    price_per_person: '0',
    weekday_price: '0',
    weekend_price: '0',
    special_price: '0',
    amenities: [''],
    images: [] as string[],
    special_dates: [] as { date: string, price: string }[]
  });
  const { toast } = useToast();

  const handleSaveUnit = async () => {
    try {
      const payload = {
        ...unitForm,
        price_per_person: parseFloat(unitForm.price_per_person),
        weekday_price: parseFloat(unitForm.weekday_price),
        weekend_price: parseFloat(unitForm.weekend_price),
        special_price: parseFloat(unitForm.special_price),
        available_persons: parseInt(unitForm.available_persons),
        total_persons: parseInt(unitForm.total_persons),
        amenities: unitForm.amenities.filter(a => a.trim()),
        images: unitForm.images.filter(i => i.trim()),
        special_dates: unitForm.special_dates
      };

      const res = editingUnit 
        ? await propertyAPI.updateUnit(editingUnit.id, payload)
        : await propertyAPI.createUnit(propertyId, payload);
      
      if (res.success) {
        toast({ title: editingUnit ? 'Unit updated' : 'Unit created' });
        setIsAdding(false);
        setEditingUnit(null);
        setUnitForm({ 
          name: '', 
          available_persons: '0',
          total_persons: '0',
          price_per_person: '0',
          weekday_price: '0',
          weekend_price: '0',
          special_price: '0',
          amenities: [''],
          images: [] as string[],
          special_dates: [] as { date: string, price: string }[]
        });
        onRefresh();
      }
    } catch (e) {
      toast({ title: 'Error saving unit', variant: 'destructive' });
    }
  };

  const handleUnitImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await fetch('/api/properties/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload,
      });

      const result = await response.json();
      if (result.success) {
        setUnitForm(prev => ({ ...prev, images: [...prev.images, result.url] }));
        toast({ title: 'Image uploaded' });
      }
    } catch (error) {
      toast({ title: 'Upload error', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const parseJson = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return [val]; }
    }
    return [];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground font-display italic">Stay Options (Units)</h3>
        <Button 
          type="button"
          size="sm" 
          onClick={() => setIsAdding(true)} 
          className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-8"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Unit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {units.map((unit) => (
          <div key={unit.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                {parseJson(unit.images)?.[0] ? (
                    <img 
                      src={parseJson(unit.images)[0]} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fit=crop&q=80&w=400';
                      }}
                    />
                ) : <ImageIcon className="w-full h-full p-3 text-white/20" />}
              </div>
              <div>
                <p className="font-bold text-white">{unit.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-[#00FF41]">{unit.available_persons}</span> / <span className="text-[#FFA500]">{unit.total_persons}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] border-gold/30 text-gold hover:bg-gold/10">
                    <Calendar className="w-3 h-3 mr-1" /> Calendar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] bg-charcoal border-white/10 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-gold font-display">Manage Unit Calendar: {unit.name}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">Select dates to manage availability and pricing for this unit.</DialogDescription>
                  </DialogHeader>
                  <CalendarSync 
                    propertyId={propertyId} 
                    unitId={unit.id} 
                    isAdmin={true} 
                    unitName={unit.name}
                  />
                </DialogContent>
              </Dialog>
              <Button type="button" size="icon" variant="ghost" onClick={() => { 
                setEditingUnit(unit); 
                setUnitForm({ 
                  name: unit.name, 
                  available_persons: (unit.available_persons || 0).toString(),
                  total_persons: (unit.total_persons || 0).toString(),
                  price_per_person: (unit.price_per_person || 0).toString(),
                  weekday_price: (unit.weekday_price || 0).toString(),
                  weekend_price: (unit.weekend_price || 0).toString(),
                  special_price: (unit.special_price || 0).toString(),
                  special_dates: parseJson(unit.special_dates) || [],
                  amenities: parseJson(unit.amenities).length ? parseJson(unit.amenities) : [''],
                  images: parseJson(unit.images)
                }); 
                setIsAdding(true); 
              }} className="h-8 w-8 text-white/40 hover:text-white">
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => propertyAPI.deleteUnit(unit.id).then(onRefresh)} className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isAdding} onOpenChange={(open) => { if(!open) { setIsAdding(false); setEditingUnit(null); } }}>
        <DialogContent className="bg-charcoal border-white/10 rounded-3xl max-h-[90vh] overflow-y-auto sm:max-w-[600px]" aria-describedby="unit-form-desc">
          <DialogHeader>
            <DialogTitle className="text-gold font-display">{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
            <p id="unit-form-desc" className="text-xs text-muted-foreground">Specify the details for this accommodation unit.</p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Unit Name</Label>
                <Input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="e.g. Deluxe Tent" className="bg-white/5 border-white/10" />
              </div>

              <div className="space-y-2">
                <Label>Weekday Price (Base)</Label>
                <Input type="number" value={unitForm.weekday_price} onChange={(e) => setUnitForm({ ...unitForm, weekday_price: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Weekend Price</Label>
                <Input type="number" value={unitForm.weekend_price} onChange={(e) => setUnitForm({ ...unitForm, weekend_price: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>
                  <span className="text-[#00FF41]">Available</span> / <span className="text-[#FFA500]">Total persons capacity</span>
                </Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Available" value={unitForm.available_persons} onChange={(e) => setUnitForm({ ...unitForm, available_persons: e.target.value })} className="bg-white/5 border-white/10 text-[#00FF41] font-bold" />
                  <Input type="number" placeholder="Total" value={unitForm.total_persons} onChange={(e) => setUnitForm({ ...unitForm, total_persons: e.target.value })} className="bg-white/5 border-white/10 text-[#FFA500] font-bold" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-gold">Special Date Prices</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setUnitForm({
                    ...unitForm,
                    special_dates: [...unitForm.special_dates, { date: '', price: '' }]
                  })}
                  className="bg-gold/10 border-gold/20 text-gold hover:bg-gold/20"
                >
                  + Add Date
                </Button>
              </div>
              <div className="space-y-3">
                {unitForm.special_dates.map((sd, idx) => (
                  <div key={idx} className="flex gap-3 items-end bg-white/5 p-3 rounded-xl">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Date</Label>
                      <Input 
                        type="date" 
                        value={sd.date} 
                        onChange={(e) => {
                          const newDates = [...unitForm.special_dates];
                          newDates[idx].date = e.target.value;
                          setUnitForm({ ...unitForm, special_dates: newDates });
                        }}
                        className="bg-charcoal border-white/10"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Price</Label>
                      <Input 
                        type="number" 
                        value={sd.price} 
                        onChange={(e) => {
                          const newDates = [...unitForm.special_dates];
                          newDates[idx].price = e.target.value;
                          setUnitForm({ ...unitForm, special_dates: newDates });
                        }}
                        placeholder="₹ 2999"
                        className="bg-charcoal border-white/10"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const newDates = unitForm.special_dates.filter((_, i) => i !== idx);
                        setUnitForm({ ...unitForm, special_dates: newDates });
                      }}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Unit Level Arrays */}
            {[
              { label: 'Amenities', field: 'amenities' as const },
            ].map(section => (
              <div key={section.field} className="space-y-2">
                <Label>{section.label}</Label>
                <div className="space-y-2">
                  {unitForm[section.field].map((val, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        value={val} 
                        onChange={(e) => {
                          const newArr = [...unitForm[section.field]];
                          newArr[idx] = e.target.value;
                          setUnitForm({ ...unitForm, [section.field]: newArr });
                        }} 
                        className="bg-white/5 border-white/10 h-9" 
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500/50 hover:text-red-500" onClick={() => {
                        const newArr = unitForm[section.field].filter((_, i) => i !== idx);
                        setUnitForm({ ...unitForm, [section.field]: newArr.length ? newArr : [''] });
                      }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => setUnitForm({ ...unitForm, [section.field]: [...unitForm[section.field], ''] })}>
                    <Plus className="w-3 h-3 mr-1" /> Add {section.label}
                  </Button>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Unit Gallery</Label>
                <input type="file" id="unit-img" className="hidden" onChange={handleUnitImageUpload} />
                <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('unit-img')?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />} Upload
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {unitForm.images.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden relative group border border-white/10">
                    <img src={img} className="w-full h-full object-cover" />
                    <button type="button" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => setUnitForm({ ...unitForm, images: unitForm.images.filter((_, i) => i !== idx) })}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button type="button" onClick={handleSaveUnit} className="w-full bg-gradient-gold text-black font-bold h-12 rounded-xl mt-4">
              {editingUnit ? 'Update Unit' : 'Create Unit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminPropertyForm = ({ property, onSuccess, onCancel }: AdminPropertyFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [propertyUnits, setPropertyUnits] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'campings_cottages',
    location: '',
    map_link: '',
    rating: '4.5',
    price: '',
    price_note: 'per person with meal',
    capacity: '4',
    check_in_time: '2:00 PM',
    check_out_time: '11:00 AM',
    status: 'Verified',
    is_top_selling: false,
    is_active: true,
    is_available: true,
    max_capacity: '4',
    contact: '+91 8806092609',
    owner_name: '',
    owner_mobile: '',
    property_id: '',
    availability: [] as string[],
    amenities: [''],
    activities: [''],
    highlights: [''],
    policies: [''],
    schedule: [{ time: '', title: '' }],
    images: [] as string[],
  });
  const { toast } = useToast();

  const fetchUnits = async () => {
    if (!property?.id) return;
    const res = await propertyAPI.getUnits(property.id);
    if (res.success) setPropertyUnits(res.data);
  };

  useEffect(() => {
    if (property) {
      fetchUnits();
    }
  }, [property]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const token = localStorage.getItem('adminToken');
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await fetch('/api/properties/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      const result = await response.json();
      if (result.success) {
        // Add new image to the list
        setFormData(prev => ({ ...prev, images: [...prev.images.filter(img => img.trim()), result.url] }));
        toast({ title: 'Image uploaded successfully' });
      } else {
        toast({ title: 'Upload failed', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Upload error', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || '',
        description: property.description || '',
        category: property.category || 'camping',
        location: property.location || '',
        map_link: property.map_link || '',
        rating: property.rating?.toString() || '4.5',
        price: property.price || '',
        price_note: property.price_note || 'per person with meal',
        capacity: property.capacity?.toString() || '4',
        check_in_time: property.check_in_time || '2:00 PM',
        check_out_time: property.check_out_time || '11:00 AM',
        status: property.status || 'Verified',
        is_top_selling: property.is_top_selling ?? false,
        is_active: property.is_active ?? true,
        is_available: property.is_available ?? true,
        max_capacity: property.max_capacity?.toString() || property.capacity?.toString() || '4',
        contact: property.contact || '+91 8806092609',
        owner_name: property.owner_name || '',
        owner_mobile: property.owner_mobile || '',
        property_id: property.property_id || '',
        availability: property.availability || [],
        amenities: property.amenities?.length ? property.amenities : [''],
        activities: property.activities?.length ? property.activities : [''],
        highlights: property.highlights?.length ? property.highlights : [''],
        policies: property.policies?.length ? property.policies : [''],
        schedule: property.schedule?.length ? property.schedule : [{ time: '', title: '' }],
        images: property.images?.length ? property.images.map((img: any) => typeof img === 'string' ? img : img.image_url) : [],
      });
    } else {
      // Generate a new 5-digit property ID for new property
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let newId = '';
      for (let i = 0; i < 5; i++) {
        newId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setFormData(prev => ({ ...prev, property_id: newId }));
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const token = localStorage.getItem('adminToken');
    const url = property 
      ? `/api/properties/update/${property.id}` 
      : '/api/properties/create';
    const method = property ? 'PUT' : 'POST';

    const payload = {
      ...formData,
      rating: parseFloat(formData.rating) || 4.5,
      capacity: parseInt(formData.capacity) || 4,
      max_capacity: parseInt(formData.max_capacity) || parseInt(formData.capacity) || 4,
      amenities: formData.amenities.filter(a => a.trim()),
      activities: formData.activities.filter(a => a.trim()),
      highlights: formData.highlights.filter(h => h.trim()),
      policies: formData.policies.filter(p => p.trim()),
      schedule: formData.schedule.filter(s => s.time.trim() || s.title.trim()),
      images: formData.images.filter(i => i.trim()),
    };

    // For campings_cottages, we don't send individual prices as they come from units
    if (formData.category === 'campings_cottages') {
      (payload as any).price = payload.price || 'Price on Selection';
      delete (payload as any).weekday_price;
      delete (payload as any).weekend_price;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: property ? 'Property updated!' : 'Property created!',
          description: 'Your changes have been saved successfully.',
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Something went wrong',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save property',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArrayChange = (field: 'amenities' | 'activities' | 'highlights' | 'policies' | 'images' | 'schedule', index: number, value: any) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: 'amenities' | 'activities' | 'highlights' | 'policies' | 'images' | 'schedule') => {
    const newItem = field === 'schedule' ? { time: '', title: '' } : '';
    setFormData({ ...formData, [field]: [...formData[field], newItem] });
  };

  const removeArrayItem = (field: 'amenities' | 'activities' | 'highlights' | 'policies' | 'images' | 'schedule', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    const defaultValue = field === 'schedule' ? { time: '', title: '' } : '';
    setFormData({ ...formData, [field]: newArray.length ? newArray : [defaultValue] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={onCancel}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-gold-dark flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">
                {property ? 'Edit Property' : 'New Property'}
              </span>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            {property ? 'Edit Property' : 'Add New Property'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8 bg-secondary/20 p-4 rounded-xl border border-border/30">
              <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                <Label htmlFor="status" className="text-sm font-medium shrink-0">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="flex-1 h-10 bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="text-xs sm:text-sm">Active</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                  />
                  <Label htmlFor="is_available" className="text-xs sm:text-sm">Available</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_top_selling"
                    checked={formData.is_top_selling}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_top_selling: checked })}
                  />
                  <Label htmlFor="is_top_selling" className="text-xs sm:text-sm">Top Selling</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="property_id" className="text-muted-foreground">Property ID (Auto-generated)</Label>
                <Input
                  id="property_id"
                  value={formData.property_id || 'Generating...'}
                  disabled
                  className="h-12 bg-secondary/30 rounded-xl border-dashed opacity-70 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Availability Calendar (Syncs with Owner Dashboard)</Label>
                {property && formData.category === 'villa' && (
                  <CalendarSync propertyId={property.property_id || property.id} isAdmin={true} />
                )}
                {property && formData.category === 'campings_cottages' && (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <UnitManager 
                      propertyId={property.id} 
                      category={formData.category}
                      units={propertyUnits} 
                      onRefresh={fetchUnits} 
                    />
                  </div>
                )}
                {!property && <p className="text-sm text-muted-foreground italic">Save the property first to enable calendar/unit management.</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Property Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-12 bg-secondary/50 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="h-12 bg-secondary/50 rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campings_cottages">Campings & Cottages</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="map_link">Google Maps Link *</Label>
                <Input
                  id="map_link"
                  value={formData.map_link}
                  onChange={(e) => setFormData({ ...formData, map_link: e.target.value })}
                  className="h-12 bg-secondary/50 rounded-xl"
                  placeholder="Paste Google Maps URL here"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">{formData.category === 'villa' ? 'Price *' : 'Starting Price (Auto-calculated)'}</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    placeholder={formData.category === 'campings_cottages' ? "Price from units will be used" : ""}
                    disabled={formData.category === 'campings_cottages'}
                    required={formData.category === 'villa'}
                  />
                </div>
                {formData.category === 'campings_cottages' && (
                  <p className="text-[10px] text-primary mt-1 italic">
                    * Minimum price from available units will be displayed automatically.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_note">Price Note *</Label>
                <Input
                  id="price_note"
                  value={formData.price_note}
                  onChange={(e) => setFormData({ ...formData, price_note: e.target.value })}
                  className="h-12 bg-secondary/50 rounded-xl"
                  required
                />
              </div>

              {formData.category === 'villa' ? (
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Max Capacity *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="max_capacity"
                      type="number"
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value, capacity: e.target.value })}
                      className="h-12 pl-10 bg-secondary/50 rounded-xl"
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="rating">Rating (0-5) *</Label>
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="check_in_time">Check-in Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="check_in_time"
                    value={formData.check_in_time}
                    onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="check_out_time">Check-out Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="check_out_time"
                    value={formData.check_out_time}
                    onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_mobile">Owner Mobile Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="owner_mobile"
                    value={formData.owner_mobile}
                    onChange={(e) => setFormData({ ...formData, owner_mobile: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Admin Mobile Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Arrays: Amenities, Activities, Highlights, Policies */}
          {[
            { label: 'Amenities', field: 'amenities' as const, icon: Star, hide: formData.category === 'campings_cottages' },
            { label: 'Activities', field: 'activities' as const, icon: Sparkles },
            { label: 'Highlights (What You\'ll Love)', field: 'highlights' as const, icon: Star },
            { label: 'Rules & Policies', field: 'policies' as const, icon: Clock },
          ].filter(s => !s.hide).map((section) => (
            <div key={section.field} className="glass rounded-2xl border border-border/50 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <section.icon className="w-5 h-5 text-primary" />
                {section.label} *
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData[section.field].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      value={item}
                      onChange={(e) => handleArrayChange(section.field, index, e.target.value)}
                      placeholder={section.label.slice(0, -1)}
                      className="h-12 bg-secondary/50 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem(section.field, index)}
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem(section.field)}
                className="mt-3 h-10 rounded-xl border-dashed hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {section.label.slice(0, -1)}
              </Button>
            </div>
          ))}

          {/* Schedule */}
          <div className="glass rounded-2xl border border-border/50 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Property Schedule
            </h2>
            <div className="space-y-4">
              {formData.schedule.map((item: any, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <Input
                      value={item.time}
                      onChange={(e) => handleArrayChange('schedule', index, { ...item, time: e.target.value })}
                      placeholder="Time (e.g. 4:30 PM)"
                      className="h-12 bg-secondary/50 rounded-xl"
                    />
                    <Input
                      value={item.title}
                      onChange={(e) => handleArrayChange('schedule', index, { ...item, title: e.target.value })}
                      placeholder="Activity (e.g. Tea & Snacks)"
                      className="h-12 bg-secondary/50 rounded-xl"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem('schedule', index)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => addArrayItem('schedule')}
              className="mt-4 h-10 rounded-xl border-dashed hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule Item
            </Button>
          </div>

          {/* Images */}
          {formData.category !== 'campings_cottages' && (
            <div className="glass rounded-2xl border border-border/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Property Images *
                </h2>
                <div className="relative">
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-2"
                    disabled={isUploading}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Image
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {formData.images.filter(img => img.trim()).map((image, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="flex-1 relative">
                      <Input
                        value={image}
                        readOnly
                        className="h-12 bg-secondary/30 rounded-xl pr-12 text-muted-foreground"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden bg-secondary">
                        <img src={image} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newImages = formData.images.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, images: newImages }));
                      }}
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {formData.images.filter(img => img.trim()).length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-2xl bg-secondary/10">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground">No images uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="glass rounded-2xl border border-border/50 p-6">
            <Label htmlFor="description" className="text-lg font-semibold mb-6 block">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[150px] bg-secondary/50 rounded-xl resize-none"
              placeholder="Provide a detailed description of the property..."
              required
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 animate-fade-up">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-12 px-8 rounded-xl"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-gold-dark"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {property ? 'Update Property' : 'Create Property'}
                </>
              ) }
            </Button>
          </div>
        </form>

        {formData.category === 'campings_cottages' && property?.id && (
          <div className="mt-8 glass rounded-2xl border border-border/50 p-6 animate-fade-up">
            <UnitManager 
              propertyId={property.id} 
              category={formData.category}
              units={propertyUnits} 
              onRefresh={async () => { await fetchUnits(); }} 
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPropertyForm;
