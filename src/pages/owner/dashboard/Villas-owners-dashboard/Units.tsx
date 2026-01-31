import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, Plus, Trash2, Upload, ImageIcon, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { propertyAPI } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const OwnerUnits = () => {
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
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
          }
        }
      }
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (unit: any) => {
    const amenities = typeof unit.amenities === 'string' 
      ? JSON.parse(unit.amenities) 
      : (Array.isArray(unit.amenities) ? unit.amenities : []);
    
    const images = typeof unit.images === 'string' 
      ? JSON.parse(unit.images) 
      : (Array.isArray(unit.images) ? unit.images : []);

    const specialDates = typeof unit.special_dates === 'string'
      ? JSON.parse(unit.special_dates)
      : (Array.isArray(unit.special_dates) ? unit.special_dates : []);

    setEditingUnit(unit);
    setUnitForm({
      name: unit.name || '',
      available_persons: (unit.available_persons || 0).toString(),
      total_persons: (unit.total_persons || 0).toString(),
      price_per_person: (unit.price_per_person || 0).toString(),
      weekday_price: (unit.weekday_price || 0).toString(),
      weekend_price: (unit.weekend_price || 0).toString(),
      special_price: (unit.special_price || 0).toString(),
      special_dates: specialDates,
      amenities: amenities.length ? amenities : [''],
      images: images
    });
    setIsAdding(true);
  };

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

      const res = await propertyAPI.updateUnit(editingUnit.id, payload);
      
      if (res.success) {
        toast.success('Unit updated successfully');
        setIsAdding(false);
        setEditingUnit(null);
        fetchData();
      } else {
        toast.error('Failed to update unit');
      }
    } catch (e) {
      toast.error('Error saving unit');
    }
  };

  const handleUnitImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const token = localStorage.getItem('ownerToken') || localStorage.getItem('adminToken');
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
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Upload error');
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

  if (loading) return <div className="p-8 text-center text-[#D4AF37]">Loading units...</div>;

  return (
    <div className="p-8 text-center text-gray-400">
      This section is handled within the Main tab for villas.
    </div>
  );
};

export default OwnerUnits;
