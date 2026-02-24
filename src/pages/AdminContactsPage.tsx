import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Phone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CONTACTS: Record<string, { name: string; mobile: string }[]> = {
  owners: [
    { name: "Rajesh Patil", mobile: "9876543210" },
    { name: "Sunita Sharma", mobile: "9812345678" },
    { name: "Amit Deshmukh", mobile: "9823456789" },
  ],
  b2b: [
    { name: "TravelMax Agency", mobile: "9900112233" },
    { name: "Lonavala Tours", mobile: "9988776655" },
  ],
  referrals: [
    { name: "Priya Mehta", mobile: "9871234560" },
    { name: "Karan Joshi", mobile: "9845671230" },
    { name: "Neha Kulkarni", mobile: "9834567812" },
  ],
  customers: [
    { name: "Vikram Singh", mobile: "9801234567" },
    { name: "Pooja Verma", mobile: "9812340056" },
    { name: "Rohit Gupta", mobile: "9823451234" },
    { name: "Anita Rao", mobile: "9856781234" },
  ],
};

const AdminContactsPage = () => {
  const renderList = (items: { name: string; mobile: string }[]) => (
    <div className="space-y-2 mt-4">
      {items.map((c, i) => (
        <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white/90">{c.name}</p>
            <p className="text-xs text-white/40">{c.mobile}</p>
          </div>
          <a
            href={`tel:${c.mobile}`}
            className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <div className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-gold/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/dashboard" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gold hover:bg-gold/10 transition-all border border-gold/10">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-lg font-bold italic text-gold tracking-wide">Contacts</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5">
        <Tabs defaultValue="owners" className="w-full">
          <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5 grid grid-cols-4">
            <TabsTrigger value="owners" className="rounded-lg text-[10px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">Owners</TabsTrigger>
            <TabsTrigger value="b2b" className="rounded-lg text-[10px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">B2B</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-lg text-[10px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">Referrals</TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg text-[10px] py-2.5 data-[state=active]:bg-gold data-[state=active]:text-black transition-all font-bold">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="owners">{renderList(CONTACTS.owners)}</TabsContent>
          <TabsContent value="b2b">{renderList(CONTACTS.b2b)}</TabsContent>
          <TabsContent value="referrals">{renderList(CONTACTS.referrals)}</TabsContent>
          <TabsContent value="customers">{renderList(CONTACTS.customers)}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminContactsPage;
