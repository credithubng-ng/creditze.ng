import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { 
  Home, 
  Wallet, 
  User,
  LayoutDashboard,
  MessageSquare,
  AlertTriangle,
  LogOut
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', page: 'Dashboard' },
  { icon: Wallet, label: 'Apply', page: 'ApplyLoan' },
  { icon: MessageSquare, label: 'Disputes', page: 'MyDisputes' },
  { icon: User, label: 'Profile', page: 'Profile' }
];

export default function Layout({ children, currentPageName }) {
  const { user, isAuthenticated, logout } = useAuth();

  // Pages that don't need the bottom nav
  const noNavPages = ['Home', 'Login', 'VerifyEmployment'];
  const showNav = isAuthenticated && !noNavPages.includes(currentPageName);

  // Admin pages - show admin nav instead
  const isAdminPage = currentPageName?.startsWith('Admin');

  const handleLogout = async () => {
    await logout(true, createPageUrl('Home'));
  };

  return (
    <div className="creditze-shell">
      {/* Logout Button - Fixed Top Right */}
      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="fixed top-4 right-4 z-50 grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-white/85 shadow-lg backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-red-50 group"
          title="Logout"
        >
          <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
        </button>
      )}
      
      {children}
      
      {/* Bottom Navigation */}
      {showNav && !isAdminPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 safe-area-pb">
          <div className="creditze-glass max-w-xl mx-auto flex justify-around rounded-[1.4rem] px-2 py-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex min-w-[4.25rem] flex-col items-center rounded-xl px-3 py-2 transition ${
                    isActive 
                      ? 'bg-emerald-950 text-white shadow-md'
                      : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <>
                <Link
                  to={createPageUrl('AdminLoanReview')}
                  className={`flex flex-col items-center py-2 px-4 rounded-xl transition relative ${
                    currentPageName === 'AdminLoanReview' 
                      ? 'text-amber-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                  <span className="text-xs mt-1 font-medium">Review</span>
                </Link>
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
              </>
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
