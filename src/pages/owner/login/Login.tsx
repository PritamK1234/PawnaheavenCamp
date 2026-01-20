import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Shield } from 'lucide-react';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length >= 10) {
      setShowOTP(true);
      toast.success('OTP sent: 000000');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '000000') {
      localStorage.setItem('ownerLoggedIn', 'true');
      navigate('/owner/dashboard');
    } else {
      toast.error('Invalid OTP (Demo: 000000)');
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

      <div className="w-full max-w-md relative z-10">
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
            Owner Login
            <Sparkles className="w-4 h-4 text-primary" />
          </p>
        </div>

        <div className="glass rounded-3xl p-8 border border-border/50 shadow-card">
          {!showOTP ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Enter your mobile number to receive an OTP</p>
              </div>
              <Input 
                type="tel" 
                placeholder="Mobile Number" 
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                required
              />
              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-gold-dark hover:from-gold-dark hover:to-primary transition-all duration-500 shadow-gold hover:shadow-gold-lg transform hover:-translate-y-0.5">
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 text-center">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">Verify OTP</h2>
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to your mobile</p>
              </div>
              <Input 
                type="text" 
                maxLength={6} 
                className="text-center text-2xl tracking-widest h-14 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20" 
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="000000"
              />
              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-gold-dark hover:from-gold-dark hover:to-primary transition-all duration-500 shadow-gold hover:shadow-gold-lg transform hover:-translate-y-0.5">
                Verify & Login
              </Button>
              <Button variant="ghost" onClick={() => setShowOTP(false)} className="text-muted-foreground hover:text-primary">Change Number</Button>
            </form>
          )}
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

export default OwnerLogin;
