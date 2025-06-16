
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  User,
  Settings,
  History,
  Wallet,
  CreditCard,
  Menu,
  X,
  Shield,
  Home,
  Gamepad2,
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (!user) return null;

  return (
    <>
      <nav className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <Gamepad2 className="h-8 w-8 text-yellow-400" />
                <span className="text-xl font-bold text-white hidden sm:block">
                  MineX
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/game"
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>Game</span>
              </Link>
              <Link
                to="/history"
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <History className="h-4 w-4" />
                <span>History</span>
              </Link>
              <Link
                to="/deposit"
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <CreditCard className="h-4 w-4" />
                <span>Deposit</span>
              </Link>
              <Link
                to="/withdraw"
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <Wallet className="h-4 w-4" />
                <span>Withdraw</span>
              </Link>
              {user.is_admin && (
                <Link
                  to="/admin"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center space-x-1"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              )}
            </div>

            {/* User Info and Actions - Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white font-medium text-sm">
                  {user.username}
                </div>
                <div className="text-yellow-400 font-bold text-sm">
                  ₹{user.balance?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/settings"
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-300" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800">
            <div className="px-4 py-4 space-y-4">
              {/* User Info - Mobile */}
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-800">
                <div className="p-2 bg-gray-800 rounded-full">
                  <User className="h-5 w-5 text-gray-300" />
                </div>
                <div>
                  <div className="text-white font-medium">{user.username}</div>
                  <div className="text-yellow-400 font-bold">
                    ₹{user.balance?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              {/* Navigation Links - Mobile */}
              <div className="space-y-2">
                <Link
                  to="/"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <Home className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/game"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <Gamepad2 className="h-5 w-5" />
                  <span>Game</span>
                </Link>
                <Link
                  to="/history"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <History className="h-5 w-5" />
                  <span>History</span>
                </Link>
                <Link
                  to="/deposit"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Deposit</span>
                </Link>
                <Link
                  to="/withdraw"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <Wallet className="h-5 w-5" />
                  <span>Withdraw</span>
                </Link>
                {user.is_admin && (
                  <Link
                    to="/admin"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 text-yellow-400 hover:text-yellow-300 transition-colors py-2"
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                <Link
                  to="/settings"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              </div>

              {/* Logout Button - Mobile */}
              <div className="pt-4 border-t border-gray-800">
                <button
                  onClick={() => {
                    closeMobileMenu();
                    handleLogout();
                  }}
                  className="flex items-center space-x-3 text-red-400 hover:text-red-300 transition-colors py-2 w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
}
