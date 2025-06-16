import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { QrCode, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Deposit() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showUtrInput, setShowUtrInput] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');

  const generateQR = async () => {
    const depositAmount = parseFloat(amount);
    
    if (!depositAmount || depositAmount < 100) {
      setError('Minimum deposit amount is ₹100');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate UPI QR code first
      const upiId = 'merchant@upi'; // Replace with actual UPI ID
      const upiUrl = `upi://pay?pa=${upiId}&pn=MinesGame&am=${depositAmount}&cu=INR&tn=Deposit-${Date.now()}`;
      
      const QRCode = await import('qrcode');
      const qrCode = await QRCode.toDataURL(upiUrl);
      
      setQrCode(qrCode);
      setShowUtrInput(true);
    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleUtrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits and limit to 12 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 12);
    setUtrNumber(cleanValue);
  };

  const submitDeposit = async () => {
    if (!utrNumber || utrNumber.length !== 12) {
      setError('UTR number must be exactly 12 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/deposit/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount: parseFloat(amount),
          utrNumber: utrNumber
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit deposit');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setUtrNumber('');
    setQrCode('');
    setSuccess(false);
    setShowUtrInput(false);
    setError('');
  };

  // Don't allow admin to deposit
  if (user?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center">
            <QrCode className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-300 mb-8">Admin accounts cannot make deposits</p>
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
            <h2 className="text-3xl font-bold text-white mb-2">Deposit Submitted</h2>
            <p className="text-gray-300">Your deposit request has been submitted successfully</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-blue-300 font-medium">Payment Pending</p>
                  <p className="text-blue-200 text-sm">Your deposit will be approved by admin after payment verification</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm">
                <strong>Important:</strong> Your deposit with UTR: <strong>{utrNumber}</strong> is being processed. 
                Your balance will be updated once the deposit is verified.
              </p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={resetForm}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
            >
              New Deposit
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

  if (showUtrInput && qrCode) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <QrCode className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Complete Payment</h2>
            <p className="text-gray-300">Scan the QR code and enter your UTR number</p>
          </div>

          <div className="text-center mb-8">
            <div className="bg-white p-6 rounded-2xl inline-block">
              <img src={qrCode} alt="UPI QR Code" className="w-64 h-64 mx-auto" />
            </div>
            <p className="text-gray-400 text-sm mt-2">Scan with any UPI app to pay ₹{amount}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-center">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                UTR Number / Transaction ID (12 digits)
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={handleUtrChange}
                maxLength={12}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-mono text-lg tracking-wider"
                placeholder="123456789012"
                required
              />
              <p className="text-gray-400 text-sm mt-1">
                Enter exactly 12 digits from your payment confirmation ({utrNumber.length}/12)
              </p>
            </div>

            <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <strong>Steps:</strong><br />
                1. Scan the QR code with your UPI app<br />
                2. Complete the payment of ₹{amount}<br />
                3. Copy the 12-digit UTR/Transaction ID from your payment confirmation<br />
                4. Enter it above and click "Submit Deposit"
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={submitDeposit}
                disabled={loading || utrNumber.length !== 12}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Deposit'}
              </button>
              
              <button
                onClick={resetForm}
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
        <div className="text-center mb-8">
          <QrCode className="h-16 w-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Add Money</h2>
          <p className="text-gray-300">Deposit money to your account via UPI</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-center">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deposit Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              step="1"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="Enter amount (minimum ₹100)"
              required
            />
            <p className="text-gray-400 text-sm mt-1">Minimum deposit: ₹100</p>
          </div>

          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <h3 className="text-blue-300 font-medium mb-2">How it works:</h3>
            <ol className="text-blue-200 text-sm space-y-1">
              <li>1. Enter the amount you want to deposit</li>
              <li>2. Click "Generate QR Code" to create a UPI payment request</li>
              <li>3. Scan the QR code with any UPI app (PhonePe, Paytm, etc.)</li>
              <li>4. Complete the payment in your UPI app</li>
              <li>5. Enter the 12-digit UTR number you receive after payment</li>
              <li>6. Wait for admin approval (usually within minutes)</li>
            </ol>
          </div>

          <button
            onClick={generateQR}
            disabled={loading || !amount}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <QrCode className="h-5 w-5" />
            <span>{loading ? 'Generating...' : 'Generate QR Code'}</span>
          </button>

          <div className="text-center">
            <Link
              to="/dashboard"
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
