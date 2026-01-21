import React, { useState } from 'react';
import { CalendarSync } from "@/components/CalendarSync";

const OwnerCalendar = () => {
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const propertyId = ownerData?.property_id || ownerData?.propertyId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#D4AF37] font-display">Availability Calendar</h1>
      </div>

      <div className="glass rounded-3xl p-6 border border-[#D4AF37]/30">
        <p className="text-xs text-gray-400 mb-4 italic">
          * Click on a date to toggle its booking status. This will update on the website and admin panel instantly.
        </p>
        {propertyId ? (
          <CalendarSync propertyId={propertyId} isAdmin={true} />
        ) : (
          <div className="text-center p-8 text-gray-500">
            No property linked to this account.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 p-4 rounded-2xl flex items-center space-x-3">
          <div className="w-3 h-3 bg-[#00FF00] rounded-full shadow-[0_0_10px_#00FF00]" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Available</span>
        </div>
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 p-4 rounded-2xl flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Booked / Blocked</span>
        </div>
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 p-4 rounded-2xl flex items-center space-x-3">
          <div className="w-3 h-3 bg-[#D4AF37] rounded-full shadow-[0_0_10px_#D4AF37]" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Today</span>
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendar;
