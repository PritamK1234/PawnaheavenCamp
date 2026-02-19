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

      <div className="px-4 py-6">
        <h2 className="text-xl font-bold text-gray-400 mb-6 tracking-widest uppercase text-xs">Bookings List</h2>
        
        {/* Booking List - Matching the attached screenshot style */}
        <div className="space-y-4">
          {MOCK_BOOKINGS.map((booking) => (
            <Card key={booking.id} className="bg-[#1A1A1A] border border-[#D4AF37]/10 rounded-[2rem] overflow-hidden shadow-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                {/* ID Badge */}
                <div className="w-16 h-16 bg-[#261F18] rounded-3xl flex items-center justify-center shrink-0 border border-[#D4AF37]/10">
                  <span className="text-[#D4AF37] text-xl font-bold">#{booking.id}</span>
                </div>

                {/* Main Info */}
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">{booking.guestName}</h3>
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{booking.guests}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border border-gray-700 rounded px-1.5 py-0.5">
                      <div className="w-4 h-2.5 border border-gray-400 rounded-sm"></div>
                      <span className="text-[10px] uppercase font-bold tracking-tighter">{booking.paymentType}</span>
                    </div>
                  </div>
                </div>

                {/* Price & Dates */}
                <div className="text-right flex flex-col items-end gap-1 px-2">
                  <span className="text-2xl font-bold text-[#D4AF37]">₹{booking.amount}</span>
                  <span className="text-[10px] font-medium text-gray-500">{booking.checkIn} - {booking.checkOut}</span>
                </div>

                {/* Actions Divider & Buttons */}
                <div className="flex items-center gap-3 border-l border-gray-800 pl-4 py-2">
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
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
