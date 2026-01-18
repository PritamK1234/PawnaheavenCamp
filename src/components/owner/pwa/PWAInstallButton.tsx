import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If the event already fired before we could listen (unlikely but possible)
    // Some browsers might re-fire or we can check a global flag if we set one

    const appInstalledHandler = () => {
      console.log('appinstalled event fired');
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('Install button clicked', !!deferredPrompt);
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  // For testing/debugging, we can force visibility if needed
  // In a real PWA,isVisible will only be true if beforeinstallprompt fired
  if (isInstalled || !isVisible) return null;

  return (
    <Button
      onClick={handleInstallClick}
      className="bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold flex items-center space-x-2 shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse"
    >
      <Download className="w-4 h-4" />
      <span className="hidden xs:inline">Install App</span>
    </Button>
  );
};

export default PWAInstallButton;
