import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PWAInstallButtonProps {
  variant?: "floating" | "menu" | "hero" | "compact";
  className?: string;
}

export function PWAInstallButton({
  variant = "floating",
  className,
}: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const checkInstalled = useCallback(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;
    setIsInstalled(isStandalone);
  }, []);

  useEffect(() => {
    checkInstalled();

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setIsInstalling(false);
      setDeferredPrompt(null);
      toast.success("App installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", appInstalledHandler);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const displayChangeHandler = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (!e.matches) {
        setDeferredPrompt(null);
      }
    };
    mediaQuery.addEventListener("change", displayChangeHandler);

    const visibilityHandler = () => {
      if (!document.hidden) {
        checkInstalled();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
      mediaQuery.removeEventListener("change", displayChangeHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [checkInstalled]);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      toast.info("To install: Click your browser's menu (⋮) and select 'Install App' or 'Add to Home Screen'.", { duration: 6000 });
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
      setIsInstalling(false);
    } catch (error) {
      console.error("PWA install error:", error);
      setIsInstalling(false);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <Button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={cn(
          variant === "hero"
            ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-gold-light hover:scale-105 active:scale-95 transition-all duration-300 group shadow-gold h-auto mb-4 border-2 border-white/20 sm:px-6 sm:py-3"
            : variant === "menu"
              ? "w-full justify-start gap-3 h-12 px-4 rounded-xl font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all border border-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              : variant === "compact"
                ? "bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold flex items-center space-x-2 shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse border-none h-8 px-3"
                : "fixed bottom-6 right-6 z-[9999] rounded-full shadow-[0_0_30px_rgba(212,175,55,0.5)] bg-gradient-to-r from-primary to-gold-light hover:scale-110 active:scale-95 transition-all duration-300 flex items-center gap-2 px-6 py-8 border-2 border-white/40 animate-pulse",
          className,
        )}
      >
        {isInstalling ? (
          <Loader2
            className={cn(
              "animate-spin",
              variant === "hero" ? "w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" :
              variant === "compact" ? "w-4 h-4" : "w-6 h-6 text-primary",
            )}
          />
        ) : (
          <Download
            className={cn(
              variant === "hero" ? "w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" :
              variant === "compact" ? "w-4 h-4" : "w-6 h-6 text-primary",
              variant !== "compact" && "animate-bounce group-hover:animate-none",
            )}
          />
        )}
        <span
          className={cn(
            "font-bold uppercase tracking-wider",
            variant === "hero"
              ? "text-xs sm:text-base text-white"
              : variant === "compact"
                ? "text-[10px] tracking-wider"
                : "text-lg bg-gradient-to-r from-primary to-gold-light bg-clip-text text-transparent",
          )}
        >
          {isInstalling ? "Installing..." : "Install App"}
        </span>
      </Button>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto p-6 pb-10 sm:pb-6 shadow-[0_0_40px_rgba(212,175,55,0.2)] animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#D4AF37] font-display">Install App</h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold text-lg border border-[#D4AF37]/20">
                  1
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Tap the Share button</p>
                  <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                    Look for the <Share className="w-3.5 h-3.5 inline text-[#D4AF37]" /> icon at the bottom of Safari
                  </p>
                </div>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold text-lg border border-[#D4AF37]/20">
                  2
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Tap "Add to Home Screen"</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Scroll down in the share menu and tap the option
                  </p>
                </div>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold text-lg border border-[#D4AF37]/20">
                  3
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Tap "Add"</p>
                  <p className="text-gray-400 text-xs mt-1">
                    The app will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
