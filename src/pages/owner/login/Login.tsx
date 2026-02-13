import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Shield, Loader2 } from "lucide-react";

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/owners/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobileNumber: mobile }),
      });

      const data = await response.json();

      if (data.success) {
        setShowOTP(true);
        toast.success("OTP sent successfully! (Demo: 123456)");
      } else {
        toast.error(data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/owners/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobileNumber: mobile,
          otp: otp,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("ownerLoggedIn", "true");
        localStorage.setItem("ownerToken", data.token);
        localStorage.setItem("ownerData", JSON.stringify(data.data));
        toast.success("Login successful!");
        navigate("/owner/dashboard");
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float delay-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(193,155,74,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(193,155,74,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-gold-dark mb-6 shadow-gold-lg animate-pulse-glow mx-auto">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-foreground mb-2">
            PawnaHavenCamp
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Owner Login
            <Sparkles className="w-4 h-4 text-primary" />
          </p>
        </div>

        <div className="glass rounded-3xl p-8 border border-border/50 shadow-card">
          {!showOTP ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter your mobile number to receive an OTP
                </p>
              </div>
              <Input
                type="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-gold-dark hover:from-gold-dark hover:to-primary transition-all duration-500 shadow-gold hover:shadow-gold-lg transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 text-center">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Verify OTP
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your mobile
                </p>
              </div>
              <Input
                type="text"
                maxLength={6}
                className="text-center text-2xl tracking-widest h-14 bg-secondary/50 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-gold-dark hover:from-gold-dark hover:to-primary transition-all duration-500 shadow-gold hover:shadow-gold-lg transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Verify & Login"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowOTP(false)}
                className="text-muted-foreground hover:text-primary"
              >
                Change Number
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => navigate("/owner/register")}
            className="text-sm text-muted-foreground hover:text-primary hover:bg-transparent"
          >
            Not registered yet? Register as Owner
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] tracking-[0.2em] font-bold text-muted-foreground/40 uppercase">
            Powered by PawnaHavenCamp Luxury Stay
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
