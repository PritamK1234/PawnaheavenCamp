import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Share2,
  Loader2,
  Users2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import axios from "axios";
import { toast } from "sonner";

interface B2BPartner {
  id: number;
  username: string;
  referral_otp_number: string;
  referral_code: string;
  referral_url: string;
  owner_name: string | null;
  property_name: string | null;
}

const OwnerB2B = () => {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<B2BPartner[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const ownerDataString = localStorage.getItem("ownerData");
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;
  const ownerMobile = ownerData?.owner_otp_number || ownerData?.ownerNumber || ownerData?.mobileNumber || ownerData?.mobile || "";

  const dashboardPath = ownerData?.property_type === "villa" ? "/owner/dashboard/villa" : "/owner/dashboard/camping";

  useEffect(() => {
    if (ownerMobile) {
      fetchB2BList();
    } else {
      setLoading(false);
    }
  }, [ownerMobile]);

  const fetchB2BList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/referrals/owner/b2b-list?mobile=${ownerMobile}`);
      setList(res.data.list || []);
    } catch (error) {
      console.error("Failed to fetch B2B list", error);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleDelete = async (partner: B2BPartner) => {
    if (!window.confirm(`Delete "${partner.username}"? This will remove them from your dashboard and admin referrals, but their contact info is preserved.`)) return;
    setDeletingId(partner.id);
    try {
      await axios.post("/api/referrals/owner/b2b-delete", {
        id: partner.id,
        ownerMobile,
      });
      toast.success(`${partner.username} deleted`);
      setExpandedId(null);
      await fetchB2BList();
    } catch (error) {
      toast.error("Failed to delete partner");
    } finally {
      setDeletingId(null);
    }
  };

  const getQrUrl = (url: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=300x300&bgcolor=ffffff`;

  const handleWhatsAppShare = async (partner: B2BPartner) => {
    const link = partner.referral_url || `${window.location.origin}/?ref=${partner.referral_code}`;
    const qrUrl = getQrUrl(link);

    let messageLines = [];
    if (partner.property_name) messageLines.push(`Property: ${partner.property_name}`);
    if (partner.owner_name) messageLines.push(`Owner: ${partner.owner_name}`);
    messageLines.push(`Referral Code: ${partner.referral_code}`);
    messageLines.push(`Referral Link: ${link}`);
    const message = messageLines.join("\n");

    try {
      const imgRes = await fetch(qrUrl);
      const blob = await imgRes.blob();
      const file = new File([blob], `qr-${partner.referral_code}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: message, title: "Pawna Haven Camp" });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }

    const fallbackMessage = `${message}\n\nQR Code Image: ${qrUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(fallbackMessage)}`, "_blank");
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="sticky top-0 z-50 bg-black border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to={dashboardPath}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display text-xl font-bold">B2B Partners</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 pt-6 max-w-md space-y-3">
        {list.length === 0 ? (
          <Card className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-8 rounded-3xl border border-white/10 text-center">
            <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/20">
              <AlertCircle className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-bold mb-2">No B2B Partners Yet</h3>
            <p className="text-muted-foreground text-sm">
              No B2B partners are linked to your property yet. Contact your admin to generate an Owners B2B referral code for your property.
            </p>
            <Button onClick={fetchB2BList} variant="outline" className="rounded-2xl mt-4">
              Refresh
            </Button>
          </Card>
        ) : (
          list.map((partner) => {
            const isExpanded = expandedId === partner.id;
            const referralLink = partner.referral_url || `${window.location.origin}/?ref=${partner.referral_code}`;
            return (
              <Card key={partner.id} className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-3xl border border-white/10 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleExpand(partner.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Users2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white capitalize">{partner.username}</p>
                      <p className="text-xs text-muted-foreground">{partner.referral_otp_number}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={referralLink}
                        className="flex-1 h-9 bg-secondary/50 rounded-xl px-3 text-xs border border-border/50 truncate"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleCopy(referralLink, "Referral link")}
                        className="rounded-xl h-9 w-9 flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={partner.referral_code}
                        className="flex-1 h-9 bg-secondary/50 rounded-xl px-3 text-sm font-bold tracking-wider border border-border/50"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleCopy(partner.referral_code, "Referral code")}
                        className="rounded-xl h-9 w-9 flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10">
                      <div className="p-2 bg-white rounded-2xl">
                        <img
                          src={getQrUrl(referralLink)}
                          alt={`QR for ${partner.referral_code}`}
                          className="w-[140px] h-[140px]"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => handleWhatsAppShare(partner)}
                      className="w-full h-11 rounded-2xl font-bold bg-[#25D366] hover:bg-[#128C7E] text-white"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share on WhatsApp
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 rounded-xl text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => handleDelete(partner)}
                      disabled={deletingId === partner.id}
                    >
                      {deletingId === partner.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OwnerB2B;
