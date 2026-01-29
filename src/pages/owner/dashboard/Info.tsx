import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { propertyAPI } from "@/lib/api";

const OwnerPropertyInfo = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [formData, setFormData] = useState({
    activities: '',
    highlights: '',
    policies: '',
    images: [] as string[]
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
        setFormData({
          activities: Array.isArray(result.data.activities) ? result.data.activities.join(', ') : (result.data.activities || ''),
          highlights: Array.isArray(result.data.highlights) ? result.data.highlights.join(', ') : (result.data.highlights || ''),
          policies: Array.isArray(result.data.policies) ? result.data.policies.join('\n') : (result.data.policies || ''),
          images: Array.isArray(result.data.images) ? result.data.images.map((img: any) => img.image_url) : []
        });
      }
    } catch (error) {
      console.error('Error fetching property info:', error);
      toast.error('Failed to load property information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        activities: formData.activities.split(',').map(s => s.trim()).filter(Boolean),
        highlights: formData.highlights.split(',').map(s => s.trim()).filter(Boolean),
        policies: formData.policies.split('\n').map(s => s.trim()).filter(Boolean),
        images: formData.images // Note: In a real app, this would handle actual image uploads
      };

      const result = await propertyAPI.update(property.id, payload);
      if (result.success) {
        toast.success('Property information updated successfully');
      } else {
        toast.error('Failed to update property information');
      }
    } catch (error) {
      console.error('Error saving property info:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setFormData({ ...formData, images: [...formData.images, url] });
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  if (loading) return <div className="p-8 text-center text-[#D4AF37]">Loading property info...</div>;

  if (property?.category !== 'campings_cottages') {
    return (
      <div className="p-8 text-center text-gray-400">
        This section is only available for camping and cottage properties.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full sm:max-w-4xl mx-auto px-0 sm:px-4 pb-12">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <h1 className="text-2xl font-bold text-[#D4AF37] font-display">Property Details</h1>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 px-4 sm:px-0">
        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl overflow-hidden">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[#D4AF37] text-xs uppercase font-bold tracking-widest">Activities (comma separated)</Label>
              <Textarea 
                value={formData.activities}
                onChange={(e) => setFormData({...formData, activities: e.target.value})}
                placeholder="Trekking, Boating, Campfire..."
                className="bg-black/60 border-[#D4AF37]/20 text-white min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#D4AF37] text-xs uppercase font-bold tracking-widest">What you'll love / Highlights (comma separated)</Label>
              <Textarea 
                value={formData.highlights}
                onChange={(e) => setFormData({...formData, highlights: e.target.value})}
                placeholder="Lake view, Peaceful atmosphere..."
                className="bg-black/60 border-[#D4AF37]/20 text-white min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#D4AF37] text-xs uppercase font-bold tracking-widest">Privacy Policy / Rules (one per line)</Label>
              <Textarea 
                value={formData.policies}
                onChange={(e) => setFormData({...formData, policies: e.target.value})}
                placeholder="No loud music after 10 PM&#10;Carry valid ID proof..."
                className="bg-black/60 border-[#D4AF37]/20 text-white min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-[#D4AF37]/30 bg-black/40 rounded-xl overflow-hidden">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[#D4AF37] text-xs uppercase font-bold tracking-widest">Property Gallery</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addImage}
                className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Image URL
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formData.images.map((url, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group">
                  <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeImage(index)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
              {formData.images.length === 0 && (
                <div className="col-span-full py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                  <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs italic">No images added to gallery</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerPropertyInfo;
