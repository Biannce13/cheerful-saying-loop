
import { useState, useEffect } from 'react';
import { Banknote, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

interface Withdrawal {
  id: number;
  username: string;
  amount: number;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  status: string;
  created_at: string;
}

export function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/withdrawals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (withdrawalId: number) => {
    setProcessing(withdrawalId);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove the approved withdrawal from the list
        setWithdrawals(withdrawals.filter(withdrawal => withdrawal.id !== withdrawalId));
        setSelectedWithdrawal(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve withdrawal');
      }
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
      alert('Failed to approve withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const rejectWithdrawal = async (withdrawalId: number) => {
    setProcessing(withdrawalId);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove the rejected withdrawal from the list
        setWithdrawals(withdrawals.filter(withdrawal => withdrawal.id !== withdrawalId));
        setSelectedWithdrawal(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject withdrawal');
      }
    } catch (error) {
      console.error('Failed to reject withdrawal:', error);
      alert('Failed to reject withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading withdrawals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Banknote className="h-8 w-8 mr-3" />
          Withdrawal Management
        </h1>
        <p className="text-gray-300">Review and process withdrawal requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-white">{withdrawals.length}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Amount</p>
              <p className="text-2xl font-bold text-white">
                ₹{withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0).toFixed(2)}
              </p>
            </div>
            <Banknote className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Average Amount</p>
              <p className="text-2xl font-bold text-white">
                ₹{withdrawals.length > 0 ? (withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) / withdrawals.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {withdrawals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Bank Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{withdrawal.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">₹{withdrawal.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        <div>{withdrawal.bank_name}</div>
                        <div className="text-gray-400">{maskAccountNumber(withdrawal.account_number)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{formatDate(withdrawal.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => approveWithdrawal(withdrawal.id)}
                        disabled={processing === withdrawal.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        {processing === withdrawal.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => rejectWithdrawal(withdrawal.id)}
                        disabled={processing === withdrawal.id}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Banknote className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300">No pending withdrawals</p>
            <p className="text-gray-400 text-sm">All withdrawal requests have been processed</p>
          </div>
        )}
      </div>

      {/* Withdrawal Details Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <Banknote className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Withdrawal Details</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-gray-400 text-sm">User</p>
                <p className="text-white font-medium">{selectedWithdrawal.username}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Amount</p>
                <p className="text-white font-medium">₹{selectedWithdrawal.amount.toFixed(2)}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Bank Name</p>
                <p className="text-white font-medium">{selectedWithdrawal.bank_name}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Account Holder</p>
                <p className="text-white font-medium">{selectedWithdrawal.account_holder_name}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Account Number</p>
                <p className="text-white font-medium">{selectedWithdrawal.account_number}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">IFSC Code</p>
                <p className="text-white font-medium">{selectedWithdrawal.ifsc_code}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Request Date</p>
                <p className="text-white font-medium">{formatDate(selectedWithdrawal.created_at)}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => approveWithdrawal(selectedWithdrawal.id)}
                disabled={processing === selectedWithdrawal.id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{processing === selectedWithdrawal.id ? 'Processing...' : 'Approve'}</span>
              </button>
              
              <button
                onClick={() => rejectWithdrawal(selectedWithdrawal.id)}
                disabled={processing === selectedWithdrawal.id}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <XCircle className="h-4 w-4" />
                <span>Reject</span>
              </button>
              
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
