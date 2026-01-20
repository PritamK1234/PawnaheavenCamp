import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard, LogIn } from 'lucide-react';

const OwnerEntry = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-bold text-[#D4AF37] tracking-tight">PawnaHavenCamp</h1>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-medium">Owner Elite Portal</p>
      </div>
      
      <Button 
        onClick={() => navigate('/owner/register')}
        className="w-full h-24 text-lg flex flex-col items-center justify-center space-y-2 bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
      >
        <LayoutDashboard className="w-8 h-8" />
        <span className="uppercase tracking-widest">Register Property</span>
      </Button>

      <Button 
        onClick={() => navigate('/owner/login')}
        variant="outline"
        className="w-full h-24 text-lg flex flex-col items-center justify-center space-y-2 border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 bg-transparent font-bold"
      >
        <LogIn className="w-8 h-8" />
        <span className="uppercase tracking-widest">Login to Dashboard</span>
      </Button>
      
      <p className="text-[10px] text-gray-600 uppercase tracking-widest pt-8">Powered by PawnaHavenCamp Luxury Stay</p>
    </div>
  );
};

export default OwnerEntry;
