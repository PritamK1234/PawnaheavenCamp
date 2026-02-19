import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { 
  Trophy, 
  Users, 
  QrCode, 
  ChevronLeft, 
  TrendingUp, 
  Award,
  CircleCheck,
  Zap,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import axios from "axios";

interface Earner {
  username: string;
  earnings: number | string;
}

const ReferralPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"month" | "all">("all");
  const [earners, setEarners] = useState<Earner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopEarners = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/referrals/top-earners?period=${period === "all-time" ? "all" : "month"}`);
        setEarners(response.data);
      } catch (error) {
        console.error("Error fetching top earners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopEarners();
  }, [period]);

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <Helmet>
        <title>Referral Earnings - PawnaHavenCamp</title>
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70 hover:bg-primary hover:text-primary-foreground transition-all">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display text-xl font-bold">Referral Earning</h1>
        </div>
        
        {/* Fixed Row Options */}
        <div className="px-6 pb-4 bg-black border-b border-border/30">
          <div className="grid grid-cols-2 gap-3">
            <Card 
              onClick={() => navigate("/referral/check")}
              className="p-3 bg-green-600 text-white border-green-500/50 hover:bg-green-700 transition-all cursor-pointer group rounded-2xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                <CircleCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs truncate">Check Earning</h3>
                <p className="text-[10px] text-white/80 truncate">Check earning</p>
              </div>
            </Card>

            <Card 
              onClick={() => navigate("/referral/generate")}
              className="p-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer group rounded-2xl shadow-gold flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs text-white truncate">Generate new code</h3>
                <p className="text-[10px] text-primary-foreground/80 truncate">Generate</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pt-6 space-y-8">
        {/* Leaderboard Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-bold">Top Earners</h2>
            </div>
        <Tabs defaultValue="all" className="w-full sm:w-[200px]" onValueChange={(v) => setPeriod(v as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-xl">
            <TabsTrigger value="month" className="text-[10px] uppercase font-bold rounded-lg">Month</TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] uppercase font-bold rounded-lg">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading earners...</p>
              </div>
            ) : earners.length > 0 ? (
              earners.map((user, index) => (
                <Card key={index} className="p-4 bg-card border-border/30 rounded-2xl flex items-center justify-between hover:bg-secondary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      index === 0 ? "bg-yellow-500/20 text-yellow-600 shadow-sm" : 
                      index === 1 ? "bg-slate-400/20 text-slate-500" :
                      index === 2 ? "bg-orange-400/20 text-orange-600" : "bg-secondary text-muted-foreground"
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-foreground capitalize">{user.username}</p>
                      <p className="text-xs text-muted-foreground">Successful Partner</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold text-lg">
                      ₹{Number(user.earnings).toLocaleString('en-IN')}
                    </p>
                    <Badge variant="outline" className="text-[8px] uppercase tracking-widest h-5">Earned</Badge>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-secondary/10 rounded-3xl border border-dashed border-border/50">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No earners yet this period</p>
                <p className="text-xs text-muted-foreground/60">Be the first to reach the top!</p>
              </div>
            )}
          </div>
        </div>

        {/* Reward Card */}
        <Card className="p-8 bg-gradient-to-br from-primary to-gold-dark text-primary-foreground rounded-[2.5rem] relative overflow-hidden shadow-gold">
           <div className="relative z-10">
             <h3 className="text-2xl font-display font-bold mb-2">Invite & Earn</h3>
             <p className="text-primary-foreground/80 mb-6 max-w-[200px]">Get from ₹100 to ₹8000 for every booking made using your referral code.</p>
             <Button onClick={() => navigate("/referral/generate")} className="bg-white text-primary hover:bg-white/90 rounded-2xl font-bold">Start Inviting</Button>
           </div>
           <Users className="absolute -right-8 -bottom-8 w-40 h-40 text-white/10" />
        </Card>
      </div>
    </div>
  );
};

export default ReferralPage;
