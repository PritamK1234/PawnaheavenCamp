import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Calendar, IndianRupee, User, LayoutGrid, Info, ClipboardList, Share2, Phone, MessageCircle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PWAInstallButton from '../pwa/PWAInstallButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('ownerLoggedIn') === 'true';
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : { propertyName: 'My Property', propertyType: 'Villa' };
  const ownerMobile = ownerData?.owner_otp_number || ownerData?.ownerNumber || ownerData?.mobileNumber || ownerData?.mobile || '';
  const ownerPropertyId = ownerData?.property_id || ownerData?.propertyId || '';

  const [showContactModal, setShowContactModal] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/owner');
    }

    if (window.location.hostname.includes('pawnahavencamp.shop')) {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (link) {
        link.href = '/manifest-owner.json';
      }
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  const isVilla = ownerData.propertyType?.toLowerCase() === 'villa' || ownerData.propertyName?.toLowerCase().includes('villa');
  const dashboardPath = isVilla ? '/owner/dashboard/villa' : '/owner/dashboard/camping';
  const profilePath = isVilla ? '/owner/profile/villa' : '/owner/profile/camping';

  const unitsPath = isVilla ? '/owner/units/villa' : '/owner/units';

  const navItems = [
    { label: 'Calendar', icon: Calendar, path: dashboardPath },
    { label: 'Bookings', icon: ClipboardList, path: '/owner/bookings' },
    { label: 'Units', icon: LayoutGrid, path: unitsPath },
    { label: 'Profile', icon: User, path: profilePath },
  ];

  const handleReferralClick = async () => {
    if (!ownerPropertyId) {
      setShowContactModal(true);
      return;
    }

    setReferralLoading(true);
    try {
      const res = await fetch(`/api/referrals/owner-lookup-property/${ownerPropertyId}`);
      const result = await res.json();

      if (result.found && result.data?.referral_code) {
        const loginRes = await fetch('/api/referrals/owner-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: ownerPropertyId }),
        });
        const loginData = await loginRes.json();
        if (loginData.success && loginData.token) {
          localStorage.setItem('referral_token', loginData.token);
          navigate('/referral/check?from=owner');
        } else {
          setShowContactModal(true);
        }
      } else {
        setShowContactModal(true);
      }
    } catch (e) {
      console.error('Referral lookup failed:', e);
      setShowContactModal(true);
    } finally {
      setReferralLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="bg-[#1A1A1A] border-b border-[#D4AF37]/20 px-3 py-3 sticky top-0 z-[60] shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0 flex-shrink">
            <h1 className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#D4AF37] leading-none mb-0.5">Owner Portal</h1>
            <span className="text-sm font-bold text-white leading-tight truncate">
              {ownerData.propertyName}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <PWAInstallButton />
            
            <button 
              onClick={handleReferralClick}
              disabled={referralLoading}
              className="flex items-center gap-1 px-2 py-1.5 bg-[#D4AF37] hover:bg-[#B8962E] text-black rounded-md transition-all duration-300 shadow-[0_0_10px_rgba(212,175,55,0.2)] group disabled:opacity-70"
            >
              {referralLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Share2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[10px] font-bold whitespace-nowrap">Referral</span>
            </button>
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
              <span className="text-[10px] font-bold Capatalize tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-center font-display text-lg">
              Referral Code Not Available
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-400 text-center leading-relaxed">
              You don't have a referral code generated yet. Please contact admin to generate a referral code and earn more on bookings.
            </p>
            <div className="flex gap-3">
              <a
                href="tel:8806092609"
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">Call Admin</span>
              </a>
              <a
                href="https://wa.me/918806092609"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">WhatsApp</span>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerLayout;
