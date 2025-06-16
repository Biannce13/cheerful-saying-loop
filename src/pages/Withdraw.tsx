import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Banknote, AlertCircle, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BankDetails } from '../types';

export function Withdraw() {
  const { user, refreshUser } = useAuth();
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fetchingBank, setFetchingBank] = useState(true);

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
        
        // Pre-fill form if bank details exist and are locked
        if (data && data.is_locked) {
          setFormData({
            amount: '',
            bankName: data.bank_name,
            accountNumber: data.account_number,
            ifscCode: data.ifsc_code,
            accountHolderName: data.account_holder_name,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch bank details:', error);
    } finally {
      setFetchingBank(false);
    }
  };

  const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    
    // Don't allow editing locked bank details
    if (bankDetails?.is_locked && ['bankName', 'accountNumber', 'ifscCode', 'accountHolderName'].includes(name)) {
      return;
    }
    
    let processedValue = value;
    
    // Trim whitespace for specific fields
    if (['accountNumber', 'ifscCode', 'amount'].includes(name)) {
      processedValue = value.replace(/\s/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const validateForm = () => {
    const { amount } = formData;
    
    // Amount validation
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount < 100) {
      return 'Minimum withdrawal amount is ₹100';
    }
    
    if (withdrawAmount % 50 !== 0) {
      return 'Withdrawal amount must be in multiples of ₹50';
    }
    
    if (withdrawAmount > (user?.balance || 0)) {
      return 'Insufficient balance';
    }

    // If bank details are not locked, validate them
    if (!bankDetails?.is_locked) {
      const { bankName, accountNumber, ifscCode, accountHolderName } = formData;
      
      if (!bankName.trim()) {
        return 'Bank name is required';
      }
      
      if (!/^\d{9,18}$/.test(accountNumber)) {
        return 'Account number must be 9-18 digits';
      }
      
      if (!/^[A-Z0-9]{11}$/.test(ifscCode.toUpperCase())) {
        return 'IFSC code must be 11 alphanumeric characters';
      }
      
      if (!/^[A-Za-z\s]+$/.test(accountHolderName)) {
        return 'Account holder name must contain only alphabets';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Check withdrawal eligibility
    if (!user?.initial_deposit_made) {
      setError('Initial deposit of ₹100 required before withdrawal');
      return;
    }
    
    if ((user?.total_bets || 0) < (user?.required_bet_amount || 200)) {
      setError(`Minimum ₹${(user?.required_bet_amount || 200).toFixed(2)} in bets required to withdraw`);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/withdraw/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode.toUpperCase(),
          accountHolderName: formData.accountHolderName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(true);
      await refreshUser();
      
      // If bank details were saved for the first time, update local state
      if (data.bankLocked && !bankDetails?.is_locked) {
        setBankDetails({
          bank_name: formData.bankName,
          account_number: formData.accountNumber,
          ifsc_code: formData.ifscCode,
          account_holder_name: formData.accountHolderName,
          is_locked: true
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      bankName: bankDetails?.is_locked ? bankDetails.bank_name : '',
      accountNumber: bankDetails?.is_locked ? bankDetails.account_number : '',
      ifscCode: bankDetails?.is_locked ? bankDetails.ifsc_code : '',
      accountHolderName: bankDetails?.is_locked ? bankDetails.account_holder_name : '',
    });
    setSuccess(false);
    setError('');
  };

  // Don't allow admin to withdraw
  if (user?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center">
            <Banknote className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-300 mb-8">Admin accounts cannot make withdrawals</p>
            <Link
              to="/admin"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200"
            >
              Go to Admin Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Withdrawal Submitted</h2>
            <p className="text-gray-300">Your withdrawal request has been submitted successfully</p>
          </div>

          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg mb-8">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-blue-300 font-medium">Request Under Review</p>
                <p className="text-blue-200 text-sm">Your withdrawal request is being reviewed by our team. You'll receive the funds once approved.</p>
              </div>
            </div>
          </div>

          {bankDetails?.is_locked && (
            <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg mb-8">
              <div className="flex items-center space-x-3">
                <Lock className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-green-300 font-medium">Bank Details Secured</p>
                  <p className="text-green-200 text-sm">Your bank details have been saved and locked for security. Contact @vim29 to change them.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={resetForm}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
            >
              New Withdrawal
            </button>
            
            <Link
              to="/dashboard"
              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user || fetchingBank) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const canWithdraw = user.initial_deposit_made && (user.total_bets || 0) >= (user.required_bet_amount || 200);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
        <div className="text-center mb-8">
          <Banknote className="h-16 w-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Withdraw Funds</h2>
          <p className="text-gray-300">Cash out your winnings to your bank account</p>
        </div>

        {!canWithdraw && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-yellow-300 font-medium">Withdrawal Requirements</p>
                <div className="text-yellow-200 text-sm mt-1">
                  {!user.initial_deposit_made && <p>• Make an initial deposit of ₹100 or more</p>}
                  {(user.total_bets || 0) < (user.required_bet_amount || 200) && (
                    <p>• Place bets worth ₹{((user.required_bet_amount || 200) - (user.total_bets || 0)).toFixed(2)} more</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {bankDetails?.is_locked && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-blue-300 font-medium">Bank Details Locked</p>
                <p className="text-blue-200 text-sm">
                  Once submitted, your bank account cannot be changed. Contact @vim29 to update bank details.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Withdrawal Amount (₹)
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              min="100"
              step="50"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="Enter amount (minimum ₹100, multiples of ₹50)"
              required
            />
            <p className="text-gray-400 text-sm mt-1">
              Available balance: ₹{user.balance?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bank Name
            </label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              disabled={bankDetails?.is_locked}
              className={`w-full px-4 py-3 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                bankDetails?.is_locked ? 'bg-gray-700/50 cursor-not-allowed' : 'bg-white/10'
              }`}
              placeholder="Enter your bank name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account Number
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              disabled={bankDetails?.is_locked}
              className={`w-full px-4 py-3 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                bankDetails?.is_locked ? 'bg-gray-700/50 cursor-not-allowed' : 'bg-white/10'
              }`}
              placeholder="Enter account number (9-18 digits)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              IFSC Code
            </label>
            <input
              type="text"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              disabled={bankDetails?.is_locked}
              className={`w-full px-4 py-3 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                bankDetails?.is_locked ? 'bg-gray-700/50 cursor-not-allowed' : 'bg-white/10'
              }`}
              placeholder="Enter IFSC code (11 characters)"
              maxLength={11}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account Holder Name
            </label>
            <input
              type="text"
              name="accountHolderName"
              value={formData.accountHolderName}
              onChange={handleChange}
              disabled={bankDetails?.is_locked}
              className={`w-full px-4 py-3 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                bankDetails?.is_locked ? 'bg-gray-700/50 cursor-not-allowed' : 'bg-white/10'
              }`}
              placeholder="Enter account holder name"
              required
            />
          </div>

          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> Withdrawal requests are processed manually by our team. 
              Please ensure all bank details are correct to avoid delays.
              {!bankDetails?.is_locked && (
                <span className="block mt-2 font-medium">
                  Your bank details will be saved and locked after first withdrawal for security.
                </span>
              )}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !canWithdraw}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Banknote className="h-5 w-5" />
            <span>{loading ? 'Submitting...' : 'Submit Withdrawal Request'}</span>
          </button>

          <div className="text-center">
            <Link
              to="/dashboard"
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
