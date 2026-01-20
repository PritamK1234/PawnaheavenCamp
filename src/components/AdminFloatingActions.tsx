import React from 'react';
import { Bell, CreditCard } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const AdminFloatingActions = () => {
  return (
    <div className="flex flex-col gap-4">
      {/* Transaction Icon */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-charcoal border-white/10 shadow-gold transition-all hover:scale-110 active:scale-95 text-gold"
          >
            <CreditCard className="w-5 h-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 bg-charcoal/95 border-white/10 text-white rounded-2xl backdrop-blur-xl">
          <div className="p-4">
            <h3 className="font-bold text-lg mb-2 text-gold">Recent Transactions</h3>
            <p className="text-sm text-white/50">No recent transactions to display.</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Notification Icon */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-charcoal border-white/10 shadow-gold transition-all hover:scale-110 active:scale-95 text-gold relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 bg-charcoal/95 border-white/10 text-white rounded-2xl backdrop-blur-xl">
          <div className="p-4">
            <h3 className="font-bold text-lg mb-2 text-gold">Notifications</h3>
            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-sm font-medium">System Alert</p>
                <p className="text-xs text-white/50">Server is running smoothly.</p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AdminFloatingActions;
