
import { useState, useEffect } from 'react';
import { Users, Search, Eye, DollarSign, ArrowLeft, Edit, Save, X } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  initial_deposit_made: boolean;
  total_bets: number;
  total_deposited: number;
  total_withdrawn: number;
  pending_deposits: number;
  pending_withdrawals: number;
  created_at: string;
}

interface UserDetails {
  user: User;
  bankDetails: any;
  deposits: any[];
  withdrawals: any[];
  games: any[];
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState({
    email: '',
    password: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: ''
    }
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    setUserLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data);
        setEditData({
          email: data.user?.email || '',
          password: '',
          bankDetails: data.bankDetails ? {
            bankName: data.bankDetails.bank_name || '',
            accountNumber: data.bankDetails.account_number || '',
            ifscCode: data.bankDetails.ifsc_code || '',
            accountHolderName: data.bankDetails.account_holder_name || ''
          } : {
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            accountHolderName: ''
          }
        });
      } else {
        setError('Failed to fetch user details');
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      setError('Failed to fetch user details');
    } finally {
      setUserLoading(false);
    }
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/user/${selectedUser.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: editData.email !== selectedUser.user.email ? editData.email : undefined,
          password: editData.password || undefined,
          bankDetails: editData.bankDetails.bankName ? editData.bankDetails : undefined
        }),
      });

      if (response.ok) {
        setEditMode(false);
        fetchUserDetails(selectedUser.user.id); // Refresh user details
        alert('User updated successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const safeFormatCurrency = (value: any) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => {
              setError('');
              fetchUsers();
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // User Details Modal
  if (selectedUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-center">
            {error}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedUser(null);
              setError('');
            }}
            className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Users</span>
          </button>
          
          <div className="flex space-x-2">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit User</span>
              </button>
            ) : (
              <>
                <button
                  onClick={saveUserChanges}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">User Details: {selectedUser.user?.username || 'Unknown'}</h2>
          <p className="text-gray-300 mb-4">User ID: {selectedUser.user?.id || 'N/A'}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500/20 rounded-lg p-4">
              <p className="text-blue-300 text-sm">Email</p>
              {editMode ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
              ) : (
                <p className="text-white font-medium">{selectedUser.user?.email || 'N/A'}</p>
              )}
            </div>
            <div className="bg-green-500/20 rounded-lg p-4">
              <p className="text-green-300 text-sm">Current Balance</p>
              <p className="text-white font-medium">₹{safeFormatCurrency(selectedUser.user?.balance)}</p>
            </div>
            <div className="bg-purple-500/20 rounded-lg p-4">
              <p className="text-purple-300 text-sm">Total Deposited</p>
              <p className="text-white font-medium">₹{safeFormatCurrency(selectedUser.user?.total_deposited)}</p>
            </div>
            <div className="bg-red-500/20 rounded-lg p-4">
              <p className="text-red-300 text-sm">Total Withdrawn</p>
              <p className="text-white font-medium">₹{safeFormatCurrency(selectedUser.user?.total_withdrawn)}</p>
            </div>
          </div>

          {editMode && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <h3 className="text-yellow-300 font-medium mb-3">Reset Password</h3>
              <input
                type="password"
                value={editData.password}
                onChange={(e) => setEditData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter new password (leave empty to keep current)"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400"
              />
            </div>
          )}
        </div>

        {/* Bank Details Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Bank Details</h3>
          {selectedUser.bankDetails || editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-300 text-sm">Bank Name</p>
                {editMode ? (
                  <input
                    type="text"
                    value={editData.bankDetails.bankName}
                    onChange={(e) => setEditData(prev => ({ 
                      ...prev, 
                      bankDetails: { ...prev.bankDetails, bankName: e.target.value }
                    }))}
                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-medium">{selectedUser.bankDetails?.bank_name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <p className="text-gray-300 text-sm">Account Number</p>
                {editMode ? (
                  <input
                    type="text"
                    value={editData.bankDetails.accountNumber}
                    onChange={(e) => setEditData(prev => ({ 
                      ...prev, 
                      bankDetails: { ...prev.bankDetails, accountNumber: e.target.value }
                    }))}
                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-medium">{selectedUser.bankDetails?.account_number || 'Not provided'}</p>
                )}
              </div>
              <div>
                <p className="text-gray-300 text-sm">IFSC Code</p>
                {editMode ? (
                  <input
                    type="text"
                    value={editData.bankDetails.ifscCode}
                    onChange={(e) => setEditData(prev => ({ 
                      ...prev, 
                      bankDetails: { ...prev.bankDetails, ifscCode: e.target.value }
                    }))}
                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-medium">{selectedUser.bankDetails?.ifsc_code || 'Not provided'}</p>
                )}
              </div>
              <div>
                <p className="text-gray-300 text-sm">Account Holder</p>
                {editMode ? (
                  <input
                    type="text"
                    value={editData.bankDetails.accountHolderName}
                    onChange={(e) => setEditData(prev => ({ 
                      ...prev, 
                      bankDetails: { ...prev.bankDetails, accountHolderName: e.target.value }
                    }))}
                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-medium">{selectedUser.bankDetails?.account_holder_name || 'Not provided'}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No bank details found</p>
          )}
        </div>

        {/* Deposits Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Deposit History</h3>
          {selectedUser.deposits && selectedUser.deposits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">UTR Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {selectedUser.deposits.map((deposit) => (
                    <tr key={deposit?.id || Math.random()}>
                      <td className="px-4 py-3 text-white">₹{safeFormatCurrency(deposit?.amount)}</td>
                      <td className="px-4 py-3 text-white">{deposit?.utr_number || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          deposit?.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          deposit?.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {deposit?.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{formatDateTime(deposit?.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No deposits found</p>
          )}
        </div>

        {/* Withdrawals Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Withdrawal History</h3>
          {selectedUser.withdrawals && selectedUser.withdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Bank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {selectedUser.withdrawals.map((withdrawal) => (
                    <tr key={withdrawal?.id || Math.random()}>
                      <td className="px-4 py-3 text-white">₹{safeFormatCurrency(withdrawal?.amount)}</td>
                      <td className="px-4 py-3 text-white">{withdrawal?.bank_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-white">
                        {withdrawal?.account_number ? `****${withdrawal.account_number.slice(-4)}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          withdrawal?.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                          withdrawal?.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {withdrawal?.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{formatDateTime(withdrawal?.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No withdrawals found</p>
          )}
        </div>

        {/* Games Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Game History</h3>
          {selectedUser.games && selectedUser.games.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Game Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Bet Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Mines</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Winnings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {selectedUser.games.map((game) => (
                    <tr key={game?.id || Math.random()}>
                      <td className="px-4 py-3 text-white font-mono">{game?.game_period || 'N/A'}</td>
                      <td className="px-4 py-3 text-white">₹{safeFormatCurrency(game?.bet_amount)}</td>
                      <td className="px-4 py-3 text-white">{game?.mines_count || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          game?.status === 'won' ? 'bg-green-500/20 text-green-300' :
                          game?.status === 'lost' ? 'bg-red-500/20 text-red-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {game?.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">₹{safeFormatCurrency(game?.winnings)}</td>
                      <td className="px-4 py-3 text-gray-400">{formatDateTime(game?.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No games found</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Users className="h-8 w-8 mr-3" />
          User Management
        </h1>
        <p className="text-gray-300">Manage all registered users</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by username or email..."
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-white">
                {users.filter(user => user.initial_deposit_made).length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending Deposits</p>
              <p className="text-2xl font-bold text-white">
                {users.reduce((sum, user) => sum + (user.pending_deposits || 0), 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-white">
                {users.reduce((sum, user) => sum + (user.pending_withdrawals || 0), 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Deposited
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Withdrawn
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Pending
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
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">₹{safeFormatCurrency(user.balance)}</div>
                      <div className="text-xs text-gray-400">
                        (₹200 bonus + ₹{safeFormatCurrency(user.total_deposited)} deposited)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">₹{safeFormatCurrency(user.total_deposited)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">₹{safeFormatCurrency(user.total_withdrawn)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {(user.pending_deposits || 0) > 0 && (
                          <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs mr-1">
                            {user.pending_deposits} deposits
                          </span>
                        )}
                        {(user.pending_withdrawals || 0) > 0 && (
                          <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                            {user.pending_withdrawals} withdrawals
                          </span>
                        )}
                        {(user.pending_deposits || 0) === 0 && (user.pending_withdrawals || 0) === 0 && (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.initial_deposit_made
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {user.initial_deposit_made ? 'Active' : 'Pending Deposit'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => fetchUserDetails(user.id)}
                        disabled={userLoading}
                        className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300">
              {searchTerm ? 'No users found matching your search' : 'No users registered yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
