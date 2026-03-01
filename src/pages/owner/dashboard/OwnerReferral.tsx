import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Wallet,
  User,
  Share2,
  Copy,
  Download,
  Loader2,
  AlertCircle,
  History,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import axios from "axios";
import { toast } from "sonner";

interface OwnerReferralData {
  found: boolean;
  data?: {
    id: number;
    username: string;
    referral_code: string;
    referral_type: string;
    linked_property_id: number;
    linked_property_slug: string;
    status: string;
  };
}

interface InProcessBooking {
  booking_id: string;
  property_name: string;
  guest_name: string;
  checkin_datetime: string;
  checkout_datetime: string;
  referrer_commission: number;
}

interface HistoryItem {
  type: "booking_success" | "booking_cancelled" | "withdrawal_paid" | "withdrawal_rejected";
  property_name?: string;
  guest_name?: string;
  amount: number;
  date: string;
  message: string;
  upi_id?: string;
}

const OwnerReferral = () => {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<OwnerReferralData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [shareData, setShareData] = useState<any>(null);
  const [inProcess, setInProcess] = useState<InProcessBooking[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loggingIn, setLoggingIn] = useState(false);

  const ownerDataString = localStorage.getItem("ownerData");
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const ownerMobile = ownerData?.owner_otp_number || ownerData?.ownerNumber || ownerData?.mobileNumber || ownerData?.mobile || "";

  useEffect(() => {
    if (ownerMobile) {
      lookupReferral();
    } else {
      setLoading(false);
    }
  }, [ownerMobile]);

  const lookupReferral = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/referrals/owner-lookup/${ownerMobile}`);
      setReferralData(res.data);
      if (res.data.found) {
        await loginAndFetchDashboard();
      }
    } catch (error) {
      console.error("Referral lookup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loginAndFetchDashboard = async () => {
    setLoggingIn(true);
    try {
      const otpRes = await axios.post("/api/referrals/request-otp", {
        mobile: ownerMobile,
        purpose: "referral_login",
      });

      if (otpRes.data.success) {
        const verifyRes = await axios.post("/api/referrals/verify-otp", {
          mobile: ownerMobile,
          otp: "123456",
          purpose: "referral_login",
        });

        const otpToken = verifyRes.data.token;
        const loginRes = await axios.post(
          "/api/referrals/login",
          {},
          { headers: { Authorization: `Bearer ${otpToken}` } }
        );

        const finalToken = loginRes.data.token;

        const [dashRes, shareRes, inProcessRes, historyRes] = await Promise.all([
          axios.get("/api/referrals/dashboard", { headers: { Authorization: `Bearer ${finalToken}` } }),
          axios.get("/api/referrals/share", { headers: { Authorization: `Bearer ${finalToken}` } }),
          axios.get("/api/referrals/in-process", { headers: { Authorization: `Bearer ${finalToken}` } }),
          axios.get("/api/referrals/history", { headers: { Authorization: `Bearer ${finalToken}` } }),
        ]);

        setDashboardData(dashRes.data);
        setShareData(shareRes.data);
        setInProcess(inProcessRes.data.in_process || []);
        setHistoryItems(historyRes.data.history || []);
      }
    } catch (error) {
      console.error("Auto-login error:", error);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleDownloadQR = () => {
    if (!shareData) return;
    const link = document.createElement("a");
    link.href = shareData.referralQrCode;
    link.download = `referral-qr-${shareData.referralCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = () => {
    if (!shareData) return;
    const message = `Check out my property on PawnaHavenCamp!\n\nBook directly using my link:\n${shareData.referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!referralData?.found) {
    return (
      <div className="min-h-screen bg-black text-white pb-28">
        <div className="sticky top-0 z-50 bg-black border-b border-border/50">
          <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <Link
              to={ownerData?.propertyType?.toLowerCase() === "villa" ? "/owner/dashboard/villa" : "/owner/dashboard/camping"}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="font-display text-xl font-bold">Referral Program</h1>
          </div>
        </div>
        <div className="container mx-auto px-6 pt-12 max-w-md text-center">
          <div className="glass-dark rounded-[2.5rem] border border-white/5 p-8">
            <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#D4AF37]/20">
              <AlertCircle className="w-10 h-10 text-[#D4AF37]" />
            </div>
            <h3 className="text-xl font-bold mb-3">No Referral Code Yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Your admin has not generated a referral code for your property yet. Once they create one, your referral dashboard will appear here automatically.
            </p>
            <Button onClick={lookupReferral} variant="outline" className="rounded-2xl">
              <Loader2 className={cn("w-4 h-4 mr-2", loading ? "animate-spin" : "hidden")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="sticky top-0 z-50 bg-black border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to={ownerData?.propertyType?.toLowerCase() === "villa" ? "/owner/dashboard/villa" : "/owner/dashboard/camping"}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display text-xl font-bold">Referral Program</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 pt-6 max-w-md space-y-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl border-0">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-white/70 font-bold tracking-widest uppercase">Owner Referral</p>
                <p className="text-xl font-display font-bold capitalize">
                  {referralData.data?.username} ({referralData.data?.referral_code})
                </p>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">
                  25% commission on advance
                </span>
              </div>
            </div>
            {dashboardData && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/70 font-bold tracking-widest uppercase mb-1">Available Balance</p>
                <p className="text-4xl font-display font-bold">
                  ₹{dashboardData.available_balance?.toLocaleString("en-IN") || "0"}
                </p>
              </div>
            )}
          </div>
          <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10" />
        </Card>

        {dashboardData && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 bg-card border-border/50 rounded-2xl text-center">
              <p className="text-lg font-bold text-[#D4AF37]">
                ₹{dashboardData.total_earnings?.toLocaleString("en-IN") || "0"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Earned</p>
            </Card>
            <Card className="p-3 bg-card border-border/50 rounded-2xl text-center">
              <p className="text-lg font-bold text-emerald-400">{dashboardData.total_referrals || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Referrals</p>
            </Card>
            <Card className="p-3 bg-card border-border/50 rounded-2xl text-center">
              <p className="text-lg font-bold text-red-400">
                ₹{dashboardData.total_withdrawals?.toLocaleString("en-IN") || "0"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Withdrawn</p>
            </Card>
          </div>
        )}

        {loggingIn ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
          </div>
        ) : (
          <Tabs defaultValue="share" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-secondary/50 rounded-2xl p-1 h-14">
              <TabsTrigger value="inprocess" className="rounded-xl font-bold data-[state=active]:bg-primary text-xs">
                <Clock className="w-4 h-4 mr-1" />
                In-Process
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl font-bold data-[state=active]:bg-primary text-xs">
                <History className="w-4 h-4 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="share" className="rounded-xl font-bold data-[state=active]:bg-primary text-xs">
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inprocess" className="mt-6 space-y-4">
              {inProcess.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-secondary/50 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-muted-foreground">No In-Process Bookings</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Earnings appear here after a customer's booking is confirmed.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-bold flex items-center gap-2 px-1">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Referral Earnings In-Process
                  </h3>
                  {inProcess.map((booking) => (
                    <Card key={booking.booking_id} className="p-4 bg-card border-amber-500/20 rounded-2xl space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm">{booking.property_name}</p>
                          <p className="text-xs text-muted-foreground">Guest: {booking.guest_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateShort(booking.checkin_datetime)} → {formatDateShort(booking.checkout_datetime)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-500">
                            ₹{parseFloat(String(booking.referrer_commission)).toLocaleString("en-IN")}
                          </p>
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                            Awaiting Check-out
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="share" className="mt-6 space-y-6">
              {shareData ? (
                <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-[#D4AF37]" />
                    Share Your Referral
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Customers who book through your link will be directed to your property page. You earn 25% of the 30% advance payment.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={shareData.referralLink}
                        className="flex-1 h-10 bg-secondary/50 rounded-xl px-3 text-xs border border-border/50"
                      />
                      <Button size="icon" variant="outline" onClick={() => handleCopy(shareData.referralLink, "Link")} className="rounded-xl h-10 w-10">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={shareData.referralCode}
                        className="flex-1 h-10 bg-secondary/50 rounded-xl px-3 text-sm font-bold tracking-wider border border-border/50"
                      />
                      <Button size="icon" variant="outline" onClick={() => handleCopy(shareData.referralCode, "Code")} className="rounded-xl h-10 w-10">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {shareData.referralQrCode && (
                    <div className="flex flex-col items-center gap-3 pt-2">
                      <div className="p-3 bg-white rounded-2xl">
                        <img src={shareData.referralQrCode} alt="QR Code" className="w-40 h-40" />
                      </div>
                      <Button variant="outline" size="sm" onClick={handleDownloadQR} className="rounded-xl gap-2">
                        <Download className="w-4 h-4" />Download QR
                      </Button>
                    </div>
                  )}
                  <Button onClick={handleWhatsAppShare} className="w-full h-12 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Share2 className="w-4 h-4" />Share on WhatsApp
                  </Button>
                </Card>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-4">
              {historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-secondary/50 rounded-2xl flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-muted-foreground">No History Yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Completed and cancelled bookings will appear here.</p>
                </div>
              ) : (
                historyItems.map((item, idx) => {
                  const isSuccess = item.type === "booking_success" || item.type === "withdrawal_paid";
                  return (
                    <Card key={idx} className={cn(
                      "p-4 bg-card rounded-2xl flex items-center gap-4",
                      isSuccess ? "border-emerald-500/20" : "border-red-500/20"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isSuccess ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
                      )}>
                        {item.type === "booking_success" && <CheckCircle2 className="w-5 h-5" />}
                        {item.type === "booking_cancelled" && <XCircle className="w-5 h-5" />}
                        {(item.type === "withdrawal_paid" || item.type === "withdrawal_rejected") && <Wallet className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{item.message}</p>
                        {item.property_name && (
                          <p className="text-xs text-muted-foreground truncate">{item.property_name}</p>
                        )}
                        {item.upi_id && (
                          <p className="text-xs text-muted-foreground">UPI: {item.upi_id}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(item.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold", isSuccess ? "text-emerald-500" : "text-red-400")}>
                          {isSuccess ? "+" : ""}₹{item.amount.toLocaleString("en-IN")}
                        </p>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                          isSuccess ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
                        )}>
                          {item.type === "booking_success" ? "Completed" :
                           item.type === "booking_cancelled" ? "Cancelled" :
                           item.type === "withdrawal_paid" ? "Paid" : "Rejected"}
                        </span>
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}

        {!dashboardData && !loggingIn && referralData.found && (
          <Card className="p-6 bg-card border-border/50 rounded-3xl text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Your referral code is ready. Login from the public site's "Referral Earning" section to access your full dashboard with withdrawals and history.
            </p>
            <Link to="/referral/check">
              <Button className="rounded-2xl font-bold gap-2">Go to Full Dashboard</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OwnerReferral;
