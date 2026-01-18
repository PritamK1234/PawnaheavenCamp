import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const OwnerRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyId: '',
    propertyType: '',
    ownerName: '',
    ownerNumber: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('tempOwnerData', JSON.stringify(formData));
    navigate('/owner/register/otp');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Register Property</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input required value={formData.propertyName} onChange={e => setFormData({...formData, propertyName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Property ID</Label>
              <Input required value={formData.propertyId} onChange={e => setFormData({...formData, propertyId: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select onValueChange={val => setFormData({...formData, propertyType: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Cottage">Cottage</SelectItem>
                  <SelectItem value="Camping">Camping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Owner Mobile Number</Label>
              <Input required type="tel" value={formData.ownerNumber} onChange={e => setFormData({...formData, ownerNumber: e.target.value})} />
            </div>
            <Button type="submit" className="w-full bg-blue-600">Verify Mobile Number</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerRegister;
