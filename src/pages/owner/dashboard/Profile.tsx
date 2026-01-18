import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const OwnerProfile = () => {
  const navigate = useNavigate();
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : { propertyName: 'My Property', ownerName: 'Owner', ownerNumber: '9999999999' };

  const [details, setDetails] = useState({
    amenities: 'Lake View, Private Washroom, BBQ Facility',
    activities: 'Boating, Swimming, Bonfire',
    policy: 'No Smoking in tents. Check-in: 4 PM.'
  });

  const handleLogout = () => {
    localStorage.removeItem('ownerLoggedIn');
    navigate('/owner');
  };

  const handleSave = () => {
    localStorage.setItem('ownerProfileDetails', JSON.stringify(details));
    toast.success('Profile details saved');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Profile</h2>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500">
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </div>

      <Card className="bg-blue-600 text-white">
        <CardContent className="pt-6 flex items-center space-x-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold">{ownerData.propertyName}</h3>
            <p className="text-xs opacity-80">{ownerData.ownerName} • {ownerData.ownerNumber}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Amenities</Label>
          <Textarea 
            value={details.amenities} 
            onChange={e => setDetails({...details, amenities: e.target.value})}
            placeholder="List your amenities..."
          />
        </div>
        <div className="space-y-2">
          <Label>Activities</Label>
          <Textarea 
            value={details.activities} 
            onChange={e => setDetails({...details, activities: e.target.value})}
            placeholder="List available activities..."
          />
        </div>
        <div className="space-y-2">
          <Label>Policy</Label>
          <Textarea 
            value={details.policy} 
            onChange={e => setDetails({...details, policy: e.target.value})}
            placeholder="Property policies..."
          />
        </div>
        <Button onClick={handleSave} className="w-full bg-blue-600">Save Profile</Button>
      </div>
    </div>
  );
};

export default OwnerProfile;
