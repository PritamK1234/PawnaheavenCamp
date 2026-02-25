import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminPaths } from "@/lib/adminPaths";
import { 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  History, 
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Bell
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

const RequestsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("withdrawals");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration - in a real app, this would be fetched from API
  const withdrawRequests = [
    { id: 1, user: "John Doe", amount: 5000, date: "2026-02-18", status: "pending" },
    { id: 2, user: "Jane Smith", amount: 3500, date: "2026-02-19", status: "pending" },
  ];

  const refundRequests = [
    { id: 1, property: "Lakeview Camping", amount: 2000, date: "2026-02-17", status: "pending" },
  ];

  const historyData = [
    { id: 101, type: "Withdrawal", user: "Mike Ross", amount: 4500, date: "2026-02-15", status: "paid" },
    { id: 102, type: "Refund", user: "Sarah Connor", amount: 1200, date: "2026-02-14", status: "refunded" },
  ];

  return (
    <div className="min-h-screen bg-charcoal text-white pb-20">
      <Helmet>
        <title>Requests Management - Admin</title>
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 p-1 rounded-2xl w-full border border-white/10 grid grid-cols-3">
            <TabsTrigger value="withdrawals" className="rounded-xl flex items-center gap-2 py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all">
              Withdrawals
              <Badge className="bg-red-500 text-white border-none h-5 px-1.5 text-[10px]">
                {withdrawRequests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="refunds" className="rounded-xl flex items-center gap-2 py-3 data-[state=active]:bg-gold data-[state=active]:text-black transition-all">
              Refunds
              <Badge className="bg-red-500 text-white border-none h-5 px-1.5 text-[10px]">
                {refundRequests.length}
              </Badge>
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
                      <h3 className="font-bold text-lg">{req.user}</h3>
                      <p className="text-xs text-white/50">{req.date}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-bold text-gold">₹{req.amount}</span>
                        <Badge variant="outline" className="border-gold/20 text-gold bg-gold/5 uppercase text-[9px] tracking-widest">Withdrawal</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-4 text-xs font-bold">Approve</Button>
                      <Button variant="ghost" className="text-red-400 hover:bg-red-500/10 h-9 rounded-xl text-xs">Reject</Button>
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
                <Card key={req.id} className="p-5 bg-white/5 border-white/10 rounded-2xl hover:border-gold/30 transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">{req.property}</h3>
                      <p className="text-xs text-white/50">{req.date}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-bold text-gold">₹{req.amount}</span>
                        <Badge variant="outline" className="border-amber-500/20 text-amber-500 bg-amber-500/5 uppercase text-[9px] tracking-widest">Refund</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-4 text-xs font-bold">Process Refund</Button>
                      <Button variant="ghost" className="text-red-400 hover:bg-red-500/10 h-9 rounded-xl text-xs">Deny</Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <EmptyState icon={Clock} title="No Pending Refunds" />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
             {historyData.map((item) => (
               <Card key={item.id} className="p-4 bg-white/5 border-white/10 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className={cn(
                     "w-10 h-10 rounded-xl flex items-center justify-center",
                     item.type === "Withdrawal" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                   )}>
                     {item.type === "Withdrawal" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                   </div>
                   <div>
                     <h4 className="font-bold text-sm">{item.user}</h4>
                     <p className="text-[10px] text-white/40">{item.date} • {item.type}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className={cn("font-bold", item.type === "Withdrawal" ? "text-red-500" : "text-emerald-500")}>
                     ₹{item.amount}
                   </p>
                   <Badge variant="outline" className="text-[9px] border-white/10 text-white/40 h-5">COMPLETED</Badge>
                 </div>
               </Card>
             ))}
          </TabsContent>
        </Tabs>
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
