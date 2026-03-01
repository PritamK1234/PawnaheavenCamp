import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ChevronLeft,
  ShieldCheck,
  Lock,
  Wallet,
  User,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  LogOut,
  Copy,
  Download,
  Share2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import axios from "axios";
import { toast } from "sonner";

interface DashboardData {
  username: string;
  referral_code: string;
  referral_type: string;
  commission_label: string;
  linked_property_id: number | null;
  linked_property_slug: string | null;
  total_earnings: number;
  total_withdrawals: number;
  available_balance: number;
  pending_withdrawal_amount: number;
  total_referrals: number;
}

interface ShareData {
  referralCode: string;
  referralLink: string;
  referralQrCode: string;
  referralType: string;
  linkedPropertySlug: string | null;
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

const CheckEarningPage = () => {
  const navigate = useNavigate();
  const fromParam = new URLSearchParams(window.location.search).get("from");
  const isFromAdmin = fromParam === "admin";
  const isFromOwner = fromParam === "owner";
  const [step, setStep] = useState<"verify" | "otp" | "dashboard">("verify");
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [inProcess, setInProcess] = useState<InProcessBooking[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("referral_token"),
  );

  const [formData, setFormData] = useState({
    code: "",
    otp: "",
    accountDetails: "",
    withdrawAmount: "",
  });

  useEffect(() => {
    if (token) {
      fetchDashboard(token);
      fetchShareData(token);
      fetchInProcess(token);
      fetchHistory(token);
    }
  }, [token]);

  const fetchDashboard = async (authToken: string) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/referrals/dashboard", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setDashboard(res.data);
      setStep("dashboard");
    } catch {
      localStorage.removeItem("referral_token");
      setToken(null);
      setStep("verify");
    } finally {
      setLoading(false);
    }
  };

  const fetchShareData = async (authToken: string) => {
    try {
      const res = await axios.get("/api/referrals/share", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setShareData(res.data);
    } catch (error: any) {
      console.error("Share data error:", error);
    }
  };

  const fetchInProcess = async (authToken: string) => {
    try {
      const res = await axios.get("/api/referrals/in-process", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setInProcess(res.data.in_process || []);
    } catch (error: any) {
      console.error("In-process error:", error);
    }
  };

  const fetchHistory = async (authToken: string) => {
    setHistoryLoading(true);
    try {
      const res = await axios.get("/api/referrals/history", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setHistoryItems(res.data.history || []);
    } catch (error: any) {
      console.error("History error:", error);
    } finally {
      setHistoryLoading(false);
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
    window.open(`https://wa.me/?text=${encodeURIComponent(shareData.referralLink)}`, "_blank");
  };

  const handleSendOTP = async () => {
    if (!formData.code) {
      toast.error("Please enter your mobile number");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/referrals/request-otp", {
        mobile: formData.code,
        purpose: "referral_login",
      });
      toast.success("OTP sent to your registered mobile");
      setStep("otp");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const verifyRes = await axios.post("/api/referrals/verify-otp", {
        mobile: formData.code,
        otp: formData.otp,
        purpose: "referral_login",
      });
      const otpToken = verifyRes.data.token;
      const loginRes = await axios.post(
        "/api/referrals/login",
        {},
        { headers: { Authorization: `Bearer ${otpToken}` } },
      );
      const finalToken = loginRes.data.token;
      localStorage.setItem("referral_token", finalToken);
      setToken(finalToken);
      fetchDashboard(finalToken);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await axios.post(
        "/api/referrals/withdraw",
        { amount: parseFloat(formData.withdrawAmount), upi: formData.accountDetails },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Withdrawal request submitted!");
      fetchDashboard(token);
      fetchHistory(token);
      setFormData({ ...formData, withdrawAmount: "", accountDetails: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("referral_token");
    setToken(null);
    setDashboard(null);
    setInProcess([]);
    setHistoryItems([]);
    setStep("verify");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Helmet>
        <title>Check Earning - PawnaHavenCamp</title>
      </Helmet>

      <div className="sticky top-0 z-50 bg-black border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (isFromAdmin) window.close();
                else if (isFromOwner) navigate(-1);
                else navigate("/referral");
              }}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-xl font-bold">Check Earning</h1>
          </div>
          {dashboard && (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-red-500"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout Referral</span>
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 pt-8 max-w-md">
        {step === "verify" && (
          <div className="space-y-8 animate-fade-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-display font-bold">Login to Dashboard</h2>
              <p className="text-sm text-muted-foreground">Enter your registered mobile number</p>
            </div>
            <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-4">
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input
                  placeholder="e.g. 9999999999"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={formData.code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) setFormData({ ...formData, code: value });
                  }}
                  className="h-12 bg-secondary/50 rounded-xl"
                />
              </div>
              <Button onClick={handleSendOTP} disabled={loading} className="w-full h-12 rounded-xl font-bold gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Send OTP</>}
              </Button>
              <div className="text-center pt-2">
                <span className="text-xs text-muted-foreground">
                  Not registered yet?{" "}
                  <Link to="/referral/generate" className="text-primary font-bold hover:underline">
                    Create your own referral code
                  </Link>
                </span>
              </div>
            </Card>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-8 animate-fade-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-display font-bold">Enter OTP</h2>
              <p className="text-sm text-muted-foreground">Verification code sent to {formData.code}</p>
            </div>
            <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-4">
              <div className="space-y-2">
                <Label>OTP Code</Label>
                <Input
                  placeholder="000000"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  className="h-12 bg-secondary/50 rounded-xl text-center text-2xl tracking-[0.5em] font-bold"
                  maxLength={6}
                />
              </div>
              <Button onClick={handleVerifyOTP} disabled={loading} className="w-full h-12 rounded-xl font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Login"}
              </Button>
            </Card>
          </div>
        )}

        {step === "dashboard" && dashboard && (
          <div className="space-y-6 animate-fade-up">
            <Card className="p-6 bg-gradient-to-br from-primary to-gold-dark text-white rounded-[2rem] border-none shadow-gold relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-white/70 font-bold tracking-widest">Welcome back</p>
                    <p className="text-xl font-display font-bold capitalize">
                      {dashboard.username} ({dashboard.referral_code})
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        dashboard.referral_type === "owner" ? "bg-blue-500/20 text-blue-400" :
                        dashboard.referral_type === "b2b" ? "bg-amber-500/20 text-amber-400" :
                        dashboard.referral_type === "owners_b2b" ? "bg-purple-500/20 text-purple-400" :
                        "bg-emerald-500/20 text-emerald-400"
                      )}>
                        {dashboard.referral_type === "owner" ? "Owner" :
                         dashboard.referral_type === "b2b" ? "B2B Partner" :
                         dashboard.referral_type === "owners_b2b" ? "Owners B2B" :
                         "Public"} Referral
                      </span>
                      <span className="text-[10px] text-white/50">{dashboard.commission_label}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/70 font-bold tracking-widest mb-1">Available Balance</p>
                  <p className="text-4xl font-display font-bold">
                    ₹{dashboard.available_balance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10" />
            </Card>

            <Tabs defaultValue="withdraw" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-secondary/50 rounded-2xl p-1 h-14">
                <TabsTrigger value="withdraw" className="rounded-xl font-bold data-[state=active]:bg-primary text-xs">
                  <Wallet className="w-4 h-4 mr-1" />
                  Withdraw
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl font-bold data-[state=active]:bg-primary text-xs">
                  <History className="w-4 h-4 mr-1" />
                  History
                </TabsTrigger>
                <TabsTrigger value="stats" className="rounded-xl font-bold data-[state=active]:bg-primary text-xs">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Stats
                </TabsTrigger>
                <TabsTrigger value="share" className="rounded-xl font-bold data-[state=active]:bg-primary text-xs">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </TabsTrigger>
              </TabsList>

              <TabsContent value="withdraw" className="mt-6 space-y-6">
                <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-4">
                  <div className="space-y-2">
                    <Label>UPI ID / Account Details</Label>
                    <Input
                      placeholder="e.g. user@upi"
                      value={formData.accountDetails}
                      onChange={(e) => setFormData({ ...formData, accountDetails: e.target.value })}
                      className="h-12 bg-secondary/50 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Withdraw Amount (Min ₹500)</Label>
                    <Input
                      placeholder="e.g. 500"
                      type="number"
                      value={formData.withdrawAmount}
                      onChange={(e) => setFormData({ ...formData, withdrawAmount: e.target.value })}
                      className="h-12 bg-secondary/50 rounded-xl"
                    />
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    disabled={
                      loading ||
                      !formData.withdrawAmount ||
                      parseFloat(formData.withdrawAmount) < 500 ||
                      parseFloat(formData.withdrawAmount) > dashboard.available_balance
                    }
                    className="w-full h-14 rounded-2xl font-bold shadow-gold"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw Amount"}
                  </Button>
                </Card>

                {dashboard.pending_withdrawal_amount > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 px-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      Pending Requests
                    </h3>
                    <Card className="p-4 bg-card border-orange-500/20 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="font-bold">₹{dashboard.pending_withdrawal_amount.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Withdrawal Request</p>
                      </div>
                      <span className="text-[10px] bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                        Pending
                      </span>
                    </Card>
                  </div>
                )}

                {inProcess.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 px-2">
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
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stats" className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Earned</p>
                    <p className="text-lg font-bold text-primary">₹{dashboard.total_earnings.toLocaleString("en-IN")}</p>
                  </Card>
                  <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Referrals</p>
                    <p className="text-lg font-bold text-primary">{dashboard.total_referrals}</p>
                  </Card>
                  <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Withdrawn</p>
                    <p className="text-lg font-bold text-red-400">₹{dashboard.total_withdrawals.toLocaleString("en-IN")}</p>
                  </Card>
                  <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">In-Process</p>
                    <p className="text-lg font-bold text-amber-400">{inProcess.length}</p>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="share" className="mt-6 space-y-6">
                {shareData ? (
                  <div className="space-y-6">
                    <Card className="p-6 bg-card border-border/50 rounded-3xl text-center space-y-4">
                      <Label className="text-xs font-bold tracking-widest text-muted-foreground">Your QR Code</Label>
                      <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                        <img src={shareData.referralQrCode} alt="Referral QR" className="w-48 h-48" />
                      </div>
                      <Button variant="outline" onClick={handleDownloadQR} className="w-full gap-2 rounded-xl">
                        <Download className="w-4 h-4" />Download QR
                      </Button>
                    </Card>

                    <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-3">
                      <Label className="text-xs font-bold tracking-widest text-muted-foreground">Referral Link</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={shareData.referralLink} className="bg-secondary/30 border-none" />
                        <Button size="icon" variant="secondary" onClick={() => handleCopy(shareData.referralLink, "Link")}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-3">
                      <Label className="text-xs font-bold tracking-widest text-muted-foreground">Referral Code</Label>
                      <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-xl">
                        <span className="text-2xl font-display font-bold text-primary tracking-wider">
                          {shareData.referralCode}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => handleCopy(shareData.referralCode, "Code")}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>

                    <Button
                      onClick={handleWhatsAppShare}
                      className="w-full h-14 rounded-2xl font-bold bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg"
                    >
                      <Share2 className="w-5 h-5 mr-2" />
                      Share on WhatsApp
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-6 space-y-4">
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-secondary/50 rounded-2xl flex items-center justify-center mb-4">
                      <History className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-muted-foreground">No History Yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Complete your first referral to see earnings here.</p>
                  </div>
                ) : (
                  historyItems.map((item, idx) => {
                    const isSuccess = item.type === "booking_success" || item.type === "withdrawal_paid";
                    const isCancelled = item.type === "booking_cancelled";
                    const isWithdrawal = item.type === "withdrawal_paid" || item.type === "withdrawal_rejected";
                    return (
                      <Card key={idx} className={cn(
                        "p-4 bg-card rounded-2xl flex items-center gap-4",
                        isSuccess ? "border-emerald-500/20" :
                        isCancelled ? "border-red-500/20" :
                        "border-red-500/20"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          isSuccess ? "bg-emerald-500/10 text-emerald-500" :
                          "bg-red-500/10 text-red-400"
                        )}>
                          {item.type === "booking_success" && <CheckCircle2 className="w-5 h-5" />}
                          {item.type === "booking_cancelled" && <XCircle className="w-5 h-5" />}
                          {item.type === "withdrawal_paid" && <Wallet className="w-5 h-5" />}
                          {item.type === "withdrawal_rejected" && <Wallet className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{item.message}</p>
                          {item.property_name && (
                            <p className="text-xs text-muted-foreground truncate">{item.property_name}</p>
                          )}
                          {isWithdrawal && item.upi_id && (
                            <p className="text-xs text-muted-foreground">UPI: {item.upi_id}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(item.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-bold",
                            isSuccess ? "text-emerald-500" : "text-red-400"
                          )}>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckEarningPage;
