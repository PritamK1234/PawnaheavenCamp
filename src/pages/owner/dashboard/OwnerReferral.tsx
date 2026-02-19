import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Wallet,
  User,
  Share2,
  Copy,
  Download,
  QrCode,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const OwnerReferral = () => {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<OwnerReferralData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [shareData, setShareData] = useState<any>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const ownerDataString = localStorage.getItem("ownerData");
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const ownerMobile = ownerData?.mobileNumber || ownerData?.mobile || "";

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
        purpose: "login",
      });

      const debugOtp = otpRes.data.debug_otp;
      if (debugOtp) {
        const verifyRes = await axios.post("/api/referrals/verify-otp", {
          mobile: ownerMobile,
          otp: debugOtp,
          purpose: "login",
        });

        const otpToken = verifyRes.data.token;
        const loginRes = await axios.post(
          "/api/referrals/login",
          {},
          { headers: { Authorization: `Bearer ${otpToken}` } }
        );

        const finalToken = loginRes.data.token;

        const [dashRes, shareRes] = await Promise.all([
          axios.get("/api/referrals/dashboard", {
            headers: { Authorization: `Bearer ${finalToken}` },
          }),
          axios.get("/api/referrals/share", {
            headers: { Authorization: `Bearer ${finalToken}` },
          }),
        ]);

        setDashboardData(dashRes.data);
        setShareData(shareRes.data);
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
                  {"\u20B9"}{dashboardData.available_balance?.toLocaleString("en-IN") || "0"}
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
                {"\u20B9"}{dashboardData.total_earnings?.toLocaleString("en-IN") || "0"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Earned</p>
            </Card>
            <Card className="p-3 bg-card border-border/50 rounded-2xl text-center">
              <p className="text-lg font-bold text-emerald-400">
                {dashboardData.total_referrals || 0}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Referrals</p>
            </Card>
            <Card className="p-3 bg-card border-border/50 rounded-2xl text-center">
              <p className="text-lg font-bold text-red-400">
                {"\u20B9"}{dashboardData.total_withdrawals?.toLocaleString("en-IN") || "0"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Withdrawn</p>
            </Card>
          </div>
        )}

        {shareData && (
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
                  <Download className="w-4 h-4" />
                  Download QR
                </Button>
              </div>
            )}

            <Button onClick={handleWhatsAppShare} className="w-full h-12 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Share2 className="w-4 h-4" />
              Share on WhatsApp
            </Button>
          </Card>
        )}

        {!dashboardData && !loggingIn && referralData.found && (
          <Card className="p-6 bg-card border-border/50 rounded-3xl text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Your referral code is ready. Login from the public site's "Referral Earning" section to access your full dashboard with withdrawals and history.
            </p>
            <Link to="/referral/check">
              <Button className="rounded-2xl font-bold gap-2">
                Go to Full Dashboard
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OwnerReferral;
