import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {!showOTP ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <h2 className="text-xl font-bold text-center">Owner Login</h2>
              <Input 
                type="tel" 
                placeholder="Mobile Number" 
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                required
              />
              <Button type="submit" className="w-full bg-blue-600">Send OTP</Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 text-center">
              <h2 className="text-xl font-bold">Verify OTP</h2>
              <Input 
                type="text" 
                maxLength={6} 
                className="text-center text-2xl tracking-widest h-14" 
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="000000"
              />
              <Button type="submit" className="w-full bg-blue-600">Verify & Login</Button>
              <Button variant="ghost" onClick={() => setShowOTP(false)}>Change Number</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerLogin;
