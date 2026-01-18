import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Calendar, IndianRupee, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  const navItems = [
    { label: 'Calendar', icon: Calendar, path: '/owner/dashboard' },
    { label: 'Prices / Rates', icon: IndianRupee, path: '/owner/rates' },
    { label: 'Profile', icon: User, path: '/owner/profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-4 flex flex-col space-y-1">
        <h1 className="text-lg font-bold text-blue-600">Owner Dashboard</h1>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">{ownerData.propertyName}</span>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{ownerData.propertyType}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 px-4 z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/owner/dashboard' && location.pathname === '/owner/dashboard');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 w-full h-full",
                isActive ? "text-blue-600" : "text-gray-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default OwnerLayout;
