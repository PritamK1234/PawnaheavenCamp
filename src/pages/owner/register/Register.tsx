import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const OwnerRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyId: '',
    propertyType: '',
    ownerName: '',
    ownerNumber: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/owners/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyName: formData.propertyName,
          propertyId: formData.propertyId,
          propertyType: formData.propertyType,
          ownerName: formData.ownerName,
          ownerMobile: formData.ownerNumber
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Registration successful!');
        // In a real app, we might redirect to OTP or Login
        // For now, let's store data and move to the next logical step
        localStorage.setItem('tempOwnerData', JSON.stringify(data.data));
        navigate('/owner/login'); 
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float delay-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(193,155,74,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(193,155,74,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="w-full max-w-md relative z-10 py-8">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-gold-dark mb-6 shadow-gold-lg animate-pulse-glow mx-auto">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-foreground mb-2">
            PawnaHavenCamp
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Property Registration
            <Sparkles className="w-4 h-4 text-primary" />
          </p>
        </div>

        <div className="glass rounded-3xl p-8 border border-border/50 shadow-card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-1">List Your Property</h2>
            <p className="text-sm text-muted-foreground">Fill in the details to start your journey with us</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Property Name</Label>
              <Input 
                required 
                value={formData.propertyName} 
                onChange={e => setFormData({...formData, propertyName: e.target.value})}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                placeholder="e.g. Pawna Lakeview Resort"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Property ID</Label>
              <Input 
                required 
                value={formData.propertyId} 
                onChange={e => setFormData({...formData, propertyId: e.target.value})}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                placeholder="Your unique property ID"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Property Type</Label>
              <Select onValueChange={val => setFormData({...formData, propertyType: val})}>
                <SelectTrigger className="h-12 bg-secondary/50 border-border/50 rounded-xl px-4 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border/50">
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="campings_cottages">Campings & Cottages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Owner Name</Label>
              <Input 
                required 
                value={formData.ownerName} 
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                placeholder="Full name of the owner"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Owner Mobile Number</Label>
              <Input 
                required 
                type="tel" 
                value={formData.ownerNumber} 
                onChange={e => setFormData({...formData, ownerNumber: e.target.value})}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                placeholder="10-digit mobile number"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-gold-dark hover:from-gold-dark hover:to-primary transition-all duration-500 shadow-gold hover:shadow-gold-lg transform hover:-translate-y-0.5 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Property'
              )}
            </Button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] tracking-[0.2em] font-bold text-muted-foreground/40 uppercase">
            Powered by PawnaHavenCamp Luxury Stay
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegister;
