
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, Lock, CreditCard, Mail, MessageCircle, AlertTriangle } from 'lucide-react';
import { BankDetails } from '../types';

export function Settings() {
  const { user } = useAuth();
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/bank-details', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBankDetails(data);
      }
    } catch (error) {
      console.error('Failed to fetch bank details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <SettingsIcon className="h-16 w-16 text-purple-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
        <p className="text-gray-300">Manage your account preferences and security</p>
      </div>

      {/* Important Notice */}
      <div className="mb-8 p-6 bg-blue-500/20 border border-blue-500/30 rounded-xl">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-blue-400 mt-1" />
          <div>
            <h3 className="text-blue-300 font-medium mb-2">Important Security Notice</h3>
            <p className="text-blue-200 text-sm mb-2">
              Use a valid email and save your password securely. It helps us recover your account safely.
            </p>
            <p className="text-blue-200 text-sm">
              For any account changes or issues, contact our support team on Telegram: <strong>@vim29</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Account Information */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Account Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p className="text-gray-400 text-xs mt-1">Username cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p className="text-gray-400 text-xs mt-1">Contact admin to update email</p>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Bank Details
          </h3>
          
          {bankDetails ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={bankDetails.bank_name}
                  disabled
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                <input
                  type="text"
                  value={`****${bankDetails.account_number.slice(-4)}`}
                  disabled
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Holder</label>
                <input
                  type="text"
                  value={bankDetails.account_holder_name}
                  disabled
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
              
              {bankDetails.is_locked && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">
                    <Lock className="h-4 w-4 inline mr-1" />
                    Bank details are locked for security
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-300">No bank details saved</p>
              <p className="text-gray-400 text-sm">Bank details will be saved on first withdrawal</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="text-center">
            <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Password Reset</h3>
            <p className="text-gray-300 text-sm mb-4">
              Contact admin via Telegram to reset your password if you forgot it.
            </p>
            <a
              href="https://t.me/vim29"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Contact Admin</span>
            </a>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="text-center">
            <CreditCard className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Bank Change</h3>
            <p className="text-gray-300 text-sm mb-4">
              Changing bank details is manual. Contact @vim29 with valid proof.
            </p>
            <a
              href="https://t.me/vim29"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Request Change</span>
            </a>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="text-center">
            <Mail className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Email Update</h3>
            <p className="text-gray-300 text-sm mb-4">
              Please use your original email while registering to avoid login issues later.
            </p>
            <a
              href="https://t.me/vim29"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* Security Requirements */}
      <div className="mt-8 p-6 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
        <h3 className="text-yellow-300 font-medium mb-3">Security Verification Requirements</h3>
        <p className="text-yellow-200 text-sm mb-3">
          When contacting admin for password reset or bank changes, you must provide:
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 list-disc list-inside">
          <li>Username and registered email ID</li>
          <li>Receipt of last deposit (screenshot or transaction ID)</li>
          <li>Last 4 digits of bank account used for withdrawals</li>
          <li>For bank changes: First page of new bank passbook and deposit receipt</li>
        </ul>
      </div>
    </div>
  );
}
