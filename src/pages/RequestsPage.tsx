import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminPaths } from "@/lib/adminPaths";
import { 
  ChevronLeft, 
  Clock, 
  History, 
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  AlertTriangle,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

interface RefundRequest {
  booking_id: string;
  guest_name: string;
  guest_phone: string;
  property_name: string;
  advance_amount: number;
  refund_status: string | null;
  created_at: string;
  updated_at: string;
}

interface WithdrawalRequest {
  id: number;
  username: string;
  referral_otp_number: string;
  referral_code: string;
  amount: number;
  upi_id: string | null;
  created_at: string;
}

interface HistoryItem {
  id: string;
  type: "Refund" | "Withdrawal";
  user: string;
  property?: string;
  amount: number;
  date: string;
  status: string;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmStyle: "green" | "red";
  onConfirm: () => void;
}

const DIALOG_CLOSED: ConfirmDialogState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  confirmStyle: "green",
  onConfirm: () => {},
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const RequestsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("withdrawals");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ConfirmDialogState>(DIALOG_CLOSED);

  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawalRequest[]>([]);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [refundRes, withdrawRes, historyRes] = await Promise.all([
        fetch("/api/payments/refund/requests", { headers: getAuthHeaders() }),
        fetch("/api/payments/withdrawal/requests", { headers: getAuthHeaders() }),
        fetch("/api/payments/requests/history", { headers: getAuthHeaders() }),
      ]);

      if (refundRes.status === 401 || withdrawRes.status === 401 || historyRes.status === 401) {
        toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
        navigate(adminPaths.login);
        return;
      }

      if (refundRes.ok) {
        const data = await refundRes.json();
        setRefundRequests(data.refund_requests || []);
      }
      if (withdrawRes.ok) {
        const data = await withdrawRes.json();
        setWithdrawRequests(data.withdrawal_requests || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistoryData(data.history || []);
      }
    } catch (error) {
      console.error("Error fetching requests data:", error);
      toast({ title: "Error", description: "Failed to load requests data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const openDialog = (config: Omit<ConfirmDialogState, "open">) => {
    setDialog({ ...config, open: true });
  };

  const closeDialog = () => setDialog(DIALOG_CLOSED);

  const handleProcessRefund = (req: RefundRequest) => {
    openDialog({
      title: "Process Refund",
      message: `Initiate a Paytm refund of ₹${req.advance_amount} to ${req.guest_name} (${req.guest_phone}) for booking ${req.booking_id}?\n\nThis action will trigger an immediate Paytm refund and cannot be undone.`,
      confirmLabel: "Yes, Process Refund",
      confirmStyle: "green",
      onConfirm: async () => {
        closeDialog();
        setActionLoading(`refund-${req.booking_id}`);
        try {
          const res = await fetch("/api/payments/refund/initiate", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ booking_id: req.booking_id }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast({ title: "Refund Initiated", description: `Refund of ₹${data.amount} initiated. ID: ${data.refund_id}` });
            fetchAllData();
          } else {
            toast({ title: "Refund Failed", description: data.error || data.details || "Failed to process refund", variant: "destructive" });
          }
        } catch {
          toast({ title: "Error", description: "Network error processing refund", variant: "destructive" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDenyRefund = (req: RefundRequest) => {
    openDialog({
      title: "Deny Refund",
      message: `Are you sure you want to deny the refund for ${req.guest_name}'s booking (${req.booking_id})?\n\nThe customer will NOT receive a refund. This action cannot be undone.`,
      confirmLabel: "Yes, Deny Refund",
      confirmStyle: "red",
      onConfirm: async () => {
        closeDialog();
        setActionLoading(`deny-${req.booking_id}`);
        try {
          const res = await fetch("/api/payments/refund/deny", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ booking_id: req.booking_id }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast({ title: "Refund Denied", description: "The refund request has been denied." });
            fetchAllData();
          } else {
            toast({ title: "Error", description: data.error || "Failed to deny refund", variant: "destructive" });
          }
        } catch {
          toast({ title: "Error", description: "Network error denying refund", variant: "destructive" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleApproveWithdrawal = (req: WithdrawalRequest) => {
    openDialog({
      title: "Approve Withdrawal",
      message: `Approve withdrawal of ₹${req.amount} for ${req.username}${req.upi_id ? ` to UPI ${req.upi_id}` : ""}?\n\nThis will mark the withdrawal as completed and notify the partner.`,
      confirmLabel: "Yes, Approve",
      confirmStyle: "green",
      onConfirm: async () => {
        closeDialog();
        setActionLoading(`approve-${req.id}`);
        try {
          const res = await fetch("/api/payments/withdrawal/process", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ transaction_id: req.id }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast({ title: "Withdrawal Approved", description: "The withdrawal has been marked as completed." });
            fetchAllData();
          } else {
            toast({ title: "Error", description: data.error || "Failed to approve withdrawal", variant: "destructive" });
          }
        } catch {
          toast({ title: "Error", description: "Network error approving withdrawal", variant: "destructive" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleRejectWithdrawal = (req: WithdrawalRequest) => {
    openDialog({
      title: "Reject Withdrawal",
      message: `Are you sure you want to reject the withdrawal request of ₹${req.amount} from ${req.username}?\n\nThe partner will be notified that their request was rejected.`,
      confirmLabel: "Yes, Reject",
      confirmStyle: "red",
      onConfirm: async () => {
        closeDialog();
        setActionLoading(`reject-${req.id}`);
        try {
          const res = await fetch("/api/payments/withdrawal/reject", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ transaction_id: req.id }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast({ title: "Withdrawal Rejected", description: "The withdrawal request has been rejected." });
            fetchAllData();
          } else {
            toast({ title: "Error", description: data.error || "Failed to reject withdrawal", variant: "destructive" });
          }
        } catch {
          toast({ title: "Error", description: "Network error rejecting withdrawal", variant: "destructive" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-charcoal text-white pb-20">
      <Helmet>
        <title>Requests Management - Admin</title>
      </Helmet>

      {dialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
        >
          <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  dialog.confirmStyle === "red" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
                )}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-white">{dialog.title}</h3>
              </div>
              <button
                onClick={closeDialog}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {dialog.message.split("\n\n").map((para, i) => (
                <p key={i} className={cn("text-sm leading-relaxed", i === 0 ? "text-white/80" : "text-white/50 mt-2 text-xs")}>
                  {para}
                </p>
              ))}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white h-10 text-sm"
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button
                className={cn(
                  "flex-1 rounded-xl h-10 text-sm font-bold text-white",
                  dialog.confirmStyle === "red"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                )}
                onClick={dialog.onConfirm}
              >
                {dialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(adminPaths.dashboard)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-gold/20 hover:text-gold transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-display text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold" />
            Requests Center
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-6 pt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-gold mb-4" />
            <p className="text-white/50">Loading requests...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/5 p-1 rounded-2xl w-full border border-white/10 grid grid-cols-3">
              <TabsTrigger value="withdrawals" className="rounded-xl flex items-center gap-2 py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all">
                Withdrawals
                {withdrawRequests.length > 0 && (
                  <Badge className="bg-red-500 text-white border-none h-5 px-1.5 text-[10px]">
                    {withdrawRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="refunds" className="rounded-xl flex items-center gap-2 py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all">
                Refunds
                {refundRequests.length > 0 && (
                  <Badge className="bg-red-500 text-white border-none h-5 px-1.5 text-[10px]">
                    {refundRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl flex items-center gap-2 py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="withdrawals" className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {withdrawRequests.length > 0 ? (
                withdrawRequests.map((req) => (
                  <Card key={req.id} className="p-5 bg-white/5 border-white/10 rounded-2xl hover:border-gold/30 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg">{req.username}</h3>
                        <p className="text-xs text-white/50">{formatDate(req.created_at)}</p>
                        <p className="text-xs text-white/40">Code: {req.referral_code}</p>
                        {req.upi_id && <p className="text-xs text-white/40">UPI: {req.upi_id}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-2xl font-bold text-gold">₹{req.amount}</span>
                          <Badge variant="outline" className="border-gold/20 text-gold bg-gold/5 uppercase text-[9px] tracking-widest">Withdrawal</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-4 text-xs font-bold"
                          onClick={() => handleApproveWithdrawal(req)}
                          disabled={actionLoading === `approve-${req.id}`}
                        >
                          {actionLoading === `approve-${req.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-red-400 hover:bg-red-500/10 h-9 rounded-xl text-xs"
                          onClick={() => handleRejectWithdrawal(req)}
                          disabled={actionLoading === `reject-${req.id}`}
                        >
                          {actionLoading === `reject-${req.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState icon={Clock} title="No Pending Withdrawals" />
              )}
            </TabsContent>

            <TabsContent value="refunds" className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {refundRequests.length > 0 ? (
                refundRequests.map((req) => (
                  <Card key={req.booking_id} className="p-5 bg-white/5 border-white/10 rounded-2xl hover:border-gold/30 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg">{req.property_name}</h3>
                        <p className="text-xs text-white/50">{formatDate(req.updated_at)}</p>
                        <p className="text-xs text-white/40">Guest: {req.guest_name} ({req.guest_phone})</p>
                        <p className="text-xs text-white/40">ID: {req.booking_id}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-2xl font-bold text-gold">₹{req.advance_amount}</span>
                          <Badge variant="outline" className="border-amber-500/20 text-amber-500 bg-amber-500/5 uppercase text-[9px] tracking-widest">Refund</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-4 text-xs font-bold"
                          onClick={() => handleProcessRefund(req)}
                          disabled={actionLoading === `refund-${req.booking_id}`}
                        >
                          {actionLoading === `refund-${req.booking_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Process Refund"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-red-400 hover:bg-red-500/10 h-9 rounded-xl text-xs"
                          onClick={() => handleDenyRefund(req)}
                          disabled={actionLoading === `deny-${req.booking_id}`}
                        >
                          {actionLoading === `deny-${req.booking_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deny"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState icon={Clock} title="No Pending Refunds" />
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {historyData.length > 0 ? (
                historyData.map((item) => (
                  <Card key={item.id} className="p-4 bg-white/5 border-white/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        item.type === "Withdrawal" 
                          ? (item.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")
                          : (item.status === "refunded" ? "bg-emerald-500/10 text-emerald-500" : item.status === "processing" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500")
                      )}>
                        {item.type === "Withdrawal" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{item.user}</h4>
                        <p className="text-[10px] text-white/40">
                          {formatDate(item.date)} {item.type === "Refund" && item.property ? `• ${item.property}` : ""} • {item.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        (item.status === "paid" || item.status === "refunded") ? "text-emerald-500" : item.status === "processing" ? "text-amber-500" : "text-red-500"
                      )}>
                        ₹{item.amount}
                      </p>
                      <Badge variant="outline" className={cn(
                        "text-[9px] h-5",
                        item.status === "denied" || item.status === "rejected" 
                          ? "border-red-500/20 text-red-400"
                          : item.status === "processing"
                          ? "border-amber-500/20 text-amber-400"
                          : "border-white/10 text-white/40"
                      )}>
                        {item.status === "refunded" ? "REFUNDED" : item.status === "paid" ? "PAID" : item.status === "denied" ? "DENIED" : item.status === "processing" ? "PROCESSING" : "REJECTED"}
                      </Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState icon={History} title="No History Yet" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10 text-white/30">
    <Icon className="w-16 h-16 mb-4 opacity-20" />
    <h3 className="font-display text-lg font-bold">{title}</h3>
    <p className="text-sm">Everything is up to date.</p>
  </div>
);

export default RequestsPage;
