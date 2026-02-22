import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const OwnerProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("ownerToken");
    localStorage.removeItem("ownerData");
    toast.success("Logged out successfully");
    navigate("/owner/login");
  };

  const ownerDataString = localStorage.getItem("ownerData");
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;

  useEffect(() => {
    const fetchProfile = async () => {
      const ownerDataString = localStorage.getItem("ownerData");
      if (!ownerDataString) return;
      const ownerDataObj = JSON.parse(ownerDataString);

      const propId =
        ownerDataObj.property_id || ownerDataObj.propertyId || ownerDataObj.id;
      if (!propId) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/owners/my-property/${propId}`);
        const result = await response.json();

        if (result.success && result.data) {
          localStorage.setItem("linkedProperty", JSON.stringify(result.data));
        }
      } catch (error) {
        console.error("Fetch profile error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#D4AF37]">Profile</h2>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-black border-[#D4AF37]/20 rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-[#D4AF37] font-display text-xl">
                  Confirm Logout
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to log out of your dashboard?
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  onClick={() => {}}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-[#1A1A1A] to-black border-[#D4AF37]/30 text-white shadow-2xl">
        <CardContent className="pt-6 flex items-center space-x-4">
          <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <User className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-[#D4AF37]">
              {ownerData?.propertyName ||
                ownerData?.property_name ||
                "Property Name"}
            </h3>
            <p className="text-xs text-gray-400 font-medium Capatalize tracking-widest">
              {ownerData?.ownerName || ownerData?.owner_name || "Owner"} •{" "}
              {ownerData?.ownerNumber || ownerData?.owner_otp_number || "Contact"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-[#1A1A1A]/50 border border-[#D4AF37]/20 rounded-xl">
        <p className="text-sm text-gray-400">
          Amenities, Activities, Highlights, Schedule, Policies, and Description are now managed at the unit level. Go to the <span className="text-[#D4AF37] font-bold">Units</span> tab to edit these details for each villa unit.
        </p>
      </div>
    </div>
  );
};

export default OwnerProfile;
