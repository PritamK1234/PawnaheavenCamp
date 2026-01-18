import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Listen for the beforeinstallprompt event
    const handler = (e: any) => {
      console.log('PWA: beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 3. Listen for successful installation
    const appInstalledHandler = () => {
      console.log('PWA: appinstalled event fired');
      setIsInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', appInstalledHandler);

    // 4. Fallback for testing: show button if not standalone (Optional - but helps if event is missed)
    // However, the prompt() method ONLY works if we have the event.
    // So we must rely on the event.

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('PWA: No install prompt available');
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowButton(false);
    }
  };

  // Only show if not installed AND we have the prompt event
  if (isInstalled || !showButton) return null;

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
