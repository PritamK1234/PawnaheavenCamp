import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Calendar, IndianRupee, User, LayoutGrid, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import PWAInstallButton from '../pwa/PWAInstallButton';

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('ownerLoggedIn') === 'true';
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : { propertyName: 'My Property', propertyType: 'Villa' };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/owner');
    }

    // Register Owner-specific Service Worker
    if ('serviceWorker' in navigator && window.location.pathname.startsWith('/owner')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/owner/sw.js', { scope: '/owner' })
          .then(registration => {
            console.log('Owner SW registered:', registration);
          })
          .catch(error => {
            console.log('Owner SW registration failed:', error);
          });
      });
    }

    // Dynamically update manifest for Owner PWA
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (link) {
      link.href = '/owner/manifest.json';
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'manifest';
      newLink.href = '/owner/manifest.json';
      document.head.appendChild(newLink);
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  const isVilla = ownerData.propertyType?.toLowerCase() === 'villa' || ownerData.propertyName?.toLowerCase().includes('villa');
  const dashboardPath = isVilla ? '/owner/dashboard/villa' : '/owner/dashboard/camping';
  const profilePath = isVilla ? '/owner/profile/villa' : '/owner/profile/camping';

  const navItems = [
    { label: 'Calendar & Prices', icon: Calendar, path: dashboardPath },
    { label: 'Units', icon: LayoutGrid, path: '/owner/units', showIf: !isVilla },
    { label: 'Profile', icon: User, path: profilePath },
  ].filter(item => item.showIf === undefined || item.showIf);

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="bg-[#1A1A1A] border-b border-[#D4AF37]/20 px-4 py-5 flex flex-col space-y-2 sticky top-0 z-40 shadow-2xl">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-1">Owner Portal</h1>
            <span className="text-lg font-bold text-white leading-tight truncate max-w-[180px] sm:max-w-none">{ownerData.propertyName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <PWAInstallButton />
            <span className="hidden sm:inline-flex text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">{ownerData.propertyType}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-[#D4AF37]/20 flex justify-around items-center h-20 px-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/owner/dashboard' && location.pathname === '/owner/dashboard');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center space-y-1.5 w-full h-full transition-all duration-300",
                isActive ? "text-[#D4AF37]" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.15)]" : ""
              )}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default OwnerLayout;
