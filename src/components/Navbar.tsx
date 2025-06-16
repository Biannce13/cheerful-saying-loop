import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Gamepad2, 
  Plus, 
  Minus, 
  History, 
  User, 
  LogOut,
  Settings,
  Users,
  CreditCard,
  Banknote,
  Cog
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const userNavItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/game', icon: Gamepad2, label: 'Play Mines' },
    { path: '/deposit', icon: Plus, label: 'Deposit' },
    { path: '/withdraw', icon: Minus, label: 'Withdraw' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/settings', icon: Cog, label: 'Settings' },
  ];

  const adminNavItems = [
    { path: '/admin', icon: Settings, label: 'Admin Panel' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/deposits', icon: CreditCard, label: 'Deposits' },
    { path: '/admin/withdrawals', icon: Banknote, label: 'Withdrawals' },
  ];

  const navItems = user.is_admin ? adminNavItems : userNavItems;

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <Gamepad2 className="h-8 w-8 text-yellow-400" />
                <span className="text-xl font-bold text-white">MineX</span>
              </Link>
              
              <div className="flex space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-300 hover:bg-purple-600/20 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:block">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {!user.is_admin && (
                <div className="text-white">
                  <span className="text-sm text-gray-300">Balance: </span>
                  <span className="font-bold text-yellow-400">₹{user.balance?.toFixed(2) || '0.00'}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-white">
                <User className="h-4 w-4" />
                <span className="text-sm">{user.username}</span>
              </div>
              
              <button
                onClick={handleLogoutClick}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <LogOut className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Confirm Logout</h3>
              <p className="text-gray-300">Are you sure you want to logout?</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Yes, Logout
              </button>
              
              <button
                onClick={cancelLogout}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
