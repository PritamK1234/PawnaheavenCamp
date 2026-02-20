import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  User,
  Loader2,
  FileSpreadsheet,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';

interface LedgerEntry {
  id: number;
  customer_name: string;
  check_in: string;
  check_out: string;
  payment_mode: string;
  amount: number;
  unit_id: number | null;
  unit_name: string;
  source: 'website' | 'offline';
}

interface UnitOption {
  id: number;
  name: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Bookings = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [unit, setUnit] = useState('all');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);

  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const propertyId = ownerData?.property_id || ownerData?.propertyId || '';
  const ownerMobile = ownerData?.mobile_number || ownerData?.ownerNumber || ownerData?.mobile || '';

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  const fetchUnits = useCallback(async () => {
    if (!propertyId || !ownerMobile) return;
    try {
      const res = await axios.get(`/api/bookings/owner/units?property_id=${propertyId}&mobile=${ownerMobile}`);
      if (res.data.success) {
        setUnits(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch units:', e);
    }
  }, [propertyId, ownerMobile]);

  const fetchLedger = useCallback(async () => {
    if (!propertyId || !ownerMobile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        property_id: propertyId,
        year,
        month,
        mobile: ownerMobile,
      });
      if (unit !== 'all') params.append('unit_id', unit);

      const res = await axios.get(`/api/bookings/owner/ledger?${params.toString()}`);
      if (res.data.success) {
        setEntries(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch ledger:', e);
    } finally {
      setLoading(false);
    }
  }, [propertyId, ownerMobile, year, month, unit]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const totalAmount = entries.reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-32">
      <div className="sticky top-[61px] z-50 px-4 py-1.5 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 bg-[#1A1A1A]/80 border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold focus:ring-0 focus:ring-offset-0 rounded-lg">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white">
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 bg-[#1A1A1A]/80 border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold focus:ring-0 focus:ring-offset-0 rounded-lg">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white">
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="h-8 bg-[#1A1A1A]/80 border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold focus:ring-0 focus:ring-offset-0 rounded-lg">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#D4AF37]/30 text-white">
              <SelectItem value="all">All Units</SelectItem>
              {units.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
            Bookings Ledger
          </h2>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total: </span>
            <span className="text-sm font-bold text-[#D4AF37]">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <AlertCircle className="w-10 h-10 mb-3 text-gray-600" />
            <p className="text-sm font-medium">No bookings found</p>
            <p className="text-[10px] mt-1">Try changing the filters above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <Card key={`${entry.source}-${entry.id}`} className="bg-[#1A1A1A] border border-[#D4AF37]/10 rounded-2xl overflow-hidden shadow-xl">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#261F18] rounded-xl flex items-center justify-center shrink-0 border border-[#D4AF37]/10">
                    <span className="text-[#D4AF37] text-sm font-bold">#{idx + 1}</span>
                  </div>

                  <div className="flex-grow min-w-0">
                    <h3 className="text-sm font-bold text-white mb-0.5 leading-tight truncate">
                      {entry.customer_name || 'Guest'}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-500 flex-wrap">
                      <span className="text-[9px] text-gray-400 truncate max-w-[80px]">{entry.unit_name}</span>
                      <div className="flex items-center gap-1 border border-gray-800 rounded px-1 py-0.25">
                        <span className="text-[8px] uppercase font-bold tracking-tighter">
                          {entry.source === 'website' ? 'online' : (entry.payment_mode || 'cash')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-base font-bold text-[#D4AF37]">
                      ₹{parseFloat(String(entry.amount || 0)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] font-medium text-gray-500">
                      {formatDate(entry.check_in)} - {formatDate(entry.check_out)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
