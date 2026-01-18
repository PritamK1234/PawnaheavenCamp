import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const OwnerRegisterOTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [success, setSuccess] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '000000') {
      const tempData = JSON.parse(localStorage.getItem('tempOwnerData') || '{}');
      localStorage.setItem('ownerData', JSON.stringify(tempData));
      localStorage.removeItem('tempOwnerData');
      setSuccess(true);
      toast.success('Registration Successful');
      
      setTimeout(() => {
        navigate('/owner');
      }, 2000);
    } else {
      toast.error('Invalid OTP (Demo: 000000)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {success ? (
            <div className="flex flex-col items-center space-y-4 py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
              <h2 className="text-2xl font-bold text-green-600">Registration Successful</h2>
              <p className="text-gray-500">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4 text-center">
              <h2 className="text-xl font-bold">Enter OTP</h2>
              <p className="text-sm text-gray-500">We've sent a 6-digit code to your number</p>
              <Input 
                type="text" 
                maxLength={6} 
                className="text-center text-2xl tracking-widest h-14" 
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="000000"
              />
              <Button type="submit" className="w-full bg-blue-600 h-12">Verify OTP</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerRegisterOTP;
