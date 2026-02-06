import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  Home, 
  Wallet, 
  User, 
  Settings,
  LayoutDashboard
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', page: 'Dashboard' },
  { icon: Wallet, label: 'Apply', page: 'ApplyLoan' },
  { icon: User, label: 'Profile', page: 'Profile' }
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const auth = await base44.auth.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  // Pages that don't need the bottom nav
  const noNavPages = ['Home', 'VerifyEmployment'];
  const showNav = isAuthenticated && !noNavPages.includes(currentPageName);

  // Admin pages - show admin nav instead
  const isAdminPage = currentPageName?.startsWith('Admin');

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      
      {/* Bottom Navigation */}
      {showNav && !isAdminPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
          <div className="max-w-lg mx-auto flex justify-around">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex flex-col items-center py-2 px-4 rounded-xl transition ${
                    isActive 
                      ? 'text-emerald-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <Link
                to={createPageUrl('AdminDashboard')}
                className={`flex flex-col items-center py-2 px-4 rounded-xl transition ${
                  currentPageName === 'AdminDashboard' 
                    ? 'text-emerald-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">Admin</span>
              </Link>
            )}
          </div>
        </nav>
      )}

      <style>{`
        .safe-area-pb {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}