import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Calendar, 
  User, 
  Hash, 
  CreditCard,
  Download,
  Share2,
  ExternalLink
} from "lucide-react";

interface ETicketProps {
  bookingData: {
    propertyTitle: string;
    name: string;
    mobile: string;
    persons: number;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    advanceAmount: number;
  };
  paymentInfo: {
    orderId: string;
    transactionId: string;
    status: string;
    date: string;
  };
}

export function ETicket({ bookingData, paymentInfo }: ETicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleShare = () => {
    const text = `*🏡 PAWNAHAVENCAMP E-TICKET*\n\n` +
      `📍 *Property:* ${bookingData.propertyTitle}\n` +
      `🔖 *Booking ID:* PHC-${paymentInfo.orderId.split('-')[1]}\n\n` +
      `👤 *Guest:* ${bookingData.name}\n` +
      `📅 *Check-in:* ${bookingData.checkIn} (11:00 AM)\n` +
      `📅 *Check-out:* ${bookingData.checkOut} (10:00 AM)\n\n` +
      `💰 *Total:* ₹${bookingData.totalPrice}\n` +
      `✅ *Paid Advance:* ₹${bookingData.advanceAmount}\n` +
      `🔴 *DUE AMOUNT: ₹${bookingData.totalPrice - bookingData.advanceAmount}*\n\n` +
      `🔗 *Location:* https://maps.app.goo.gl/PawnaLake\n\n` +
      `*Paytm Transaction Details:*\n` +
      `• Order ID: ${paymentInfo.orderId}\n` +
      `• Status: ${paymentInfo.status}\n\n` +
      `Host: PawnaHavenCamp.com | +918806092609`;

    window.open(`https://api.whatsapp.com/send?phone=918806092609&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-2 sm:p-4">
      <div id="e-ticket" ref={ticketRef} className="bg-white rounded-[1.5rem] overflow-hidden shadow-xl border border-border/40 relative">
        {/* Top Header - More Compact */}
        <div className="bg-primary p-4 sm:p-6 text-primary-foreground text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <CheckCircle2 className="w-16 h-16 -mr-8 -mt-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold mb-0.5 tracking-tight truncate px-4">{bookingData.propertyTitle}</h1>
          <p className="text-[10px] opacity-80 uppercase tracking-widest font-medium">PawnaHavenCamp Luxury Stays</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold border border-white/20">
            <Hash className="w-2.5 h-2.5" />
            ID: PHC-{paymentInfo.orderId.split('-')[1]}
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Guest Info - Compact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> Guest Name
              </span>
              <p className="font-bold text-sm truncate text-foreground">{bookingData.name}</p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold flex items-center justify-end gap-1">
                <Phone className="w-2.5 h-2.5" /> Contact Number
              </span>
              <p className="font-bold text-sm text-foreground">{bookingData.mobile}</p>
            </div>
          </div>

          <div className="h-px bg-border/40" />

          {/* Dates Section - More Compact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-primary">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase tracking-widest font-black">Check-In</span>
              </div>
              <p className="font-bold text-sm leading-tight text-foreground">{bookingData.checkIn}</p>
              <p className="text-[10px] text-muted-foreground font-medium">11:00 AM</p>
            </div>
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-1.5 text-primary justify-end">
                <span className="text-[9px] uppercase tracking-widest font-black">Check-Out</span>
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <p className="font-bold text-sm leading-tight text-foreground">{bookingData.checkOut}</p>
              <p className="text-[10px] text-muted-foreground font-medium">10:00 AM</p>
            </div>
          </div>

          {/* Financials - Extremely Compact but Clear */}
          <div className="bg-secondary/20 rounded-2xl p-4 border border-border/30">
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Paid</span>
                <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>₹{bookingData.advanceAmount}</span>
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[9px] uppercase tracking-widest text-primary font-black">Due At Site</span>
                <p className="text-2xl font-black text-primary leading-none">₹{bookingData.totalPrice - bookingData.advanceAmount}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 space-y-3">
              <div className="flex flex-col items-center justify-center text-center gap-1">
                <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Official Website & Support</span>
                <span className="flex items-center gap-2 text-gold font-black text-xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                  <ExternalLink className="w-5 h-5" /> PawnaHavenCamp.com
                </span>
                <span className="flex items-center gap-2 text-gold font-black text-2xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                  <Phone className="w-6 h-6" /> 8806092609
                </span>
              </div>
            </div>
          </div>

          {/* Paytm Details - Compact Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#002970]/5 rounded-lg border border-[#002970]/10">
              <span className="text-[9px] font-black uppercase text-[#002970] tracking-wider">Paytm Secure Payment</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px]">
              <div>
                <span className="text-muted-foreground font-bold uppercase tracking-tighter block">Order ID</span>
                <span className="font-mono font-medium truncate block text-foreground">{paymentInfo.orderId}</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground font-bold uppercase tracking-tighter block">Transaction ID</span>
                <span className="font-mono font-medium truncate block text-foreground">{paymentInfo.transactionId}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-bold uppercase tracking-tighter">Status:</span>
                <span className="font-black text-green-600 uppercase">Paid</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground font-bold uppercase tracking-tighter">{paymentInfo.date}</span>
              </div>
            </div>
          </div>

          {/* Map Link */}
          <Button 
            variant="outline" 
            className="w-full h-10 rounded-xl border-dashed border-primary/30 text-primary font-bold text-xs gap-2 hover:bg-primary/5"
            onClick={() => window.open('https://maps.app.goo.gl/PawnaLake', '_blank')}
          >
            <MapPin className="w-3.5 h-3.5" />
            Get Map Location
          </Button>
        </CardContent>

        {/* Bottom Decorative Edge - Smaller */}
        <div className="h-3 bg-primary flex gap-1.5 overflow-hidden px-3">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-white -mb-1.5 flex-shrink-0" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={handleShare}
          className="rounded-xl py-5 font-bold flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-md text-sm"
        >
          <Share2 className="w-4 h-4" />
          WhatsApp
        </Button>
        <Button 
          onClick={() => window.print()}
          variant="outline"
          className="rounded-xl py-5 font-bold flex items-center gap-2 border-primary/20 text-primary text-sm"
        >
          <Download className="w-4 h-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
