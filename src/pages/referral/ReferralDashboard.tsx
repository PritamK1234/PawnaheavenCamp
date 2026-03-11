import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Wallet,
  User,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  LogOut,
  Copy,
  Download,
  Share2,
  AlertCircle,
  X,
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
  saved_upi_id: string | null;
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
  type:
    | "booking_success"
    | "booking_cancelled"
    | "withdrawal_paid"
    | "withdrawal_rejected";
  property_name?: string;
  guest_name?: string;
  amount: number;
  date: string;
  message: string;
  upi_id?: string;
}

const validateUPI = (upi: string) => {
  const upiRegex = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upi);
};

const ReferralDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [inProcess, setInProcess] = useState<InProcessBooking[]>([]);
  const [inProcessAmount, setInProcessAmount] = useState(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ upi: "", amount: "" });
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [upiValidating, setUpiValidating] = useState(false);
  const [upiValid, setUpiValid] = useState<boolean | null>(null);
  const [upiVerifiedName, setUpiVerifiedName] = useState<string | null>(null);
  const [upiError, setUpiError] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("referral_token");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminToken = params.get("admin_token");
    if (adminToken) {
      localStorage.setItem("referral_token", adminToken);
      window.history.replaceState({}, "", "/dashboard");
    }
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchAll(token);
  }, [navigate]);

  const fetchAll = (token: string) => {
    fetchDashboard(token);
    fetchShareData(token);
    fetchInProcess(token);
    fetchHistory(token);
  };

  const fetchDashboard = async (token: string) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/referrals/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem("referral_token");
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchShareData = async (token: string) => {
    try {
      const res = await axios.get("/api/referrals/share", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShareData(res.data);
    } catch (error: any) {
      console.error("Share data error:", error);
    }
  };

  const fetchInProcess = async (token: string) => {
    try {
      const res = await axios.get("/api/referrals/in-process", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInProcess(res.data.in_process || []);
      setInProcessAmount(res.data.in_process_amount || 0);
    } catch (error: any) {
      console.error("In-process error:", error);
    }
  };

  const fetchHistory = async (token: string) => {
    setHistoryLoading(true);
    try {
      const res = await axios.get("/api/referrals/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistoryItems(res.data.history || []);
    } catch (error: any) {
      console.error("History error:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (dashboard?.saved_upi_id && !withdrawForm.upi) {
      setWithdrawForm((f) => ({ ...f, upi: dashboard.saved_upi_id! }));
      setUpiValid(true);
    }
  }, [dashboard?.saved_upi_id]);

  const handleUpiBlur = async () => {
    const upi = withdrawForm.upi.trim();
    if (!upi) {
      setUpiValid(null);
      setUpiError(null);
      setUpiVerifiedName(null);
      return;
    }
    const basicRegex = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
    if (!basicRegex.test(upi)) {
      setUpiValid(false);
      setUpiError("Enter a valid UPI ID (e.g. name@upi)");
      setUpiVerifiedName(null);
      return;
    }
    const token = getToken();
    if (!token) return;
    setUpiValidating(true);
    setUpiError(null);
    setUpiVerifiedName(null);
    setUpiValid(null);
    try {
      const res = await axios.post(
        "/api/referrals/validate-upi",
        { upi },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;
      if (data.skipped) {
        setUpiValid(null);
      } else if (data.valid) {
        setUpiValid(true);
        setUpiVerifiedName(data.name || null);
      } else {
        setUpiValid(false);
        setUpiError("Enter a valid UPI ID — this UPI address was not found");
      }
    } catch {
      setUpiValid(null);
    } finally {
      setUpiValidating(false);
    }
  };

  const handleRemoveSavedUpi = async () => {
    const token = getToken();
    if (!token) return;
    try {
      await axios.delete("/api/referrals/saved-upi", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard((d) => d ? { ...d, saved_upi_id: null } : d);
      setWithdrawForm((f) => ({ ...f, upi: "" }));
      setUpiValid(null);
      setUpiError(null);
      setUpiVerifiedName(null);
      toast.success("Saved UPI removed");
    } catch {
      toast.error("Failed to remove saved UPI");
    }
  };

  const handleWithdraw = async () => {
    const token = getToken();
    if (!token || !dashboard) return;

    if (!withdrawForm.upi) {
      toast.error("Please enter UPI ID");
      return;
    }
    if (!validateUPI(withdrawForm.upi)) {
      toast.error("Please enter a valid UPI ID (example: name@upi)");
      return;
    }
    if (!withdrawForm.amount || Number(withdrawForm.amount) < 500) {
      toast.error("Minimum withdrawal amount is ₹500");
      return;
    }
    if (Number(withdrawForm.amount) > dashboard.available_balance) {
      toast.error("Withdrawal amount exceeds available balance");
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await axios.post(
        "/api/referrals/withdraw",
        { amount: parseFloat(withdrawForm.amount), upi: withdrawForm.upi },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const status = response.data?.status;
      const msg = response.data?.message || "Withdrawal initiated!";
      if (status === "completed") {
        toast.success("Withdrawal Successful! 💰 Amount will be credited to your UPI shortly.");
      } else if (status === "processing") {
        toast.success(msg);
      } else {
        toast.success(msg);
      }
      setWithdrawForm({ upi: "", amount: "" });
      fetchDashboard(token);
      fetchHistory(token);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("referral_token");
    navigate("/login", { replace: true });
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
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareData.referralLink)}`,
      "_blank"
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Helmet>
        <title>Dashboard - Referral</title>
      </Helmet>

      <div className="sticky top-0 z-50 bg-black border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="font-display text-xl font-bold text-amber-400">
            Referral Dashboard
          </h1>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-red-500"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 pt-8 max-w-md space-y-6">
        <Card className="p-6 bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-[2rem] border-none shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-white/70 font-bold tracking-widest">
                  Welcome back
                </p>
                <p className="text-xl font-display font-bold capitalize">
                  {dashboard.username} ({dashboard.referral_code})
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      dashboard.referral_type === "owner"
                        ? "bg-blue-500/20 text-blue-300"
                        : dashboard.referral_type === "b2b"
                          ? "bg-amber-300/20 text-amber-200"
                          : dashboard.referral_type === "owners_b2b"
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-emerald-500/20 text-emerald-300"
                    )}
                  >
                    {dashboard.referral_type === "owner"
                      ? "Owner"
                      : dashboard.referral_type === "b2b"
                        ? "B2B Partner"
                        : dashboard.referral_type === "owners_b2b"
                          ? "Owners B2B"
                          : "Public"}{" "}
                    Referral
                  </span>
                  <span className="text-[10px] text-white/50">
                    {dashboard.commission_label}
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/70 font-bold tracking-widest mb-1">
                Available Balance
              </p>
              <p className="text-4xl font-display font-bold">
                ₹{dashboard.available_balance.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10" />
        </Card>

        <Tabs defaultValue="withdraw" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/50 rounded-2xl p-1 h-14">
            <TabsTrigger
              value="withdraw"
              className="rounded-xl font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black text-xs"
            >
              <Wallet className="w-4 h-4 mr-1" />
              Withdraw
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black text-xs"
            >
              <History className="w-4 h-4 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="rounded-xl font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black text-xs"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="share"
              className="rounded-xl font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black text-xs"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </TabsTrigger>
          </TabsList>

          <TabsContent value="withdraw" className="mt-6 space-y-6">
            <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-4">

              {dashboard.saved_upi_id && (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider mb-0.5">Saved UPI</p>
                    <p className="text-sm font-mono text-emerald-300 font-medium">{dashboard.saved_upi_id}</p>
                  </div>
                  <button
                    onClick={handleRemoveSavedUpi}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                    title="Remove saved UPI"
                  >
                    <X className="w-3.5 h-3.5 text-white/60 hover:text-red-400" />
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>UPI ID</Label>
                <div className="relative">
                  <Input
                    placeholder="e.g. name@upi"
                    value={withdrawForm.upi}
                    onChange={(e) => {
                      setWithdrawForm({ ...withdrawForm, upi: e.target.value.trim() });
                      setUpiValid(null);
                      setUpiError(null);
                      setUpiVerifiedName(null);
                    }}
                    onBlur={handleUpiBlur}
                    className={cn(
                      "h-12 bg-secondary/50 rounded-xl pr-10",
                      upiValid === false && "border-red-500 focus-visible:ring-red-500",
                      upiValid === true && "border-emerald-500 focus-visible:ring-emerald-500"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {upiValidating && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
                    {!upiValidating && upiValid === true && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {!upiValidating && upiValid === false && <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
                {upiValid === false && upiError && (
                  <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                    <XCircle className="w-3 h-3 shrink-0" />
                    {upiError}
                  </p>
                )}
                {upiValid === true && upiVerifiedName && (
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    Verified: {upiVerifiedName}
                  </p>
                )}
                {upiValid === true && !upiVerifiedName && (
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    UPI ID verified
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Withdraw Amount (Min ₹500)</Label>
                <Input
                  placeholder="e.g. 500"
                  type="number"
                  min="500"
                  step="1"
                  value={withdrawForm.amount}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, amount: e.target.value })
                  }
                  className="h-12 bg-secondary/50 rounded-xl"
                />
                {dashboard.available_balance < 500 && (
                  <p className="text-xs text-blue-400">
                    Minimum ₹500 balance required to withdraw
                  </p>
                )}
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={
                  withdrawLoading ||
                  upiValidating ||
                  upiValid === false ||
                  !withdrawForm.upi ||
                  !withdrawForm.amount ||
                  parseFloat(withdrawForm.amount) < 500 ||
                  parseFloat(withdrawForm.amount) > dashboard.available_balance ||
                  dashboard.available_balance < 500
                }
                className="w-full h-14 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-50"
              >
                {withdrawLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : upiValidating ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Verifying UPI...</span>
                ) : (
                  "Withdraw Amount"
                )}
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
                    <p className="font-bold">
                      ₹{dashboard.pending_withdrawal_amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Withdrawal Request
                    </p>
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
                  <Card
                    key={booking.booking_id}
                    className="p-4 bg-card border-amber-500/20 rounded-2xl space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm">{booking.property_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Guest: {booking.guest_name}
                        </p>
                      </div>
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full font-bold">
                        In-Process
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatDateShort(booking.checkin_datetime)} →{" "}
                        {formatDateShort(booking.checkout_datetime)}
                      </span>
                      <span className="text-amber-400 font-bold">
                        +₹{booking.referrer_commission.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-4">
            {historyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No history yet</p>
              </div>
            ) : (
              historyItems.map((item, i) => (
                <Card key={i} className="p-4 bg-card border-border/50 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        item.type === "booking_success"
                          ? "bg-emerald-500/10"
                          : item.type === "withdrawal_paid"
                            ? "bg-blue-500/10"
                            : "bg-red-500/10"
                      )}
                    >
                      {item.type === "booking_success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : item.type === "withdrawal_paid" ? (
                        <Wallet className="w-4 h-4 text-blue-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.message}</p>
                      {item.property_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.property_name}
                          {item.guest_name ? ` · ${item.guest_name}` : ""}
                        </p>
                      )}
                      {item.upi_id && (
                        <p className="text-xs text-muted-foreground">
                          UPI: {item.upi_id}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(item.date)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold flex-shrink-0",
                        item.type === "booking_success" || item.type === "withdrawal_paid"
                          ? "text-emerald-400"
                          : "text-red-400"
                      )}
                    >
                      {item.type === "booking_success"
                        ? `+₹${item.amount.toLocaleString("en-IN")}`
                        : item.type === "withdrawal_paid"
                          ? `-₹${item.amount.toLocaleString("en-IN")}`
                          : `₹${item.amount.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                <p className="text-2xl font-display font-bold text-amber-400">
                  {dashboard.total_referrals}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
              </Card>
              <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                <p className="text-2xl font-display font-bold text-emerald-400">
                  ₹{dashboard.total_earnings.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
              </Card>
              <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                <p className="text-2xl font-display font-bold text-blue-400">
                  ₹{dashboard.total_withdrawals.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Withdrawn</p>
              </Card>
              <Card className="p-4 bg-card border-border/50 rounded-2xl text-center">
                <p className="text-2xl font-display font-bold text-amber-400">
                  ₹{inProcessAmount.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">In-Process</p>
              </Card>
            </div>
            <Card className="p-4 bg-card border-border/50 rounded-2xl">
              <p className="text-xs text-muted-foreground mb-1">Commission Rate</p>
              <p className="font-bold">{dashboard.commission_label}</p>
            </Card>
          </TabsContent>

          <TabsContent value="share" className="mt-6 space-y-4">
            {shareData ? (
              <>
                <Card className="p-4 bg-card border-border/50 rounded-2xl space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Referral Code</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg tracking-widest text-amber-400">
                        {shareData.referralCode}
                      </p>
                      <button
                        onClick={() => handleCopy(shareData.referralCode, "Code")}
                        className="text-muted-foreground hover:text-white transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Referral Link</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white/70 truncate flex-1">
                        {shareData.referralLink}
                      </p>
                      <button
                        onClick={() => handleCopy(shareData.referralLink, "Link")}
                        className="text-muted-foreground hover:text-white transition-colors flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>

                {shareData.referralQrCode && (
                  <Card className="p-4 bg-card border-border/50 rounded-2xl flex flex-col items-center gap-4">
                    <img
                      src={shareData.referralQrCode}
                      alt="Referral QR Code"
                      className="w-48 h-48 rounded-xl"
                    />
                    <div className="flex gap-3 w-full">
                      <Button
                        onClick={handleDownloadQR}
                        variant="outline"
                        className="flex-1 rounded-xl gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download QR
                      </Button>
                      <Button
                        onClick={handleWhatsAppShare}
                        className="flex-1 rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Share2 className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReferralDashboard;
