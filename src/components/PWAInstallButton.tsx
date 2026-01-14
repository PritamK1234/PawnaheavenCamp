import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is already installed/running in standalone mode');
      setIsVisible(false);
      return;
    }

    window.addEventListener('beforeinstallprompt', handler);

    // Some browsers (especially on mobile) might not fire beforeinstallprompt 
    // immediately or at all if certain conditions aren't met.
    // For debugging, we can force show it in development or via a query param
    if (window.location.search.includes('force-pwa')) {
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Button 
      onClick={handleInstallClick}
      className="fixed bottom-6 right-6 z-[9999] rounded-full shadow-2xl bg-primary hover:bg-primary/90 flex items-center gap-2 px-6 py-7 border-2 border-white/20 animate-bounce"
    >
      <Download className="w-6 h-6" />
      <span className="font-bold">Install App</span>
    </Button>
  );
}
