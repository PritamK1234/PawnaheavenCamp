import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  DollarSign,
  RotateCcw,
  Handshake,
  CircleDot,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = [2025, 2026, 2027];

const AdminRevenuePage = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showPicker, setShowPicker] = useState(false);

  const grossRevenue = 1875000;
  const refundPayable = 120000;
  const referralPayable = 230000;
  const netRevenue = grossRevenue - refundPayable - referralPayable;
  const adminAPercent = 80;
  const adminBPercent = 20;
  const adminAAmount = Math.round(netRevenue * adminAPercent / 100);
  const adminBAmount = netRevenue - adminAAmount;

  const formatCurrency = (amount: number) => {
    return "₹ " + amount.toLocaleString("en-IN");
  };

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <div className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-gold/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gold hover:bg-gold/10 transition-all border border-gold/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-lg font-bold italic text-gold tracking-wide">Revenue</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-gold/10 text-sm font-semibold hover:border-gold/30 transition-all"
          >
            <span className="text-white/90">{MONTHS[selectedMonth]} {selectedYear}</span>
            <ChevronDown className={cn("w-4 h-4 text-gold transition-transform", showPicker && "rotate-180")} />
          </button>

          {showPicker && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#141414] border border-gold/10 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex gap-2 mb-3">
                {YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      selectedYear === y
                        ? "bg-gold text-black"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(i);
                      setShowPicker(false);
                    }}
                    className={cn(
                      "py-2.5 rounded-xl text-[11px] font-bold transition-all",
                      selectedMonth === i && selectedYear === selectedYear
                        ? "bg-gold text-black"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Card className="relative overflow-hidden bg-gradient-to-br from-gold/20 via-gold/5 to-transparent p-5 rounded-[1.75rem] border border-gold/15 shadow-[0_0_30px_rgba(212,175,55,0.08)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center border border-gold/20">
              <DollarSign className="w-5 h-5 text-gold" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-gold/70">Gross Revenue</p>
          </div>
          <p className="text-3xl font-display font-bold text-white tracking-tight">
            {formatCurrency(grossRevenue)}
          </p>
        </Card>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 px-1">Deductions</p>

          <Card className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/15">
                <RotateCcw className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Refund Payable</p>
              </div>
            </div>
            <p className="text-base font-bold text-red-400">{formatCurrency(refundPayable)}</p>
          </Card>

          <Card className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
                <Handshake className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Referral Payable</p>
              </div>
            </div>
            <p className="text-base font-bold text-amber-400">{formatCurrency(referralPayable)}</p>
          </Card>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 rounded-[1.75rem] blur-xl" />
          <Card className="relative bg-white/[0.03] p-5 rounded-[1.75rem] border border-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                <CircleDot className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400/70">Net Revenue</p>
            </div>
            <p className="text-3xl font-display font-bold text-emerald-400 tracking-tight">
              {formatCurrency(netRevenue)}
            </p>
          </Card>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 px-1">
            <Users className="w-3.5 h-3.5 text-gold/50" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Revenue Split</p>
          </div>

          <Card className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center border border-gold/15">
                  <span className="text-xs font-bold text-gold">A</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white/90">Admin A</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{adminAPercent}% Share</p>
                </div>
              </div>
              <p className="text-base font-bold text-gold">{formatCurrency(adminAAmount)}</p>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/15">
                  <span className="text-xs font-bold text-blue-400">B</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white/90">Admin B</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{adminBPercent}% Share</p>
                </div>
              </div>
              <p className="text-base font-bold text-blue-400">{formatCurrency(adminBAmount)}</p>
            </div>
          </Card>

          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold/80 rounded-full transition-all"
              style={{ width: `${adminAPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 font-bold px-1">
            <span>Admin A ({adminAPercent}%)</span>
            <span>Admin B ({adminBPercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenuePage;
