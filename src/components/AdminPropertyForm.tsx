import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Building2,
  Save,
  Loader2,
  ImagePlus,
  X,
  MapPin,
  IndianRupee,
  Users,
  Bed,
  Bath,
  Plus,
  Trash2,
  Sparkles,
  Star,
  Upload,
  GripVertical
} from 'lucide-react';

interface AdminPropertyFormProps {
  property?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const AdminPropertyForm = ({ property, onSuccess, onCancel }: AdminPropertyFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    location: '',
    description: '',
    short_description: '',
    price: '',
    max_guests: '',
    bedrooms: '',
    bathrooms: '',
    amenities: [''],
    highlights: [''],
    images: [''],
    is_active: true,
    is_featured: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || '',
        slug: property.slug || '',
        location: property.location || '',
        description: property.description || '',
        short_description: property.short_description || '',
        price: property.price?.toString() || '',
        max_guests: property.max_guests?.toString() || '',
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        amenities: property.amenities?.length ? property.amenities : [''],
        highlights: property.highlights?.length ? property.highlights : [''],
        images: property.images?.length ? property.images : [''],
        is_active: property.is_active ?? true,
        is_featured: property.is_featured ?? false,
      });
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const token = localStorage.getItem('adminToken');
    const url = property 
      ? `/api/properties/${property.id}` 
      : '/api/properties';
    const method = property ? 'PUT' : 'POST';

    const payload = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      max_guests: parseInt(formData.max_guests) || 1,
      bedrooms: parseInt(formData.bedrooms) || 1,
      bathrooms: parseInt(formData.bathrooms) || 1,
      amenities: formData.amenities.filter(a => a.trim()),
      highlights: formData.highlights.filter(h => h.trim()),
      images: formData.images.filter(i => i.trim()),
    };

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

  const handleArrayChange = (field: 'amenities' | 'highlights' | 'images', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: 'amenities' | 'highlights' | 'images') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field: 'amenities' | 'highlights' | 'images', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length ? newArray : [''] });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
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
        {/* Form Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            {property ? 'Edit Property' : 'Add New Property'}
          </h1>
          <p className="text-muted-foreground">
            {property ? 'Update your property details below' : 'Fill in the details to create a new listing'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up delay-100">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Property Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Luxury Mountain Retreat"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-medium text-foreground">
                  URL Slug *
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="luxury-mountain-retreat"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location *
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Lonavala, Maharashtra"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="short_description" className="text-sm font-medium text-foreground">
                  Short Description
                </Label>
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="A brief tagline for your property"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Full Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your property in detail..."
                  className="min-h-[150px] bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Pricing & Capacity */}
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up delay-200">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-primary" />
              Pricing & Capacity
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-medium text-foreground flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  Price/Night *
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="5000"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_guests" className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Max Guests
                </Label>
                <Input
                  id="max_guests"
                  type="number"
                  value={formData.max_guests}
                  onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                  placeholder="6"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bedrooms" className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Bed className="w-3 h-3" />
                  Bedrooms
                </Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="3"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bathrooms" className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Bath className="w-3 h-3" />
                  Bathrooms
                </Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="2"
                  className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up delay-300">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-primary" />
              Property Images
            </h2>
            
            <div className="space-y-3">
              {formData.images.map((image, index) => (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="w-6 flex justify-center">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      value={image}
                      onChange={(e) => handleArrayChange('images', index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="h-12 bg-secondary/50 border-border/50 rounded-xl pr-12 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    {image && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden bg-secondary">
                        <img src={image} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem('images', index)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('images')}
                className="w-full h-12 rounded-xl border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Image URL
              </Button>
            </div>
          </div>

          {/* Amenities */}
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up delay-400">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Amenities
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formData.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    value={amenity}
                    onChange={(e) => handleArrayChange('amenities', index, e.target.value)}
                    placeholder="e.g. Free WiFi, Swimming Pool"
                    className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem('amenities', index)}
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
              onClick={() => addArrayItem('amenities')}
              className="mt-3 h-10 rounded-xl border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Amenity
            </Button>
          </div>

          {/* Highlights */}
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up delay-500">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Property Highlights
            </h2>
            
            <div className="space-y-3">
              {formData.highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    value={highlight}
                    onChange={(e) => handleArrayChange('highlights', index, e.target.value)}
                    placeholder="e.g. Stunning mountain views"
                    className="h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem('highlights', index)}
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
              onClick={() => addArrayItem('highlights')}
              className="mt-3 h-10 rounded-xl border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Highlight
            </Button>
          </div>

          {/* Status Toggles */}
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up delay-600">
            <h2 className="text-lg font-semibold text-foreground mb-6">Publication Status</h2>
            
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border/30">
                <div>
                  <p className="font-medium text-foreground">Active Listing</p>
                  <p className="text-sm text-muted-foreground">Show on website</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border/30">
                <div>
                  <p className="font-medium text-foreground">Featured Property</p>
                  <p className="text-sm text-muted-foreground">Highlight on homepage</p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 animate-fade-up delay-700">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-12 px-8 rounded-xl border-border/50 hover:border-primary/50"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-gold-dark hover:from-gold-dark hover:to-primary transition-all duration-500 shadow-gold hover:shadow-gold-lg"
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
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AdminPropertyForm;
