import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Lock, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";

const ReferralLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"verify" | "otp">("verify");
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("referral_token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSendOTP = async () => {
    if (!mobile || mobile.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/referrals/request-otp", {
        mobile,
        purpose: "referral_login",
      });
      toast.success("OTP sent to your registered mobile");
      setStep("otp");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to send OTP. Make sure your number is registered.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const verifyRes = await axios.post("/api/referrals/verify-otp", {
        mobile,
        otp,
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
      toast.success("Login successful!");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Login failed. Please check your OTP.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Helmet>
        <title>Login - Referral Dashboard</title>
      </Helmet>

      <div className="sticky top-0 z-50 bg-black border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <h1 className="font-display text-xl font-bold text-amber-400">
            Referral Dashboard
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {step === "verify" && (
            <div className="space-y-8 animate-fade-up">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display font-bold">
                  Login to Dashboard
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your registered mobile number
                </p>
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
                    value={mobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 10) setMobile(value);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                    className="h-12 bg-secondary/50 rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-bold gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send OTP
                    </>
                  )}
                </Button>

                {/* NEW BUTTON */}
                <div className="text-center pt-2">
                  <Link
                    to="/generate"
                    className="text-sm text-amber-400 hover:text-amber-300 underline transition"
                  >
                    Not created referral code yet? Create one
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-8 animate-fade-up">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display font-bold">Enter OTP</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Verification code sent to {mobile}
                </p>
              </div>
              <Card className="p-6 bg-card border-border/50 rounded-3xl space-y-4">
                <div className="space-y-2">
                  <Label>OTP Code</Label>
                  <Input
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                    className="h-12 bg-secondary/50 rounded-xl text-center text-2xl tracking-[0.5em] font-normal"
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verify & Login"
                  )}
                </Button>
                <button
                  onClick={() => {
                    setStep("verify");
                    setOtp("");
                  }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-white transition-colors pt-1"
                >
                  ← Change mobile number
                </button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferralLogin;
