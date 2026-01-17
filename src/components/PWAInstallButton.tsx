import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Info, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PWAInstallButtonProps {
  variant?: 'floating' | 'menu' | 'hero';
  className?: string;
}

export function PWAInstallButton({ variant = 'floating', className }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Auto-trigger if clicked recently
      const lastClick = localStorage.getItem('pwa_install_click_pending');
      if (lastClick && Date.now() - parseInt(lastClick) < 60000) {
        localStorage.removeItem('pwa_install_click_pending');
        setIsInstalling(true);
        e.prompt();
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstalling(false);
      setDeferredPrompt(null);
      toast.success("App installed successfully!");
    });

    // Listen for display-mode change (handles uninstallation detection in some browsers)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', (e) => {
      setIsInstalled(e.matches);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) {
      // Logic for "View in App" - could be a deep link or just a toast
      toast.info("Opening the app...");
      // In a real PWA, this usually doesn't do much from the browser
      // unless you have a custom protocol. For now, we show the state.
      return;
    }

    if (!deferredPrompt) {
      if (isIOS) {
        toast.info(
          "To install: Tap the 'Share' button in Safari and select 'Add to Home Screen' 📲",
          { duration: 6000 }
        );
      } else {
        localStorage.setItem('pwa_install_click_pending', Date.now().toString());
        toast.info("Preparing installation... Please wait 5-10 seconds for your browser to authorize the app. If no prompt appears, please refresh and try once more. 🚀", { duration: 8000 });
      }
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      } else {
        setIsInstalling(false);
      }
    } catch (error) {
      console.error('PWA install error:', error);
      setIsInstalling(false);
      toast.error("Installation failed. Please try via your browser menu.");
    }
  };

  return (
    <Button 
      onClick={handleInstallClick}
      disabled={isInstalling}
      className={cn(
        variant === 'hero' 
          ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-gold-light hover:scale-105 active:scale-95 transition-all duration-300 group shadow-gold h-auto mb-4 border-2 border-white/20 sm:px-6 sm:py-3"
          : variant === 'menu'
          ? "w-full justify-start gap-3 h-12 px-4 rounded-xl font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all border border-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          : "fixed bottom-6 right-6 z-[9999] rounded-full shadow-[0_0_30px_rgba(212,175,55,0.5)] bg-gradient-to-r from-primary to-gold-light hover:scale-110 active:scale-95 transition-all duration-300 flex items-center gap-2 px-6 py-8 border-2 border-white/40 animate-pulse",
        isInstalled && "animate-none shadow-none bg-green-500/10 border-green-500/50",
        className
      )}
    >
      {isInstalling ? (
        <Loader2 className={cn(
          "animate-spin",
          variant === 'hero' ? "w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" : "w-6 h-6 text-primary"
        )} />
      ) : isInstalled ? (
        <ExternalLink className={cn(
          variant === 'hero' ? "w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" : "w-6 h-6 text-primary"
        )} />
      ) : isIOS ? (
        <Info className={cn(
          variant === 'hero' ? "w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" : "w-6 h-6 text-primary"
        )} />
      ) : (
        <Download className={cn(
          variant === 'hero' ? "w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" : "w-6 h-6 text-primary", 
          "animate-bounce group-hover:animate-none"
        )} />
      )}
      <span className={cn(
        "font-bold uppercase tracking-wider",
        variant === 'hero' ? "text-xs sm:text-base text-white" : "text-lg bg-gradient-to-r from-primary to-gold-light bg-clip-text text-transparent",
        isInstalled && "text-green-500 bg-none"
      )}>
        {isInstalling ? "Installing..." : isInstalled ? "View in App" : isIOS ? "How to Install" : "Install App"}
      </span>
    </Button>
  );
}
