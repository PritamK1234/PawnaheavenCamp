import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard, LogIn } from 'lucide-react';

const OwnerEntry = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Owner Portal</h1>
      
      <Button 
        onClick={() => navigate('/owner/register')}
        className="w-full h-24 text-xl flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700"
      >
        <LayoutDashboard className="w-8 h-8" />
        <span>Register Property</span>
      </Button>

      <Button 
        onClick={() => navigate('/owner/login')}
        variant="outline"
        className="w-full h-24 text-xl flex flex-col items-center justify-center space-y-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
      >
        <LogIn className="w-8 h-8" />
        <span>Login</span>
      </Button>
    </div>
  );
};

export default OwnerEntry;
