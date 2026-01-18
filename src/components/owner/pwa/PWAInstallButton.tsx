import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Info } from 'lucide-react';
import { toast } from 'sonner';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
    }

    // 2. Listen for the beforeinstallprompt event
    const handler = (e: any) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 3. Listen for successful installation
    const appInstalledHandler = () => {
      console.log('PWA: appinstalled event fired');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the official install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA: User response to install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: Instructions for manual installation if the prompt event hasn't fired
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        toast.info("To install: Tap the 'Share' icon and then select 'Add to Home Screen'.", {
          duration: 6000,
          icon: <Info className="w-4 h-4" />
        });
      } else {
        toast.info("To install: Click your browser's menu (three dots) and look for 'Install App' or 'Add to Home Screen'.", {
          duration: 6000,
          icon: <Info className="w-4 h-4" />
        });
      }
    }
  };

  // Only hide if we are 100% sure it's already installed in standalone mode
  if (isInstalled) return null;

  return (
    <Button
      onClick={handleInstallClick}
      className="bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold flex items-center space-x-2 shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse border-none"
      size="sm"
    >
      <Download className="w-4 h-4" />
      <span className="text-[10px] uppercase tracking-wider">Install App</span>
    </Button>
  );
};

export default PWAInstallButton;
