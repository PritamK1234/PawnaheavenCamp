import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminPaths } from "@/lib/adminPaths";
import { ChevronLeft, Phone, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const AdminContactsPage = () => {
  const [contacts, setContacts] = useState<{
    owners: any[];
    b2b: any[];
    owners_b2b: any[];
    referrals: any[];
  }>({ owners: [], b2b: [], owners_b2b: [], referrals: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch("/api/referrals/admin/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setLoading(false); return; }
        const data: any[] = await res.json();
        setContacts({
          owners: data.filter(u => u.referral_type === "owner"),
          b2b: data.filter(u => u.referral_type === "b2b"),
          owners_b2b: data.filter(u => u.referral_type === "owners_b2b"),
          referrals: data.filter(u => u.referral_type === "public" || !u.referral_type),
        });
      } catch (e) {
        console.error("Failed to load contacts", e);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const renderList = (items: any[], showOwner?: boolean) => {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="text-center py-10 text-white/30 text-sm">No contacts found</div>
      );
    }
    return (
      <div className="space-y-2 mt-4">
        {items.map((c, i) => (
          <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white/90 capitalize">{c.username || c.name}</p>
              {showOwner && c.parent_owner_name && (
                <p className="text-[10px] text-amber-400">Owner: {c.parent_owner_name}</p>
              )}
              <p className="text-xs text-white/40">{c.referral_otp_number || c.mobile}</p>
            </div>
            <a
              href={`tel:${c.referral_otp_number || c.mobile}`}
              className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <div className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-gold/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={adminPaths.dashboard} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gold hover:bg-gold/10 transition-all border border-gold/10">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-lg font-bold italic text-gold tracking-wide">Contacts</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5">
        <Tabs defaultValue="owners" className="w-full">
          <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5 grid grid-cols-5">
            <TabsTrigger value="owners" className="rounded-lg text-[9px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">Owners</TabsTrigger>
            <TabsTrigger value="b2b" className="rounded-lg text-[9px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">B2B</TabsTrigger>
            <TabsTrigger value="owners_b2b" className="rounded-lg text-[9px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">Own B2B</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-lg text-[9px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">Referrals</TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg text-[9px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">Guests</TabsTrigger>
          </TabsList>

          <TabsContent value="owners">{renderList(contacts.owners)}</TabsContent>
          <TabsContent value="b2b">{renderList(contacts.b2b)}</TabsContent>
          <TabsContent value="owners_b2b">{renderList(contacts.owners_b2b, true)}</TabsContent>
          <TabsContent value="referrals">{renderList(contacts.referrals)}</TabsContent>
          <TabsContent value="customers">
            <div className="text-center py-10 text-white/30 text-sm">Guest contacts are available in the Bookings section</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminContactsPage;
