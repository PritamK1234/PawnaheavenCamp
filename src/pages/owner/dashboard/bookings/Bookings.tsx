import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  FileText, 
  FileSpreadsheet,
  Download,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Mock data for demonstration
const MOCK_BOOKINGS = [
  {
    id: 'PHC-M2K3F4-A1B2C3',
    guestName: 'John Doe',
    checkIn: '2024-05-15',
    checkOut: '2024-05-17',
    unit: 'Luxury Dome A1',
    status: 'Confirmed',
    amount: '₹12,500',
    guests: '2 Adults, 1 Child',
    bookedAt: '2024-04-10'
  },
  {
    id: 'PHC-R5T9L1-D4E5F6',
    guestName: 'Sarah Smith',
    checkIn: '2024-05-20',
    checkOut: '2024-05-21',
    unit: 'Cottage B2',
    status: 'Pending',
    amount: '₹6,000',
    guests: '2 Adults',
    bookedAt: '2024-05-02'
  },
  {
    id: 'PHC-P0Q2W8-G7H8I9',
    guestName: 'Rahul Kumar',
    checkIn: '2024-06-01',
    checkOut: '2024-06-03',
    unit: 'Villa V1',
    status: 'Cancelled',
    amount: '₹25,000',
    guests: '6 Adults',
    bookedAt: '2024-05-12'
  }
];

const Bookings = () => {
  const [year, setYear] = useState('2024');
  const [month, setMonth] = useState('May');
  const [unit, setUnit] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'pending': return <Clock className="w-3 h-3 mr-1" />;
      case 'cancelled': return <XCircle className="w-3 h-3 mr-1" />;
      default: return <AlertCircle className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Top Navigation / Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Bookings</h1>
        
        {/* Filters Row - Mobile First: 3 in a row */}
        <div className="grid grid-cols-3 gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 text-xs border-gray-200">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 text-xs border-gray-200">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="h-9 text-xs border-gray-200">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="dome">Domes</SelectItem>
              <SelectItem value="cottage">Cottages</SelectItem>
              <SelectItem value="villa">Villas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Booking List */}
      <div className="px-4 py-4 space-y-3">
        {MOCK_BOOKINGS.map((booking) => (
          <Card key={booking.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-xl">
            <CardContent className="p-0">
              <div className="p-4">
                {/* Compact Card Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Booking ID</span>
                    <span className="text-sm font-bold text-gray-900">{booking.id}</span>
                  </div>
                  <Badge className={`${getStatusColor(booking.status)} border px-2 py-0.5 text-[10px] font-semibold flex items-center shadow-none`}>
                    {getStatusIcon(booking.status)}
                    {booking.status}
                  </Badge>
                </div>

                {/* Compact Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 mt-3">
                  <div className="flex items-start">
                    <User className="w-3.5 h-3.5 text-[#d4af37] mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-500 leading-tight">Guest</p>
                      <p className="text-xs font-semibold text-gray-800 truncate">{booking.guestName}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Calendar className="w-3.5 h-3.5 text-[#d4af37] mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-500 leading-tight">Stay Dates</p>
                      <p className="text-xs font-semibold text-gray-800">{booking.checkIn} - {booking.checkOut}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Search className="w-3.5 h-3.5 text-[#d4af37] mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-500 leading-tight">Unit</p>
                      <p className="text-xs font-semibold text-gray-800">{booking.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-3.5 h-3.5 flex items-center justify-center mr-2 mt-0.5 text-[#d4af37] font-bold text-[10px]">₹</div>
                    <div>
                      <p className="text-[10px] text-gray-500 leading-tight">Amount</p>
                      <p className="text-xs font-bold text-gray-900">{booking.amount}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card Footer Action */}
              <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 italic">Booked on {booking.bookedAt}</span>
                <Button variant="ghost" size="sm" className="h-7 text-[#d4af37] hover:text-[#b08d2b] hover:bg-gold-50 p-0 font-bold text-[10px] flex items-center">
                  VIEW DETAILS <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <button className="flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-full shadow-lg active:scale-95 transition-transform">
          <FileSpreadsheet className="w-6 h-6" />
        </button>
        <button className="flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full shadow-lg active:scale-95 transition-transform">
          <FileText className="w-6 h-6" />
        </button>
      </div>
      
      {/* Mobile Bottom Bar Spacing */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Bookings;
