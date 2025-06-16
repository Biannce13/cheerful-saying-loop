import { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, Eye, QrCode } from 'lucide-react';

interface Deposit {
  id: number;
  username: string;
  amount: number;
  status: string;
  details: string;
  utr_number: string;
  created_at: string;
}

export function AdminDeposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/deposits', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeposits(data);
      }
    } catch (error) {
      console.error('Failed to fetch deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveDeposit = async (depositId: number) => {
    setProcessing(depositId);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/deposits/${depositId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove the approved deposit from the list
        setDeposits(deposits.filter(deposit => deposit.id !== depositId));
        setSelectedDeposit(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve deposit');
      }
    } catch (error) {
      console.error('Failed to approve deposit:', error);
      alert('Failed to approve deposit');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getQRCode = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      return parsed.qrCode;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading deposits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <CreditCard className="h-8 w-8 mr-3" />
          Deposit Management
        </h1>
        <p className="text-gray-300">Review and approve pending deposits</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending Deposits</p>
              <p className="text-2xl font-bold text-white">{deposits.length}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Amount</p>
              <p className="text-2xl font-bold text-white">
                ₹{deposits.reduce((sum, deposit) => sum + deposit.amount, 0).toFixed(2)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Average Amount</p>
              <p className="text-2xl font-bold text-white">
                ₹{deposits.length > 0 ? (deposits.reduce((sum, deposit) => sum + deposit.amount, 0) / deposits.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {deposits.length > 0 ? (
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
                    UTR Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{deposit.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">₹{deposit.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white font-mono">{deposit.utr_number || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{formatDate(deposit.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedDeposit(deposit)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => approveDeposit(deposit.id)}
                        disabled={processing === deposit.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        {processing === deposit.id ? 'Approving...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300">No pending deposits</p>
            <p className="text-gray-400 text-sm">All deposits have been processed</p>
          </div>
        )}
      </div>

      {/* Deposit Details Modal */}
      {selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <QrCode className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Deposit Details</h3>
              <p className="text-gray-300">User: {selectedDeposit.username}</p>
              <p className="text-gray-300">Amount: ₹{selectedDeposit.amount.toFixed(2)}</p>
              <p className="text-gray-300">UTR: {selectedDeposit.utr_number || 'N/A'}</p>
              <p className="text-gray-300 text-sm">Date: {formatDate(selectedDeposit.created_at)}</p>
            </div>

            {getQRCode(selectedDeposit.details) && (
              <div className="text-center mb-6">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img 
                    src={getQRCode(selectedDeposit.details)} 
                    alt="Payment QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">Payment QR Code</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => approveDeposit(selectedDeposit.id)}
                disabled={processing === selectedDeposit.id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {processing === selectedDeposit.id ? 'Approving...' : 'Approve Deposit'}
              </button>
              <button
                onClick={() => setSelectedDeposit(null)}
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
