import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminPaths } from "@/lib/adminPaths";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Home,
  Building2,
  Calendar,
  Plus,
  Loader2,
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Star,
  ArrowRight,
  Sparkles,
  Eye,
  Edit3,
  Trash2,
  ChevronRight,
  DollarSign,
  MessageSquare,
  Phone,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Users2,
  Share2,
  CreditCard,
  User,
  History,
  ArrowUpRight,
  Filter,
  ArrowDownLeft,
  Copy,
  Handshake,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import AdminPropertyForm from "@/components/AdminPropertyForm";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [categorySettings, setCategorySettings] = useState<any[]>([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("properties");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("");
  const [referralSubTab, setReferralSubTab] = useState("all");
  const [transactionSubTab, setTransactionSubTab] = useState("bookings");
  const [referralUsers, setReferralUsers] = useState<any[]>([]);
  const [isReferralLoading, setIsReferralLoading] = useState(false);
  const [b2bSubTab, setB2bSubTab] = useState("b2b");
  const [b2bForm, setB2bForm] = useState({
    username: "",
    mobile: "",
    code: "",
  });
  const [ownerRefForm, setOwnerRefForm] = useState({
    username: "",
    mobile: "",
    code: "",
    propertyId: "",
  });
  const [b2bCreating, setB2bCreating] = useState(false);
  const [ownerRefCreating, setOwnerRefCreating] = useState(false);
  const [ownerB2bForm, setOwnerB2bForm] = useState({
    ownerCode: "",
    username: "",
    mobile: "",
    code: "",
  });
  const [ownerB2bCreating, setOwnerB2bCreating] = useState(false);
  const [ownerCodeVerified, setOwnerCodeVerified] = useState(false);
  const [verifiedOwnerName, setVerifiedOwnerName] = useState("");
  const [ownerCodeVerifying, setOwnerCodeVerifying] = useState(false);
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [txBookings, setTxBookings] = useState<any[]>([]);
  const [txRefunds, setTxRefunds] = useState<any[]>([]);
  const [txWithdrawals, setTxWithdrawals] = useState<any[]>([]);
  const [txCancelled, setTxCancelled] = useState<any[]>([]);
  const [txFilterMonth, setTxFilterMonth] = useState("all");
  const [txFilterYear, setTxFilterYear] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const [referralActionConfirm, setReferralActionConfirm] = useState<{
    open: boolean;
    id: number | null;
    name: string;
    action: "blocked" | "active" | null;
  }>({
    open: false,
    id: null,
    name: "",
    action: null,
  });

  const [deletePropertyConfirm, setDeletePropertyConfirm] = useState<{
    open: boolean;
    propertyId: number | null;
    propertyName: string;
  }>({
    open: false,
    propertyId: null,
    propertyName: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchReferralUsers = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    setIsReferralLoading(true);
    try {
      const response = await fetch("/api/referrals/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      const result = await response.json();
      setReferralUsers(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Fetch referrals error:", error);
      setReferralUsers([]);
    } finally {
      setIsReferralLoading(false);
    }
  };

  const fetchBookings = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    setIsBookingsLoading(true);
    try {
      const response = await fetch("/api/payments/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      const result = await response.json();
      setTxBookings(Array.isArray(result.bookings) ? result.bookings : []);
      setTxRefunds(Array.isArray(result.refunds) ? result.refunds : []);
      setTxWithdrawals(
        Array.isArray(result.withdrawals) ? result.withdrawals : [],
      );
      setTxCancelled(Array.isArray(result.cancelled) ? result.cancelled : []);
      setBookingsData(Array.isArray(result.bookings) ? result.bookings : []);
    } catch (error) {
      console.error("Fetch transactions error:", error);
      setTxBookings([]);
      setTxRefunds([]);
      setTxWithdrawals([]);
      setTxCancelled([]);
    } finally {
      setIsBookingsLoading(false);
    }
  };

  const handleCheckRefundStatus = async (bookingId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token || !bookingId) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/payments/refund/status/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.updated) {
        toast({
          title: "Refund status updated",
          description: `Status: ${data.status?.replace(/_/g, " ")}`,
        });
        await fetchBookings();
        setSelectedTx((prev: any) =>
          prev ? { ...prev, refund_status: data.status } : prev,
        );
      } else {
        toast({
          title: "No change",
          description: `Current status: ${data.status?.replace(/_/g, " ")}`,
        });
      }
    } catch {
      toast({ title: "Failed to check refund status", variant: "destructive" });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCheckWithdrawalStatus = async (id: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token || !id) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/payments/withdrawal/status/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.updated) {
        toast({
          title: "Withdrawal status updated",
          description: `Status: ${data.status?.toUpperCase()}`,
        });
        await fetchBookings();
        setSelectedTx((prev: any) =>
          prev
            ? {
                ...prev,
                status: data.status,
                payout_status: data.payout_status,
              }
            : prev,
        );
      } else {
        toast({
          title: "No change",
          description: `Current status: ${data.status?.toUpperCase()}`,
        });
      }
    } catch {
      toast({
        title: "Failed to check withdrawal status",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchData = async (token: string) => {
    try {
      const [propRes, settingsRes] = await Promise.all([
        fetch("/api/properties/list", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/properties/settings/categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (propRes.status === 401 || settingsRes.status === 401) {
        handleLogout();
        return;
      }

      const propResult = await propRes.json();
      const settingsResult = await settingsRes.json();

      if (propResult.success) {
        setProperties(propResult.data || []);
      }
      if (settingsResult.success) {
        setCategorySettings(settingsResult.data || []);
      }

      // Also fetch referral users
      fetchReferralUsers();
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleCreateAdminReferral = async (type: "b2b" | "owner") => {
    const token = localStorage.getItem("adminToken");
    const form = type === "b2b" ? b2bForm : ownerRefForm;
    const setCreating = type === "b2b" ? setB2bCreating : setOwnerRefCreating;

    if (!form.username || !form.mobile || !form.code) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    if (form.mobile.length !== 10) {
      toast({
        title: "Enter valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }
    if (!/[A-Z]/.test(form.code) || !/[0-9]/.test(form.code)) {
      toast({
        title: "Referral code must contain both letters and numbers",
        variant: "destructive",
      });
      return;
    }
    if (type === "owner" && !(form as any).propertyId) {
      toast({ title: "Please enter Property ID", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/referrals/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: form.username,
          referral_otp_number: form.mobile,
          referral_code: form.code,
          referral_type: type,
          property_id: type === "owner" ? (form as any).propertyId : undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: `${type === "b2b" ? "B2B" : "Owner"} referral code created!`,
        });
        if (type === "b2b") {
          setB2bForm({ username: "", mobile: "", code: "" });
        } else {
          setOwnerRefForm({
            username: "",
            mobile: "",
            code: "",
            propertyId: "",
          });
        }
        await fetchReferralUsers();
        if (type === "owner") {
          setActiveTab("owners");
        }
      } else {
        toast({
          title: result.error || "Failed to create code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to create referral code",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleVerifyOwnerCode = async () => {
    const token = localStorage.getItem("adminToken");
    if (!ownerB2bForm.ownerCode) {
      toast({
        title: "Please enter an owner referral code",
        variant: "destructive",
      });
      return;
    }
    setOwnerCodeVerifying(true);
    try {
      const response = await fetch("/api/referrals/admin/verify-owner-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: ownerB2bForm.ownerCode }),
      });
      const result = await response.json();
      if (result.valid) {
        setOwnerCodeVerified(true);
        setVerifiedOwnerName(result.owner_name || "");
        toast({ title: "Owner code verified!" });
      } else {
        setOwnerCodeVerified(false);
        setVerifiedOwnerName("");
        toast({
          title: result.error || "Invalid owner referral code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Verification failed", variant: "destructive" });
    } finally {
      setOwnerCodeVerifying(false);
    }
  };

  const handleCreateOwnerB2BReferral = async () => {
    const token = localStorage.getItem("adminToken");
    if (!ownerB2bForm.username || !ownerB2bForm.mobile || !ownerB2bForm.code) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    if (ownerB2bForm.mobile.length !== 10) {
      toast({
        title: "Enter valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }
    if (!/[A-Z]/.test(ownerB2bForm.code) || !/[0-9]/.test(ownerB2bForm.code)) {
      toast({
        title: "Referral code must contain both letters and numbers",
        variant: "destructive",
      });
      return;
    }
    if (!ownerCodeVerified) {
      toast({
        title: "Please verify the owner referral code first",
        variant: "destructive",
      });
      return;
    }
    setOwnerB2bCreating(true);
    try {
      const response = await fetch("/api/referrals/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: ownerB2bForm.username,
          referral_otp_number: ownerB2bForm.mobile,
          referral_code: ownerB2bForm.code,
          referral_type: "owners_b2b",
          owner_referral_code: ownerB2bForm.ownerCode,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Owners B2B code created!" });
        setOwnerB2bForm({ ownerCode: "", username: "", mobile: "", code: "" });
        setOwnerCodeVerified(false);
        setVerifiedOwnerName("");
        await fetchReferralUsers();
      } else {
        toast({
          title: result.error || "Failed to create code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to create referral code",
        variant: "destructive",
      });
    } finally {
      setOwnerB2bCreating(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    referralId: number | null;
    username: string;
  }>({ open: false, referralId: null, username: "" });

  const handleDeleteReferral = async (userId: number) => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch("/api/referrals/admin/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Referral deleted successfully" });
        fetchReferralUsers();
      } else {
        toast({
          title: result.error || "Failed to delete",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Failed to delete referral", variant: "destructive" });
    }
    setDeleteConfirm({ open: false, referralId: null, username: "" });
  };

  const handleUpdateReferralStatus = async (userId: number, status: string) => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch("/api/referrals/admin/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, status }),
      });
      const result = await response.json();
      if (result.id) {
        toast({ title: "Status updated successfully" });
        fetchReferralUsers();
      }
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken");
      const adminData = localStorage.getItem("adminUser");

      if (!token || !adminData) {
        navigate(adminPaths.login);
        return;
      }

      setUser(JSON.parse(adminData));
      await fetchData(token);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchBookings();
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    toast({
      title: "Logged out",
      description: "You have been signed out successfully.",
    });
    navigate(adminPaths.login);
  };

  const handleToggleCategory = async (category: string, isClosed: boolean) => {
    let reason = "";
    let closedFrom = "";

    if (!isClosed) {
      const r = window.prompt("Enter Closure Reason:", "Maintenance");
      if (r === null) return;
      reason = r;

      const d = window.prompt(
        "Enter Closure Date/Period (e.g., 10th Jan):",
        "",
      );
      if (d === null) return;
      closedFrom = d;
    }

    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch(
        `/api/properties/settings/categories/${category}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_closed: !isClosed,
            closed_reason: reason,
            closed_from: closedFrom,
            closed_to: closedFrom,
          }),
        },
      );
      const result = await response.json();
      if (result.success) {
        fetchData(token!);
        toast({
          title: `Category ${!isClosed ? "closed" : "opened"} successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to update category status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProperty = async (id: number) => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch(`/api/properties/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Property deleted successfully" });
        fetchData(token!);
      }
    } catch (error) {
      toast({ title: "Error deleting property", variant: "destructive" });
    }
    setDeletePropertyConfirm({
      open: false,
      propertyId: null,
      propertyName: "",
    });
  };

  const handleToggleStatus = async (
    id: number,
    field: string,
    currentValue: boolean,
  ) => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch(`/api/properties/toggle-status/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ field, value: !currentValue }),
      });
      const result = await response.json();
      if (result.success) {
        fetchData(token!);
        toast({ title: "Status updated successfully" });
      }
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const filteredProperties = properties.filter((p) => {
    const matchesCategory =
      activeCategory === "all" ||
      p.category.toLowerCase() === activeCategory.toLowerCase();
    const title = p.title || "";
    const location = p.location || "";
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const campingCottageCount = properties.filter(
    (p) => p.category?.toLowerCase() === "campings_cottages",
  ).length;
  const villaCount = properties.filter(
    (p) => p.category?.toLowerCase() === "villa",
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <Loader2 className="w-12 h-12 animate-spin text-gold" />
      </div>
    );
  }

  if (showPropertyForm) {
    return (
      <AdminPropertyForm
        property={editingProperty}
        onSuccess={() => {
          setShowPropertyForm(false);
          setEditingProperty(null);
          fetchData(localStorage.getItem("adminToken")!);
        }}
        onCancel={() => {
          setShowPropertyForm(false);
          setEditingProperty(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-foreground pb-24">
      {/* Header (KEEP AS IS) */}
      <header className="glass-dark border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold shrink-0">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
            </div>
            <h1 className="font-display text-sm sm:text-xl font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
              PawnaHaven Admin
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10 text-gold hover:text-gold-light hover:bg-gold/10"
                  onClick={() => navigate(adminPaths.contacts)}
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Contacts</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10 text-gold hover:text-gold-light hover:bg-gold/10"
                  onClick={() => navigate(adminPaths.revenue)}
                >
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Revenue Dashboard</p>
              </TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              title="Logout"
              size="sm"
              onClick={() => setLogoutConfirm(true)}
              className="rounded-xl h-8 sm:h-10 text-[10px] sm:text-sm px-2 sm:px-4 border-gold/30 text-gold hover:bg-gold hover:text-black"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden xs:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Top Summary Boxes (Only show for Properties tab) */}
        {activeTab === "properties" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="glass-dark rounded-2xl border border-white/5 p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gold/10 text-gold">
                  <Building2 className="w-4 h-4" />
                </div>
                <p className="text-[10px] xs:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Total
                </p>
              </div>
              <p className="text-xl xs:text-2xl font-bold text-foreground">
                {properties.length}
              </p>
            </div>

            {categorySettings.map((setting) => {
              const count =
                setting.category === "campings_cottages"
                  ? campingCottageCount
                  : villaCount;
              return (
                <div
                  key={setting.category}
                  className={cn(
                    "glass-dark rounded-2xl border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden",
                    setting.is_closed && "opacity-50 grayscale",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gold/10 text-gold">
                        {setting.category === "campings_cottages" ? (
                          <Home className="w-4 h-4" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                      </div>
                      <p className="text-[10px] xs:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate max-w-[120px]">
                        {setting.category === "campings_cottages"
                          ? "Campings_Cottages"
                          : "Villa"}
                      </p>
                    </div>
                    <Badge
                      variant={setting.is_closed ? "destructive" : "outline"}
                      className="text-[8px] h-4 px-1 border-gold/20 text-gold"
                    >
                      {count}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xl xs:text-2xl font-bold text-foreground">
                      {count}
                    </p>
                    <button
                      onClick={() =>
                        handleToggleCategory(
                          setting.category,
                          setting.is_closed,
                        )
                      }
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        setting.is_closed
                          ? "bg-red-500/20 text-red-500"
                          : "bg-emerald-500/20 text-emerald-500",
                      )}
                    >
                      {setting.is_closed ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "properties" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                  <div className="w-1.5 h-6 bg-gold rounded-full" />
                  Properties Management
                </h3>
                <Button
                  onClick={() => setShowPropertyForm(true)}
                  className="rounded-xl bg-gradient-gold text-black hover:opacity-90 transition-all font-semibold h-9 px-4"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 focus:border-gold/50 transition-all text-sm"
                  />
                </div>
                <Tabs
                  value={activeCategory}
                  onValueChange={setActiveCategory}
                  className="w-full"
                >
                  <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5">
                    {["all", "campings_cottages", "villa"].map((cat) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        className="rounded-lg flex-1 text-[10px] xs:text-xs capitalize data-[state=active]:bg-gold data-[state=active]:text-black"
                      >
                        {cat === "campings_cottages"
                          ? "Campings_Cottages"
                          : cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredProperties.map((property) => (
                <Dialog key={property.id}>
                  <DialogTrigger asChild>
                    <div className="group glass-dark rounded-2xl border border-white/5 p-3 hover:border-gold/30 transition-all cursor-pointer active:scale-[0.98]">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/5">
                          {property.images?.[0] ? (
                            <img
                              src={
                                property.images[0].image_url ||
                                property.images[0]
                              }
                              alt=""
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Badge
                                variant="outline"
                                className="text-[9px] h-4.5 px-1.5 border-gold/20 text-gold bg-gold/5 font-medium capitalize"
                              >
                                {property.category}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                                <span className="text-[10px] font-bold text-gold">
                                  {property.rating}
                                </span>
                              </div>
                            </div>
                            <h4 className="font-semibold text-foreground truncate text-sm xs:text-base leading-snug">
                              {property.title}
                            </h4>
                            {property.units && property.units.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] mt-1">
                                <span className="text-[#00FF41] font-bold">
                                  {property.units.reduce(
                                    (acc: number, u: any) =>
                                      acc +
                                      (parseInt(u.available_persons) || 0),
                                    0,
                                  )}
                                </span>
                                <span className="text-white/40">/</span>
                                <span className="text-[#FFA500] font-bold">
                                  {property.units.reduce(
                                    (acc: number, u: any) =>
                                      acc + (parseInt(u.total_persons) || 0),
                                    0,
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3 text-gold/60" />
                              <span className="truncate">
                                {property.location}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2">
                            <span className="font-bold text-gold text-sm xs:text-base">
                              ₹{property.price}
                            </span>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  property.is_active
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                    : "bg-red-500",
                                )}
                              />
                              <ChevronRight className="w-4 h-4 text-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl w-[95vw] rounded-3xl bg-charcoal border-white/10 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="sr-only">
                      <DialogTitle>{property.title} Details</DialogTitle>
                      <DialogDescription>
                        View detailed information about {property.title}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="relative aspect-video w-full">
                      {property.images?.[0] ? (
                        <img
                          src={
                            property.images[0].image_url || property.images[0]
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <Building2 className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <Badge className="bg-gold text-black mb-2 hover:bg-gold-light">
                          {property.category}
                        </Badge>
                        <h2 className="text-xl md:text-2xl font-bold font-display text-white">
                          {property.title}
                        </h2>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                            Location
                          </span>
                          <span className="flex items-center gap-1.5 text-white font-medium">
                            <MapPin className="w-3.5 h-3.5 text-gold" />{" "}
                            {property.location}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                            Rating
                          </span>
                          <span className="flex items-center gap-1.5 text-white font-medium">
                            <Star className="w-3.5 h-3.5 text-gold fill-gold" />{" "}
                            {property.rating}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-muted-foreground uppercase block mb-1">
                            Property ID
                          </span>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-mono font-bold text-gold">
                              {property.property_id}
                            </span>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  property.property_id,
                                );
                                toast({ title: "Property ID copied" });
                              }}
                              className="hover:bg-muted"
                              title="Copy Property ID"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-muted-foreground uppercase block mb-1">
                            Price
                          </span>
                          <span className="text-lg font-bold text-gold">
                            ₹{property.price}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Status & Actions
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className={cn(
                              "h-11 rounded-xl text-xs font-bold border-white/10",
                              property.is_active
                                ? "text-emerald-500 bg-emerald-500/10"
                                : "text-red-500 bg-red-500/10",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(
                                property.id,
                                "is_active",
                                property.is_active,
                              );
                            }}
                          >
                            {property.is_active ? (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                            {property.is_active ? "Active" : "Inactive"}
                          </Button>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-11 rounded-xl text-xs font-bold border-white/10",
                              property.is_available
                                ? "text-blue-500 bg-blue-500/10"
                                : "text-orange-500 bg-orange-500/10",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(
                                property.id,
                                "is_available",
                                property.is_available,
                              );
                            }}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            {property.is_available ? "Available" : "Booked"}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 rounded-xl h-11 border-white/10 text-white font-bold"
                            onClick={() => {
                              setEditingProperty(property);
                              setShowPropertyForm(true);
                            }}
                          >
                            <Edit3 className="w-4 h-4 mr-2 text-blue-500" />{" "}
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 rounded-xl h-11 border-white/10 text-red-500 hover:text-white font-bold transition-colors"
                            onClick={() =>
                              setDeletePropertyConfirm({
                                open: true,
                                propertyId: property.id,
                                propertyName: property.title,
                              })
                            }
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        )}

        {activeTab === "owners" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                Owners Directory
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search owners by name..."
                  value={ownerSearchTerm}
                  onChange={(e) => setOwnerSearchTerm(e.target.value)}
                  className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 focus:border-gold/50 transition-all text-sm"
                />
              </div>

              <Tabs
                value={ownerFilter}
                onValueChange={setOwnerFilter}
                className="w-full"
              >
                <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5">
                  {["all", "campings_cottages", "villa"].map((cat) => (
                    <TabsTrigger
                      key={cat}
                      value={cat}
                      className="rounded-lg flex-1 text-[10px] xs:text-xs capitalize data-[state=active]:bg-gold data-[state=active]:text-black"
                    >
                      {cat === "campings_cottages" ? "Campings_Cottages" : cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {Array.from(
                new Set(
                  properties
                    .filter(
                      (p) =>
                        ownerFilter === "all" || p.category === ownerFilter,
                    )
                    .filter((p) =>
                      (p.owner_name || "")
                        .toLowerCase()
                        .includes(ownerSearchTerm.toLowerCase()),
                    )
                    .map((p) => {
                      const mobile =
                        p.owner_otp_number || p.owner_whatsapp_number || "";
                      const name = (p.owner_name || "").toLowerCase().trim();
                      return `${name}||${mobile}`;
                    }),
                ),
              ).map((ownerKey, idx) => {
                const [ownerNameKey, mobile] = ownerKey.split("||");
                const ownerProp = properties.find(
                  (p) =>
                    (p.owner_name || "").toLowerCase().trim() ===
                      ownerNameKey &&
                    (p.owner_otp_number || p.owner_whatsapp_number || "") ===
                      mobile,
                );
                const ownerProperties = properties.filter(
                  (p) =>
                    (p.owner_name || "").toLowerCase().trim() ===
                      ownerNameKey &&
                    (p.owner_otp_number || p.owner_whatsapp_number || "") ===
                      mobile,
                );

                return (
                  <div
                    key={idx}
                    className="glass-dark rounded-2xl border border-white/5 p-4"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate text-base">
                          {ownerProp?.owner_name
                            ?.split(" ")
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(" ") || `Owner ${idx + 1}`}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {mobile || "+91 ---"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-emerald-500 rounded-full h-10 w-10 hover:bg-emerald-500/10 shadow-lg shadow-emerald-500/5"
                          onClick={() =>
                            window.open(
                              `https://wa.me/${mobile?.replace(/\D/g, "")}`,
                            )
                          }
                        >
                          <MessageSquare className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-500 rounded-full h-10 w-10 hover:bg-blue-500/10 shadow-lg shadow-blue-500/5"
                          onClick={() => window.open(`tel:${mobile}`)}
                        >
                          <Phone className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-white/5">
                      {ownerProperties.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 group hover:border-gold/30 transition-colors"
                        >
                          <span className="text-sm text-white font-medium truncate flex-1">
                            {p.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[8px] h-4 px-1.5 border-gold/20 text-gold bg-gold/5 uppercase font-bold shrink-0"
                          >
                            {p.category}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      {(() => {
                        const ownerReferral = referralUsers.find(
                          (r) =>
                            r.referral_otp_number === mobile &&
                            r.type === "owner",
                        );
                        if (ownerReferral) {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-[10px] border-gold/30 text-gold hover:bg-gold/10 rounded-xl"
                              onClick={async () => {
                                try {
                                  const adminToken =
                                    localStorage.getItem("adminToken");
                                  if (!adminToken) return;
                                  const res = await fetch(
                                    "/api/referrals/admin/login-as",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${adminToken}`,
                                      },
                                      body: JSON.stringify({ mobile }),
                                    },
                                  );
                                  const data = await res.json();
                                  if (data.success && data.token) {
                                    window.open(
                                      `https://referraldashboard.shop/dashboard?admin_token=${encodeURIComponent(data.token)}`,
                                      "_blank",
                                    );
                                  }
                                } catch (e) {
                                  console.error("Admin login-as failed", e);
                                }
                              }}
                            >
                              <Share2 className="w-3 h-3 mr-1" />
                              Referral Dashboard ({ownerReferral.referral_code})
                            </Button>
                          );
                        }
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-[10px] border-primary/30 text-primary hover:bg-primary/10 rounded-xl"
                            onClick={() => {
                              setActiveTab("b2b");
                              setB2bSubTab("owners");
                              setOwnerRefForm({
                                username: ownerProp?.owner_name || "",
                                mobile: mobile || "",
                                code: "",
                                propertyId:
                                  ownerProperties[0]?.property_id || "",
                              });
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Generate Referral
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "referrals" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                Referrals Program
              </h3>
            </div>

            <Tabs
              value={referralSubTab}
              onValueChange={setReferralSubTab}
              className="w-full"
            >
              <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5 flex flex-wrap gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "owners", label: "Owners" },
                  { id: "b2b", label: "B2B" },
                  { id: "public", label: "Public" },
                  { id: "owners_b2b", label: "Owners B2B" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-lg flex-1 text-[10px] data-[state=active]:bg-gold data-[state=active]:text-black"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {(["all", "owners", "b2b", "public", "owners_b2b"].includes(referralSubTab)) && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search user ID or name..."
                    className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {isReferralLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-gold" />
                    </div>
                  ) : referralUsers.length === 0 ? (
                    <div className="text-center p-8 glass-dark rounded-2xl border border-white/5">
                      <p className="text-muted-foreground">
                        No referral users found
                      </p>
                    </div>
                  ) : (
                    referralUsers
                      .filter((u) => {
                        const matchesSearch =
                          (u.username || "")
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (u.referral_otp_number || "").includes(searchTerm) ||
                          (u.referral_code || "")
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase());

                        if (
                          referralSubTab === "all" ||
                          referralSubTab === "all referrals"
                        )
                          return matchesSearch;
                        const typeMap: Record<string, string> = {
                          owners: "owner",
                          "owners referrals": "owner",
                          b2b: "b2b",
                          "b2b referrals": "b2b",
                          public: "public",
                          "public referrals": "public",
                          owners_b2b: "owners_b2b",
                        };
                        const targetType =
                          typeMap[referralSubTab.toLowerCase()];
                        return matchesSearch && u.type === targetType;
                      })
                      .map((referral) => (
                        <div
                          key={referral.id}
                          className="glass-dark rounded-2xl border border-white/5 p-4 hover:border-gold/30 transition-all"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                                <Users2 className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">
                                  {referral.username
                                    ?.split(" ")
                                    .map(
                                      (word) =>
                                        word.charAt(0).toUpperCase() +
                                        word.slice(1),
                                    )
                                    .join(" ")}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {referral.referral_otp_number}
                                </p>
                                {referral.type === "owners_b2b" &&
                                  referral.parent_owner_name && (
                                    <p className="text-[10px] text-amber-400 mt-0.5">
                                      Owner: {referral.parent_owner_name}
                                    </p>
                                  )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                referral.status === "active"
                                  ? "outline"
                                  : "destructive"
                              }
                              className={cn(
                                "text-[10px] uppercase tracking-wider",
                                referral.status === "active"
                                  ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/5"
                                  : "",
                              )}
                            >
                              {referral.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                              <p className="text-[8px] text-muted-foreground uppercase mb-0.5">
                                Code
                              </p>
                              <p className="text-xs font-bold text-gold">
                                {referral.referral_code}
                              </p>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                              <p className="text-[8px] text-muted-foreground uppercase mb-0.5">
                                Balance
                              </p>
                              <p className="text-xs font-bold text-white">
                                ₹
                                {parseFloat(
                                  referral.balance || "0",
                                ).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                              <p className="text-[8px] text-muted-foreground uppercase mb-0.5">
                                Referrals
                              </p>
                              <p className="text-xs font-bold text-white">
                                {referral.total_referrals || 0}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/5 space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-9 text-xs border-gold/30 text-gold hover:bg-gold/10 rounded-xl"
                              onClick={async () => {
                                try {
                                  const adminToken =
                                    localStorage.getItem("adminToken");
                                  if (!adminToken) return;
                                  const res = await fetch(
                                    "/api/referrals/admin/login-as",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${adminToken}`,
                                      },
                                      body: JSON.stringify({
                                        mobile: referral.referral_otp_number,
                                      }),
                                    },
                                  );
                                  const data = await res.json();
                                  if (data.success && data.token) {
                                    window.open(
                                      `https://referraldashboard.shop/dashboard?admin_token=${encodeURIComponent(data.token)}`,
                                      "_blank",
                                    );
                                  }
                                } catch (e) {
                                  console.error("Admin login-as failed", e);
                                }
                              }}
                            >
                              <Share2 className="w-3 h-3 mr-1" />
                              Referral Dashboard ({referral.referral_code})
                            </Button>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-muted-foreground">
                                Joined{" "}
                                {new Date(
                                  referral.created_at,
                                ).toLocaleDateString()}
                              </p>
                              <div className="flex gap-2">
                                {referral.status === "active" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() =>
                                      setReferralActionConfirm({
                                        open: true,
                                        id: referral.id,
                                        name: referral.referral_code,
                                        action: "blocked",
                                      })
                                    }
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Block
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                    onClick={() =>
                                      setReferralActionConfirm({
                                        open: true,
                                        id: referral.id,
                                        name: referral.referral_code,
                                        action: "active",
                                      })
                                    }
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Activate
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      open: true,
                                      referralId: referral.id,
                                      username: referral.username,
                                    })
                                  }
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}

            {(referralSubTab === "requests" ||
              referralSubTab === "history") && (
              <div className="space-y-3">
                <div className="p-8 text-center glass-dark rounded-3xl border border-white/5">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 text-white/20">
                    <Share2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-white font-bold mb-1">
                    No Referrals Data
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    No records found for the selected view.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "b2b" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                B2B Management
              </h3>
            </div>

            <Tabs
              value={b2bSubTab}
              onValueChange={setB2bSubTab}
              className="w-full"
            >
              <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5 grid grid-cols-3">
                <TabsTrigger
                  value="b2b"
                  className="rounded-lg text-[10px] py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all"
                >
                  Generate B2B
                </TabsTrigger>
                <TabsTrigger
                  value="owners"
                  className="rounded-lg text-[10px] py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all"
                >
                  Generate Owner
                </TabsTrigger>
                <TabsTrigger
                  value="owners_b2b"
                  className="rounded-lg text-[10px] py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all"
                >
                  Owners B2B
                </TabsTrigger>
              </TabsList>

              <TabsContent value="b2b" className="mt-6">
                <div className="glass-dark rounded-[2.5rem] border border-white/5 p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center border border-gold/20 text-gold">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">B2B Referral</h4>
                      <p className="text-xs text-muted-foreground">
                        Commission: 22% of advance | Admin: 8%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Partner Name
                      </label>
                      <Input
                        placeholder="Business partner name"
                        value={b2bForm.username}
                        onChange={(e) =>
                          setB2bForm({ ...b2bForm, username: e.target.value })
                        }
                        className="h-11 rounded-xl bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Mobile Number
                      </label>
                      <Input
                        placeholder="10-digit mobile"
                        maxLength={10}
                        value={b2bForm.mobile}
                        onChange={(e) =>
                          setB2bForm({
                            ...b2bForm,
                            mobile: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        className="h-11 rounded-xl bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Referral Code
                      </label>
                      <Input
                        placeholder="e.g. B2BPARTNER1"
                        maxLength={15}
                        value={b2bForm.code}
                        onChange={(e) =>
                          setB2bForm({
                            ...b2bForm,
                            code: e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                              .slice(0, 15),
                          })
                        }
                        className="h-11 rounded-xl bg-white/5 border-white/10 uppercase"
                      />
                    </div>
                    <Button
                      onClick={() => handleCreateAdminReferral("b2b")}
                      disabled={b2bCreating}
                      className="w-full bg-gradient-gold text-black hover:opacity-90 font-bold h-12 rounded-2xl shadow-gold"
                    >
                      {b2bCreating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Generate B2B Code"
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="owners" className="mt-6">
                <div className="glass-dark rounded-[2.5rem] border border-white/5 p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 text-primary">
                      <Users2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">Owner Referral</h4>
                      <p className="text-xs text-muted-foreground">
                        Commission: 25% of advance | Admin: 5%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Property ID
                      </label>
                      <Input
                        placeholder="e.g. 74SQF"
                        value={ownerRefForm.propertyId}
                        onChange={async (e) => {
                          const val = e.target.value
                            .toUpperCase()
                            .replace(/\s/g, "");
                          setOwnerRefForm({ ...ownerRefForm, propertyId: val });
                          if (val.length >= 4) {
                            try {
                              const token = localStorage.getItem("adminToken");
                              const res = await fetch(
                                `/api/referrals/admin/owner-lookup/${val}`,
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                },
                              );
                              const data = await res.json();
                              if (data.success && data.data) {
                                setOwnerRefForm((prev) => ({
                                  ...prev,
                                  propertyId: val,
                                  username:
                                    data.data.owner_name || prev.username,
                                  mobile:
                                    data.data.owner_otp_number || prev.mobile,
                                }));
                              }
                            } catch (e) {}
                          }
                        }}
                        className="h-11 rounded-xl bg-white/5 border-white/10 uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Owner Name
                      </label>
                      <Input
                        placeholder="Property owner name"
                        value={ownerRefForm.username}
                        onChange={(e) =>
                          setOwnerRefForm({
                            ...ownerRefForm,
                            username: e.target.value,
                          })
                        }
                        className="h-11 rounded-xl bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Mobile Number (OTP)
                      </label>
                      <Input
                        placeholder="Auto-fetched from owner registration"
                        maxLength={10}
                        value={ownerRefForm.mobile}
                        onChange={(e) =>
                          setOwnerRefForm({
                            ...ownerRefForm,
                            mobile: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        className="h-11 rounded-xl bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Referral Code
                      </label>
                      <Input
                        placeholder="e.g. OWNPROPERTY1"
                        maxLength={15}
                        value={ownerRefForm.code}
                        onChange={(e) =>
                          setOwnerRefForm({
                            ...ownerRefForm,
                            code: e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                              .slice(0, 15),
                          })
                        }
                        className="h-11 rounded-xl bg-white/5 border-white/10 uppercase"
                      />
                    </div>
                    <Button
                      onClick={() => handleCreateAdminReferral("owner")}
                      disabled={ownerRefCreating}
                      className="w-full bg-primary text-white hover:opacity-90 font-bold h-12 rounded-2xl shadow-lg"
                    >
                      {ownerRefCreating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Generate Owner Code"
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="owners_b2b" className="mt-6">
                <div className="glass-dark rounded-[2.5rem] border border-white/5 p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 text-amber-400">
                      <Users2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">Owners B2B Referral</h4>
                      <p className="text-xs text-muted-foreground">
                        Commission: 22% of advance | Admin: 8%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Step 1: Enter Owner Referral Code
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. OWN-PROPERTY1"
                          value={ownerB2bForm.ownerCode}
                          onChange={(e) => {
                            setOwnerB2bForm({
                              ...ownerB2bForm,
                              ownerCode: e.target.value
                                .toUpperCase()
                                .replace(/\s/g, ""),
                            });
                            setOwnerCodeVerified(false);
                            setVerifiedOwnerName("");
                          }}
                          className="h-11 rounded-xl bg-white/5 border-white/10 uppercase flex-1"
                        />
                        <Button
                          onClick={handleVerifyOwnerCode}
                          disabled={
                            ownerCodeVerifying || !ownerB2bForm.ownerCode
                          }
                          className="h-11 px-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 font-bold"
                          variant="outline"
                        >
                          {ownerCodeVerifying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    </div>

                    {ownerCodeVerified && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Property Owner Name
                          </label>
                          <Input
                            readOnly
                            value={verifiedOwnerName}
                            className="h-11 rounded-xl bg-emerald-500/5 border-emerald-500/30 text-emerald-400 capitalize"
                          />
                        </div>

                        <div className="pt-2 border-t border-white/10">
                          <p className="text-xs text-muted-foreground mb-3">
                            Step 2: Enter B2B Partner Details
                          </p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">
                                B2B Partner Name
                              </label>
                              <Input
                                placeholder="Business partner name"
                                value={ownerB2bForm.username}
                                onChange={(e) =>
                                  setOwnerB2bForm({
                                    ...ownerB2bForm,
                                    username: e.target.value,
                                  })
                                }
                                className="h-11 rounded-xl bg-white/5 border-white/10"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Mobile Number
                              </label>
                              <Input
                                placeholder="10-digit mobile"
                                maxLength={10}
                                value={ownerB2bForm.mobile}
                                onChange={(e) =>
                                  setOwnerB2bForm({
                                    ...ownerB2bForm,
                                    mobile: e.target.value.replace(/\D/g, ""),
                                  })
                                }
                                className="h-11 rounded-xl bg-white/5 border-white/10"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Referral Code
                              </label>
                              <Input
                                placeholder="e.g. OWNB2B-PARTNER1"
                                value={ownerB2bForm.code}
                                maxLength={15}
                                onChange={(e) =>
                                  setOwnerB2bForm({
                                    ...ownerB2bForm,
                                    code: e.target.value
                                      .toUpperCase()
                                      .replace(/[^A-Z0-9]/g, "")
                                      .slice(0, 15),
                                  })
                                }
                                className="h-11 rounded-xl bg-white/5 border-white/10 uppercase"
                              />
                            </div>
                            <Button
                              onClick={handleCreateOwnerB2BReferral}
                              disabled={ownerB2bCreating}
                              className="w-full bg-gradient-gold text-black hover:opacity-90 font-bold h-12 rounded-2xl shadow-gold"
                            >
                              {ownerB2bCreating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                "Generate Owners_B2B Code"
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                Transactions
              </h3>
            </div>
            <Tabs
              value={transactionSubTab}
              onValueChange={setTransactionSubTab}
              className="w-full"
            >
              <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5">
                {["bookings", "refunds", "withdrawals", "cancelled"].map(
                  (tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-lg flex-1 text-[10px] capitalize data-[state=active]:bg-gold data-[state=active]:text-black"
                    >
                      {tab}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </Tabs>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Select value={txFilterMonth} onValueChange={setTxFilterMonth}>
                  <SelectTrigger className="h-9 w-[130px] bg-white/5 border-white/10 text-white text-xs rounded-xl">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="all" className="text-xs">
                      All Months
                    </SelectItem>
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((m, i) => (
                      <SelectItem
                        key={m}
                        value={String(i + 1)}
                        className="text-xs"
                      >
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={txFilterYear} onValueChange={setTxFilterYear}>
                  <SelectTrigger className="h-9 w-[100px] bg-white/5 border-white/10 text-white text-xs rounded-xl">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="all" className="text-xs">
                      All Years
                    </SelectItem>
                    {Array.from(
                      { length: 4 },
                      (_, i) => new Date().getFullYear() - i,
                    ).map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-1 sm:max-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                <Input
                  placeholder="Search by name, ID, property…"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="h-9 pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              {isBookingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
              ) : (
                (() => {
                  const base =
                    transactionSubTab === "bookings"
                      ? txBookings.map((r) => ({ ...r, _type: "booking" }))
                      : transactionSubTab === "refunds"
                        ? txRefunds.map((r) => ({ ...r, _type: "refund" }))
                        : transactionSubTab === "withdrawals"
                          ? txWithdrawals.map((r) => ({
                              ...r,
                              _type: "withdrawal",
                            }))
                          : txCancelled.map((r) => ({
                              ...r,
                              _type: "cancelled",
                            }));

                  const filtered = base.filter((tx) => {
                    const d = tx.date ? new Date(tx.date) : null;
                    if (
                      txFilterMonth !== "all" &&
                      d &&
                      d.getMonth() + 1 !== parseInt(txFilterMonth)
                    )
                      return false;
                    if (
                      txFilterYear !== "all" &&
                      d &&
                      d.getFullYear() !== parseInt(txFilterYear)
                    )
                      return false;
                    if (txSearch.trim()) {
                      const q = txSearch.trim().toLowerCase();
                      const haystack = [
                        tx.booking_id,
                        tx.customer_name,
                        tx.owner_name,
                        tx.property_name,
                        tx.upi_id,
                        tx.transaction_id,
                        tx.referral_code,
                        tx.referrer_name,
                      ]
                        .map((v) => (v || "").toLowerCase())
                        .join(" ");
                      if (!haystack.includes(q)) return false;
                    }
                    return true;
                  });

                  const hasActiveFilters =
                    txFilterMonth !== "all" ||
                    txFilterYear !== "all" ||
                    txSearch.trim() !== "";

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 bg-white/5 rounded-[2rem] border border-dashed border-white/10 text-white/30">
                        <CreditCard className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-display text-base font-bold">
                          {hasActiveFilters
                            ? "No results match your filters"
                            : `No ${transactionSubTab} records yet`}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={() => {
                              setTxFilterMonth("all");
                              setTxFilterYear("all");
                              setTxSearch("");
                            }}
                            className="mt-2 text-xs text-gold/60 hover:text-gold underline"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    );
                  }

                  return filtered.map((tx, idx) => {
                    const isBooking = tx._type === "booking";
                    const isRefund = tx._type === "refund";
                    const isWithdrawal = tx._type === "withdrawal";
                    const isCancelled = tx._type === "cancelled";
                    const amount = parseFloat(tx.amount || 0);
                    const dateStr = tx.date
                      ? new Date(tx.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-";
                    const label = tx.customer_name || "Customer";

                    const sub = isBooking
                      ? `${tx.property_name} • ${dateStr}`
                      : isRefund
                        ? `${tx.property_name} • Refund`
                        : isCancelled
                          ? `${tx.property_name} • Cancelled`
                          : `UPI: ${tx.upi_id || "-"}`;
                    const statusColor = isBooking
                      ? "bg-emerald-500/10 text-emerald-500"
                      : isRefund
                        ? "bg-blue-500/10 text-blue-400"
                        : isCancelled
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400";
                    const amtColor = isBooking
                      ? "text-emerald-400"
                      : isRefund
                        ? "text-blue-400"
                        : isCancelled
                          ? "text-red-400"
                          : "text-amber-400";
                    const amtPrefix = isBooking
                      ? "+"
                      : isRefund
                        ? "↩"
                        : isCancelled
                          ? "✕"
                          : "↑";
                    const badgeLabel = isBooking
                      ? tx.status?.replace(/_/g, " ") || "CONFIRMED"
                      : isRefund
                        ? tx.refund_status || tx.status || "CANCELLED"
                        : isCancelled
                          ? tx.status?.replace(/_/g, " ") || "CANCELLED"
                          : tx.status?.toUpperCase() || "PENDING";

                    return (
                      <div
                        key={`${tx._type}-${tx.id}-${idx}`}
                        onClick={() => setSelectedTx(tx)}
                        className="glass-dark rounded-2xl border border-white/5 p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-gold/30 hover:bg-white/5 hover:scale-[1.01] transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border border-white/5 flex-shrink-0",
                              statusColor,
                            )}
                          >
                            {isBooking ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : isRefund ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : isCancelled ? (
                              <XCircle className="w-5 h-5" />
                            ) : (
                              <DollarSign className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white truncate tracking-wide">
                                {label}
                              </h4>
                              <Badge
                                variant="outline"
                                className="text-[8px] h-4 border-white/10 text-white/40 capitalize flex-shrink-0"
                              >
                                {tx._type}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-white/50 truncate font-medium">
                              {sub}
                            </p>
                            {tx.booking_id && (
                              <p className="text-[9px] text-white/30 font-mono">
                                {tx.booking_id}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p
                            className={cn(
                              "font-bold text-sm tracking-wide",
                              amtColor,
                            )}
                          >
                            {amtPrefix}₹{amount.toLocaleString("en-IN")}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[8px] h-4 mt-0.5 border-white/10 text-white/40 max-w-[90px] truncate"
                          >
                            {badgeLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        )}

        <Dialog
          open={deleteConfirm.open}
          onOpenChange={(open) =>
            !open &&
            setDeleteConfirm({ open: false, referralId: null, username: "" })
          }
        >
          <DialogContent className="sm:max-w-[420px] bg-[#0B0B0B] border border-white/10 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-red-500 text-lg font-bold">
                Delete Referral?
              </DialogTitle>

              <DialogDescription className="text-white/80 text-sm leading-relaxed">
                Are you sure you want to permanently delete the referral for{" "}
                <span className="font-bold text-white">
                  {deleteConfirm.username
                    ?.split(" ")
                    .map(
                      (word: string) =>
                        word.charAt(0).toUpperCase() + word.slice(1),
                    )
                    .join(" ")}
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-4 mt-6">
              <Button
                className="flex-1 h-12 rounded-xl bg-[#C28B2C] hover:bg-[#b17c22] text-black font-semibold"
                onClick={() =>
                  setDeleteConfirm({
                    open: false,
                    referralId: null,
                    username: "",
                  })
                }
              >
                Cancel
              </Button>

              <Button
                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold"
                onClick={() =>
                  deleteConfirm.referralId &&
                  handleDeleteReferral(deleteConfirm.referralId)
                }
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!selectedTx}
          onOpenChange={(open) => !open && setSelectedTx(null)}
        >
          <DialogContent className="sm:max-w-[440px] bg-charcoal border-white/10 rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gold font-display capitalize">
                {selectedTx?._type === "booking"
                  ? "Booking Details"
                  : selectedTx?._type === "refund"
                    ? "Refund Details"
                    : selectedTx?._type === "cancelled"
                      ? "Cancellation Details"
                      : "Withdrawal Details"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedTx?.date
                  ? new Date(selectedTx.date).toLocaleString("en-IN")
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {selectedTx &&
              (() => {
                const isBooking = selectedTx._type === "booking";
                const isRefund = selectedTx._type === "refund";
                const isWithdrawal = selectedTx._type === "withdrawal";
                const isCancelled = selectedTx._type === "cancelled";

                if (isBooking) {
                  const advance = parseFloat(selectedTx.amount || 0);
                  const total = parseFloat(selectedTx.total_amount || 0);
                  const remaining = total - advance;
                  const referralComm = parseFloat(
                    selectedTx.referrer_commission || 0,
                  );
                  const adminComm = parseFloat(
                    selectedTx.admin_commission || 0,
                  );
                  const rType = (selectedTx.referral_type || "").toLowerCase();
                  const referralPct =
                    rType === "owner"
                      ? 25
                      : rType === "b2b" || rType === "owners_b2b"
                        ? 22
                        : 15;
                  const adminPct =
                    rType === "owner"
                      ? 5
                      : rType === "b2b" || rType === "owners_b2b"
                        ? 8
                        : 15;
                  const commStatus = selectedTx.commission_status || "PENDING";

                  return (
                    <div className="mt-2 space-y-4">
                      {/* 1. BOOKING DETAILS */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-1">
                          Booking Details
                        </p>

                        <div className="flex justify-between text-sm items-start">
                          <span className="text-white/60">Property</span>
                          <span className="text-white font-medium text-right max-w-[55%]">
                            {selectedTx.property_name || "-"}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Guest</span>
                          <span className="text-white font-medium">
                            {selectedTx.customer_name || "-"}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Guest Mobile</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {selectedTx.guest_phone || "-"}
                            </span>
                            {selectedTx.guest_phone && (
                              <a
                                href={`tel:${selectedTx.guest_phone}`}
                                className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Owner</span>
                          <span className="text-white font-medium">
                            {selectedTx.owner_name || "-"}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Owner Mobile</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {selectedTx.owner_phone || "-"}
                            </span>
                            {selectedTx.owner_phone && (
                              <a
                                href={`tel:${selectedTx.owner_phone}`}
                                className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center hover:bg-blue-500/30 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-blue-400" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Booking ID</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-white">
                              {selectedTx.booking_id}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  selectedTx.booking_id,
                                );
                                toast({ title: "Booking ID copied" });
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {selectedTx.check_in && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Check-in</span>
                            <span className="text-white font-medium">
                              {new Date(selectedTx.check_in).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        )}

                        {selectedTx.check_out && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Check-out</span>
                            <span className="text-white font-medium">
                              {new Date(
                                selectedTx.check_out,
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Booking Status</span>
                          <span className="text-amber-400 font-medium text-right max-w-[55%]">
                            {selectedTx.status?.replace(/_/g, " ") || "-"}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Payment Status</span>
                          <span className="text-emerald-400 font-medium">
                            {selectedTx.payment_status || "-"}
                          </span>
                        </div>
                      </div>

                      {/* 2. BOOKING FINANCIAL SUMMARY */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-1">
                          Booking Financial Summary
                        </p>

                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">
                            Customer Paid Advance (30%)
                          </span>
                          <span className="text-emerald-400 font-bold">
                            ₹{advance.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">
                            Remaining Amount (70%)
                          </span>
                          <span className="text-amber-400 font-medium">
                            ₹
                            {remaining > 0
                              ? remaining.toLocaleString("en-IN")
                              : "-"}
                          </span>
                        </div>

                        <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                          <span className="text-white font-semibold">
                            Total Amount (100%)
                          </span>
                          <span className="text-white font-bold">
                            ₹{total > 0 ? total.toLocaleString("en-IN") : "-"}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Payment Method</span>
                          <span className="text-purple-400 font-medium uppercase">
                            {selectedTx.payment_method || "-"}
                          </span>
                        </div>
                      </div>

                      {/* 3. REFERRAL INFORMATION */}
                      {selectedTx.referral_code && (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-1">
                            Referral Information
                          </p>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referrer Name</span>
                            <span className="text-white font-medium">
                              {selectedTx.referrer_name || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referral Code</span>
                            <span className="text-gold font-medium">
                              {selectedTx.referral_code}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referral Type</span>
                            <span className="text-purple-400 font-medium capitalize">
                              {selectedTx.referral_type || "Public"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">
                              Referral Commission
                            </span>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-blue-400 font-bold">
                                ₹{referralComm.toLocaleString("en-IN")}
                                <span className="text-blue-300/70 font-normal ml-1 text-xs">
                                  ({referralPct}%)
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                  commStatus === "PAID"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-400",
                                )}
                              >
                                {commStatus}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">
                              Admin Commission
                            </span>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-gold font-bold">
                                ₹{adminComm.toLocaleString("en-IN")}
                                <span className="text-gold/70 font-normal ml-1 text-xs">
                                  ({adminPct}%)
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                  commStatus === "PAID"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-400",
                                )}
                              >
                                {commStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                if (isCancelled) {
                  const advance = parseFloat(selectedTx.amount || 0);
                  const refundAmt = parseFloat(selectedTx.refund_amount || 0);
                  const isOwnerCancel =
                    selectedTx.status === "CANCELLED_BY_OWNER";
                  const isNoRefund =
                    selectedTx.status === "CANCELLED_NO_REFUND";
                  const customerRefund = isOwnerCancel ? advance : refundAmt;
                  const ownerGets = Math.max(0, advance - customerRefund);
                  const customerPct =
                    advance > 0
                      ? Math.round((customerRefund / advance) * 100)
                      : 0;
                  const ownerPct = 100 - customerPct;

                  return (
                    <div className="mt-2 space-y-4">
                      {/* BANNER */}
                      {isOwnerCancel ? (
                        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-amber-300">
                              Owner Cancelled
                            </p>
                            <p className="text-xs text-amber-400/70 mt-0.5">
                              100% advance refunded to customer as per
                              owner-cancellation policy
                            </p>
                          </div>
                        </div>
                      ) : isNoRefund ? (
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-300">
                              Admin Cancelled — No Refund
                            </p>
                            <p className="text-xs text-red-400/70 mt-0.5">
                              Full advance retained per cancellation policy
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-300">
                              Admin Cancelled
                            </p>
                            <p className="text-xs text-red-400/70 mt-0.5">
                              Refund processed as per cancellation policy
                            </p>
                          </div>
                        </div>
                      )}

                      {/* BOOKING DETAILS */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-1">
                          Booking Details
                        </p>
                        <div className="flex justify-between text-sm items-start">
                          <span className="text-white/60">Property</span>
                          <span className="text-white font-medium text-right max-w-[55%]">
                            {selectedTx.property_name || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Guest</span>
                          <span className="text-white font-medium">
                            {selectedTx.customer_name || "-"}
                          </span>
                        </div>
                        cl
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Guest Mobile</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {selectedTx.guest_phone || "-"}
                            </span>
                            {selectedTx.guest_phone && (
                              <a
                                href={`tel:${selectedTx.guest_phone}`}
                                className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Owner</span>
                          <span className="text-white font-medium">
                            {selectedTx.owner_name || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Owner Mobile</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {selectedTx.owner_phone || "-"}
                            </span>
                            {selectedTx.owner_phone && (
                              <a
                                href={`tel:${selectedTx.owner_phone}`}
                                className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center hover:bg-blue-500/30 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-blue-400" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Booking ID</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-white">
                              {selectedTx.booking_id}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  selectedTx.booking_id,
                                );
                                toast({ title: "Booking ID copied" });
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {selectedTx.check_in && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Check-in</span>
                            <span className="text-white font-medium">
                              {new Date(selectedTx.check_in).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        )}
                        {selectedTx.check_out && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Check-out</span>
                            <span className="text-white font-medium">
                              {new Date(
                                selectedTx.check_out,
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Cancelled By</span>
                          <span
                            className={cn(
                              "font-semibold",
                              isOwnerCancel ? "text-amber-400" : "text-red-400",
                            )}
                          >
                            {selectedTx.refund_initiated_by || "Admin"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">
                            Cancellation Date
                          </span>
                          <span className="text-white font-medium">
                            {selectedTx.date
                              ? new Date(selectedTx.date).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "-"}
                          </span>
                        </div>
                      </div>

                      {/* FINANCIAL SUMMARY */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-1">
                          Financial Summary
                        </p>

                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Advance Paid</span>
                          <span className="text-white font-bold">
                            ₹{advance.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="border-t border-white/10 pt-2 flex justify-between text-sm items-center">
                          <span className="text-white/60">Customer Refund</span>
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={cn(
                                "font-bold",
                                customerRefund > 0
                                  ? "text-emerald-400"
                                  : "text-white/40",
                              )}
                            >
                              ₹{customerRefund.toLocaleString("en-IN")}
                            </span>
                            <span className="text-white/40 text-[10px]">
                              ({customerPct}% of advance)
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Owner Gets</span>
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={cn(
                                "font-bold",
                                ownerGets > 0
                                  ? "text-amber-400"
                                  : "text-white/40",
                              )}
                            >
                              ₹{ownerGets.toLocaleString("en-IN")}
                            </span>
                            <span className="text-white/40 text-[10px]">
                              ({ownerPct}% of advance)
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Payment Method</span>
                          <span className="text-purple-400 font-medium uppercase">
                            {selectedTx.payment_method || "-"}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm items-center">
                          <span className="text-white/60">Refund Status</span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-semibold",
                              selectedTx.refund_status === "REFUND_SUCCESSFUL"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : selectedTx.refund_status === "REFUND_FAILED"
                                  ? "bg-red-500/20 text-red-400"
                                  : selectedTx.refund_status ===
                                      "REFUND_INITIATED"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : isNoRefund
                                      ? "bg-red-500/10 text-red-400/70"
                                      : "bg-white/5 text-white/40",
                            )}
                          >
                            {isNoRefund
                              ? "NO REFUND"
                              : selectedTx.refund_status
                                ? selectedTx.refund_status.replace(/_/g, " ")
                                : customerRefund > 0
                                  ? "PENDING"
                                  : "N/A"}
                          </span>
                        </div>

                        {selectedTx.refund_status === "REFUND_INITIATED" && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-1.5"
                              disabled={checkingStatus}
                              onClick={() =>
                                handleCheckRefundStatus(selectedTx.booking_id)
                              }
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${checkingStatus ? "animate-spin" : ""}`}
                              />
                              {checkingStatus ? "Checking..." : "Check Status"}
                            </Button>
                          </div>
                        )}

                        {selectedTx.transaction_id && customerRefund > 0 && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">
                              Payment Txn ID
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-white">
                                {selectedTx.transaction_id}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-6 h-6"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    selectedTx.transaction_id,
                                  );
                                  toast({ title: "Transaction ID copied" });
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* REFERRAL INFORMATION */}
                      {selectedTx.referral_code && (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-1">
                            Referral Information
                          </p>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referrer Name</span>
                            <span className="text-white font-medium">
                              {selectedTx.referrer_name || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referral Code</span>
                            <span className="text-gold font-medium">
                              {selectedTx.referral_code}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referral Type</span>
                            <span className="text-purple-400 font-medium capitalize">
                              {selectedTx.referral_type || "Public"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="mt-2 space-y-4">
                    {/* REFUND DETAILS */}
                    {isRefund && (
                      <>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-1">
                            Refund Details
                          </p>

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">Booking ID</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-white">
                                {selectedTx.booking_id}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-6 h-6"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    selectedTx.booking_id,
                                  );
                                  toast({ title: "Booking ID copied" });
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex justify-between text-sm items-start">
                            <span className="text-white/60">Property</span>
                            <span className="text-white font-medium text-right max-w-[55%]">
                              {selectedTx.property_name || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Guest Name</span>
                            <span className="text-white font-medium">
                              {selectedTx.customer_name || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">Guest Mobile</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                {selectedTx.guest_phone || "-"}
                              </span>
                              {selectedTx.guest_phone && (
                                <a
                                  href={`tel:${selectedTx.guest_phone}`}
                                  className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">
                              Booking Amount
                            </span>
                            <span className="text-white font-medium">
                              ₹
                              {parseFloat(
                                selectedTx.booking_amount ||
                                  selectedTx.original_amount ||
                                  0,
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Refund Amount</span>
                            <span className="text-blue-400 font-bold">
                              ₹
                              {parseFloat(
                                selectedTx.refund_amount || 0,
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>

                          {(() => {
                            const bookingAmt = parseFloat(
                              selectedTx.booking_amount ||
                                selectedTx.original_amount ||
                                0,
                            );
                            const refundAmt = parseFloat(
                              selectedTx.refund_amount || 0,
                            );
                            const ownerAmt = Math.max(
                              0,
                              bookingAmt - refundAmt,
                            );
                            const customerPct =
                              bookingAmt > 0
                                ? Math.round((refundAmt / bookingAmt) * 100)
                                : 0;
                            const ownerPct = 100 - customerPct;
                            return (
                              <>
                                <div className="flex justify-between text-sm items-center">
                                  <span className="text-white/60">
                                    Customer Refund Amount
                                  </span>
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-emerald-400 font-bold">
                                      ₹{refundAmt.toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-emerald-300/60 text-[10px]">
                                      ({customerPct}% of advance)
                                    </span>
                                  </div>
                                </div>

                                <div className="flex justify-between text-sm items-center">
                                  <span className="text-white/60">
                                    Owner Refund Amount
                                  </span>
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span
                                      className={
                                        ownerAmt > 0
                                          ? "text-amber-400 font-bold"
                                          : "text-white/40 font-medium"
                                      }
                                    >
                                      ₹{ownerAmt.toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-white/40 text-[10px]">
                                      ({ownerPct}% of advance)
                                    </span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">
                              Payment Method
                            </span>
                            <span className="text-purple-400 font-medium uppercase">
                              {selectedTx.payment_method || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">Refund Status</span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-semibold",
                                selectedTx.refund_status === "REFUND_SUCCESSFUL"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : selectedTx.refund_status === "REFUND_FAILED"
                                    ? "bg-red-500/20 text-red-400"
                                    : selectedTx.refund_status ===
                                        "REFUND_INITIATED"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-amber-500/20 text-amber-400",
                              )}
                            >
                              {(selectedTx.refund_status || "PENDING").replace(
                                /_/g,
                                " ",
                              )}
                            </span>
                          </div>

                          {selectedTx.refund_status === "REFUND_INITIATED" && (
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-1.5"
                                disabled={checkingStatus}
                                onClick={() =>
                                  handleCheckRefundStatus(selectedTx.booking_id)
                                }
                              >
                                <RefreshCw
                                  className={`w-3 h-3 ${checkingStatus ? "animate-spin" : ""}`}
                                />
                                {checkingStatus
                                  ? "Checking..."
                                  : "Check Status"}
                              </Button>
                            </div>
                          )}

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">
                              Refund Transaction ID
                            </span>
                            {selectedTx.refund_id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-white">
                                  {selectedTx.refund_id}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-6 h-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      selectedTx.refund_id,
                                    );
                                    toast({ title: "Refund ID copied" });
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-white/40 text-xs">
                                Not yet assigned
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Initiated By</span>
                            <span
                              className={cn(
                                "font-medium",
                                selectedTx.refund_initiated_by === "Owner"
                                  ? "text-amber-400"
                                  : "text-blue-400",
                              )}
                            >
                              {selectedTx.refund_initiated_by || "Admin"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Refund Date</span>
                            <span className="text-white font-medium">
                              {selectedTx.date
                                ? new Date(selectedTx.date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* WITHDRAWAL DETAILS */}
                    {isWithdrawal && (
                      <>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">
                            Withdrawal Details
                          </p>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referral User</span>
                            <span className="text-white font-medium">
                              {selectedTx.customer_name || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referral Code</span>
                            <span className="text-gold font-medium">
                              {selectedTx.referral_code || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Referral Type</span>
                            <span className="text-purple-400 font-medium capitalize">
                              {selectedTx.referral_type || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">Mobile</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                {selectedTx.mobile || "-"}
                              </span>
                              {selectedTx.mobile && (
                                <a
                                  href={`tel:${selectedTx.mobile}`}
                                  className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">
                              Withdraw Amount
                            </span>
                            <span className="text-emerald-400 font-bold">
                              ₹
                              {parseFloat(
                                selectedTx.amount || 0,
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">
                              Available Balance
                            </span>
                            <span className="text-gold font-medium">
                              ₹
                              {parseFloat(
                                selectedTx.available_balance || 0,
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">UPI / Bank</span>
                            <span className="text-white font-medium">
                              {selectedTx.upi_id || "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">
                              Withdrawal Status
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-semibold",
                                selectedTx.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : selectedTx.status === "rejected" ||
                                      selectedTx.status === "failed"
                                    ? "bg-red-500/20 text-red-400"
                                    : selectedTx.status === "processing"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-amber-500/20 text-amber-400",
                              )}
                            >
                              {(selectedTx.status || "PENDING").toUpperCase()}
                            </span>
                          </div>

                          {(selectedTx.status === "processing" ||
                            selectedTx.payout_id) &&
                            selectedTx.status !== "completed" && (
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-1.5"
                                  disabled={checkingStatus}
                                  onClick={() =>
                                    handleCheckWithdrawalStatus(selectedTx.id)
                                  }
                                >
                                  <RefreshCw
                                    className={`w-3 h-3 ${checkingStatus ? "animate-spin" : ""}`}
                                  />
                                  {checkingStatus
                                    ? "Checking..."
                                    : "Check Status"}
                                </Button>
                              </div>
                            )}

                          <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">
                              RazorpayX Payout ID
                            </span>
                            {selectedTx.payout_id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-white">
                                  {selectedTx.payout_id}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-6 h-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      selectedTx.payout_id,
                                    );
                                    toast({ title: "Payout ID copied" });
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-white/40 text-xs">
                                {selectedTx.status === "pending"
                                  ? "Awaiting processing"
                                  : "Not yet assigned"}
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">
                              Requested Date
                            </span>
                            <span className="text-white font-medium">
                              {selectedTx.date
                                ? new Date(selectedTx.date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )
                                : "-"}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">
                              Processed Date
                            </span>
                            <span className="text-white font-medium">
                              {selectedTx.processed_date &&
                              selectedTx.status === "completed"
                                ? new Date(
                                    selectedTx.processed_date,
                                  ).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full bg-gold text-black border border-gold/20 hover:bg-gold/50 rounded-xl transition-all"
                onClick={() => setSelectedTx(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={logoutConfirm} onOpenChange={setLogoutConfirm}>
          <DialogContent className="sm:max-w-[400px] bg-[#0B0B0B] border border-white/10 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-gold text-lg font-semibold">
                Confirm Logout?
              </DialogTitle>

              <DialogDescription className="text-white/70">
                Are you sure you want to logout from the admin dashboard?
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 pt-4">
              {/* Cancel */}
              <Button
                className="flex-1 bg-gold text-black border border-gold/20 hover:bg-gold/50 rounded-xl transition-all"
                onClick={() => setLogoutConfirm(false)}
              >
                Cancel
              </Button>

              {/* Logout */}
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={deletePropertyConfirm.open}
          onOpenChange={(open) =>
            !open &&
            setDeletePropertyConfirm({
              open: false,
              propertyId: null,
              propertyName: "",
            })
          }
        >
          <DialogContent className="sm:max-w-[400px] bg-charcoal border-white/10 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-red-500 font-display">
                Delete Property
              </DialogTitle>

              <DialogDescription className="text-sm text-muted-foreground">
                Are you sure you want to permanently delete{" "}
                <span className="font-bold text-white">
                  {deletePropertyConfirm.propertyName}
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-white/10"
                onClick={() =>
                  setDeletePropertyConfirm({
                    open: false,
                    propertyId: null,
                    propertyName: "",
                  })
                }
              >
                Cancel
              </Button>

              <Button
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                onClick={() =>
                  deletePropertyConfirm.propertyId &&
                  handleDeleteProperty(deletePropertyConfirm.propertyId)
                }
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={referralActionConfirm.open}
          onOpenChange={(open) =>
            !open &&
            setReferralActionConfirm({
              open: false,
              id: null,
              name: "",
              action: null,
            })
          }
        >
          <DialogContent className="sm:max-w-[400px] bg-[#0B0B0B] border border-white/10 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle
                className={`text-lg font-semibold ${
                  referralActionConfirm.action === "blocked"
                    ? "text-red-500"
                    : "text-emerald-400"
                }`}
              >
                {referralActionConfirm.action === "blocked"
                  ? "Block Referral?"
                  : "Unblock Referral?"}
              </DialogTitle>

              <DialogDescription className="text-white/70">
                Are you sure you want to{" "}
                <span className="font-bold capitalize">
                  {referralActionConfirm.action}
                </span>{" "}
                referral{" "}
                <span className="font-bold text-white">
                  {referralActionConfirm.name}
                </span>
                ?
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-gold text-black border border-gold/20 hover:bg-gold/50 rounded-xl transition-all"
                onClick={() =>
                  setReferralActionConfirm({
                    open: false,
                    id: null,
                    name: "",
                    action: null,
                  })
                }
              >
                Cancel
              </Button>

              <Button
                className={`flex-1 rounded-xl text-white ${
                  referralActionConfirm.action === "blocked"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
                onClick={() => {
                  if (
                    referralActionConfirm.id &&
                    referralActionConfirm.action
                  ) {
                    handleUpdateReferralStatus(
                      referralActionConfirm.id,
                      referralActionConfirm.action,
                    );
                  }

                  // close popup
                  setReferralActionConfirm({
                    open: false,
                    id: null,
                    name: "",
                    action: null,
                  });
                }}
              >
                {referralActionConfirm.action === "blocked"
                  ? "Block"
                  : "Unblock"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-8 text-center pb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-gold transition-colors text-xs font-medium"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Website
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>

      {/* Fixed Bottom Tab Bar (Mobile-First) */}
      <nav className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 px-4 py-2 z-50 md:max-w-md md:mx-auto md:mb-6 md:rounded-2xl md:border shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {[
            { id: "properties", icon: Building2, label: "Properties" },
            { id: "owners", icon: Users2, label: "Owners" },
            { id: "referrals", icon: Share2, label: "Referrals" },
            { id: "transactions", icon: CreditCard, label: "Transactions" },
            { id: "b2b", icon: Handshake, label: "B2B" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative flex-1",
                activeTab === tab.id
                  ? "text-gold"
                  : "text-muted-foreground hover:text-white/60",
              )}
            >
              <tab.icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  activeTab === tab.id && "scale-110",
                )}
              />
              <span className="text-[9px] font-bold uppercase tracking-tighter">
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gold rounded-full shadow-gold" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AdminDashboard;
