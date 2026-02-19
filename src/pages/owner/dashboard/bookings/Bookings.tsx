import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronDown,
  User,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// Mock data based on the "ledger form" style info
const MOCK_BOOKINGS = [
  {
    id: 1,
    guestName: 'Rohit pawar',
    checkIn: '19 Feb',
    checkOut: '20 Feb',
    guests: '4',
    amount: '2900',
    paymentType: 'online'
  },
  {
    id: 2,
    guestName: 'Aniket Shinde',
    checkIn: '21 Feb',
    checkOut: '23 Feb',
    guests: '2',
    amount: '4500',
    paymentType: 'cash'
  }
];

const Bookings = () => {
  const [year, setYear] = useState('2024');
  const [month, setMonth] = useState('Feb');
  const [unit, setUnit] = useState('all');

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-32">
      {/* Sticky Filters Header */}
      <div className="sticky top-0 z-50 bg-[#1A1A1A] border-b border-[#D4AF37]/20 px-4 py-4 shadow-xl">
        <div className="grid grid-cols-3 gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-10 bg-black/40 border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold focus:ring-1 focus:ring-[#D4AF37]/50 rounded-xl">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white">
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-10 bg-black/40 border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold focus:ring-1 focus:ring-[#D4AF37]/50 rounded-xl">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="h-10 bg-black/40 border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold focus:ring-1 focus:ring-[#D4AF37]/50 rounded-xl">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white">
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="dome">Domes</SelectItem>
              <SelectItem value="cottage">Cottages</SelectItem>
              <SelectItem value="villa">Villas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 py-4">
        <h2 className="text-[10px] font-bold text-gray-500 mb-4 tracking-widest uppercase">Bookings List</h2>
        
        {/* Booking List - Matching the attached screenshot style */}
        <div className="space-y-3">
          {MOCK_BOOKINGS.map((booking) => (
            <Card key={booking.id} className="bg-[#1A1A1A] border border-[#D4AF37]/10 rounded-2xl overflow-hidden shadow-xl">
              <CardContent className="p-3 flex items-center gap-3">
                {/* ID Badge */}
                <div className="w-10 h-10 bg-[#261F18] rounded-xl flex items-center justify-center shrink-0 border border-[#D4AF37]/10">
                  <span className="text-[#D4AF37] text-sm font-bold">#{booking.id}</span>
                </div>

                {/* Main Info */}
                <div className="flex-grow min-w-0">
                  <h3 className="text-sm font-bold text-white mb-0.5 leading-tight truncate">{booking.guestName}</h3>
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="text-[10px]">{booking.guests}</span>
                    </div>
                    <div className="flex items-center gap-1 border border-gray-800 rounded px-1 py-0.25">
                      <span className="text-[8px] uppercase font-bold tracking-tighter">{booking.paymentType}</span>
                    </div>
                  </div>
                </div>

                {/* Price & Dates */}
                <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-base font-bold text-[#D4AF37]">₹{booking.amount}</span>
                  <span className="text-[9px] font-medium text-gray-500">{booking.checkIn} - {booking.checkOut}</span>
                </div>

                {/* Actions Divider & Buttons */}
                <div className="flex items-center gap-2 border-l border-gray-800 pl-3 py-1 shrink-0">
                  <button className="text-gray-500 hover:text-white transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="text-gray-500 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Floating Action Buttons - Excel and PDF */}
      <div className="fixed bottom-24 left-0 right-0 px-4 flex gap-3 z-50 pointer-events-none">
        <button className="flex-1 bg-[#1A1A1A] border border-[#D4AF37]/20 h-14 rounded-2xl flex items-center justify-center gap-3 shadow-2xl opacity-80 cursor-not-allowed">
          <FileSpreadsheet className="w-6 h-6 text-green-500" />
          <span className="font-bold text-white uppercase tracking-widest text-sm">Excel</span>
        </button>
        <button className="flex-1 bg-[#1A1A1A] border border-[#D4AF37]/20 h-14 rounded-2xl flex items-center justify-center gap-3 shadow-2xl opacity-80 cursor-not-allowed">
          <FileText className="w-6 h-6 text-red-500" />
          <span className="font-bold text-white uppercase tracking-widest text-sm">PDF</span>
        </button>
      </div>
    </div>
  );
};

export default Bookings;
