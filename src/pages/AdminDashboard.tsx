import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { 
  Users, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  DollarSign,
  Activity,
  Clock,
  Wifi,
  WifiOff,
  Target,
  Shield,
  Edit
} from 'lucide-react';

interface ActivityItem {
  id: number;
  username: string;
  amount: number;
  created_at: string;
  type?: string;
  utr_number?: string;
}

interface StatsData {
  totalUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalBalance: number;
  recentActivity: ActivityItem[];
}

export function AdminDashboard() {
  const { socket, connected, currentPeriod, nextPeriod, timeRemaining } = useSocket();
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalBalance: 0,
    recentActivity: []
  });
  const [currentMinePositions, setCurrentMinePositions] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState('');
  const [hackModeUser, setHackModeUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchCurrentPeriodMines();
  }, [currentPeriod]);

  // Socket event listeners for real-time mine positions
  useEffect(() => {
    if (socket) {
      socket.on('periodUpdate', (data: { minePositions?: number[] }) => {
        if (data.minePositions) {
          setCurrentMinePositions(data.minePositions);
        }
      });

      socket.on('currentMinePositions', (data: { positions: number[] }) => {
        setCurrentMinePositions(data.positions);
      });

      return () => {
        socket.off('periodUpdate');
        socket.off('currentMinePositions');
      };
    }
  }, [socket]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch admin stats
      const statsResponse = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch deposits
      const depositsResponse = await fetch('/api/admin/deposits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch withdrawals
      const withdrawalsResponse = await fetch('/api/admin/withdrawals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statsResponse.ok && depositsResponse.ok && withdrawalsResponse.ok) {
        const statsData = await statsResponse.json();
        const deposits = await depositsResponse.json();
        const withdrawals = await withdrawalsResponse.json();
        
        setStats({
          totalUsers: statsData.total_users || 0,
          pendingDeposits: statsData.pending_deposits || 0,
          pendingWithdrawals: statsData.pending_withdrawals || 0,
          totalBalance: statsData.total_balance || 0,
          recentActivity: [...deposits.slice(0, 3), ...withdrawals.slice(0, 3)]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPeriodMines = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/current-period', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentMinePositions(data.mine_positions);
      }
    } catch (error) {
      console.error('Failed to fetch current period mines:', error);
    }
  };

  const updateUserBalance = async () => {
    if (!selectedUser || !userBalance) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/user/${selectedUser}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ balance: parseFloat(userBalance) }),
      });

      if (response.ok) {
        alert('User balance updated successfully!');
        setSelectedUser(null);
        setUserBalance('');
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update balance');
      }
    } catch (error) {
      console.error('Failed to update user balance:', error);
      alert('Failed to update user balance');
    }
  };

  const toggleHackMode = async (userId: string, enabled: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/user/${userId}/hack-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        alert(`Hack mode ${enabled ? 'enabled' : 'disabled'} for user!`);
        setHackModeUser(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to toggle hack mode');
      }
    } catch (error) {
      console.error('Failed to toggle hack mode:', error);
      alert('Failed to toggle hack mode');
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300">Manage your gaming platform with advanced controls</p>
          </div>
          <div className="flex items-center space-x-2">
            {connected ? (
              <Wifi className="h-5 w-5 text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-400" />
            )}
            <span className={`text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? 'Live Connection' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending Deposits</p>
              <p className="text-2xl font-bold text-white">{stats.pendingDeposits}</p>
            </div>
            <CreditCard className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-white">{stats.pendingWithdrawals}</p>
            </div>
            <Banknote className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Balance</p>
              <p className="text-2xl font-bold text-white">₹{stats.totalBalance.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Real-time Period Display */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-blue-400" />
          <span className="text-blue-300 font-medium">Real-time Game Periods</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Current Period</p>
            <p className="text-white font-mono text-xl">{currentPeriod}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Next Period</p>
            <p className="text-gray-300 font-mono text-lg">{nextPeriod}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Time Remaining</p>
            <p className="text-yellow-400 font-mono text-xl">{formatTime(timeRemaining)}</p>
          </div>
        </div>
      </div>

      {/* Live Mine Positions Display */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2 text-red-400" />
          Live Mine Positions - Period {currentPeriod}
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-300 mb-4">
              Current mine positions (auto-synced from period data):
            </p>
            <div className="grid grid-cols-5 gap-2 max-w-xs">
              {Array.from({ length: 25 }, (_, index) => (
                <div
                  key={index}
                  className={`aspect-square flex items-center justify-center rounded-lg border-2 text-sm font-bold transition-all duration-200 ${
                    currentMinePositions.includes(index)
                      ? 'bg-red-500/30 border-red-500/50 text-red-300 transform scale-110'
                      : 'bg-gray-700/50 border-gray-600/50 text-gray-400'
                  }`}
                >
                  {index}
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">Mine Positions:</p>
              <div className="flex flex-wrap gap-2">
                {currentMinePositions.map(pos => (
                  <span key={pos} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-lg text-sm font-mono">
                    {pos}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <strong>Hack Support:</strong> Use these positions to guide users when providing hack assistance. 
                Users in hack mode will bypass the controlled loss pattern.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* User Balance Control */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            User Balance Control
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User ID
              </label>
              <input
                type="number"
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Enter user ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Balance (₹)
              </label>
              <input
                type="number"
                value={userBalance}
                onChange={(e) => setUserBalance(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Enter new balance"
              />
            </div>
            
            <button
              onClick={updateUserBalance}
              disabled={!selectedUser || !userBalance}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Balance
            </button>
          </div>
        </div>

        {/* Hack Mode Control */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Hack Mode Control
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User ID
              </label>
              <input
                type="number"
                value={hackModeUser || ''}
                onChange={(e) => setHackModeUser(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Enter user ID"
              />
            </div>
            
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm">
                <strong>Hack Mode:</strong> Enables user to bypass controlled loss pattern. 
                Use when providing hack assistance to ensure real wins.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => toggleHackMode(hackModeUser!, true)}
                disabled={!hackModeUser}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enable Hack
              </button>
              
              <button
                onClick={() => toggleHackMode(hackModeUser!, false)}
                disabled={!hackModeUser}
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable Hack
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/admin/users"
          className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-blue-600/30 hover:to-indigo-600/30 transition-all duration-200 transform hover:scale-105"
        >
          <div className="text-center">
            <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Manage Users</h3>
            <p className="text-gray-300 text-sm">View and manage user accounts</p>
          </div>
        </Link>

        <Link
          to="/admin/deposits"
          className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-yellow-600/30 hover:to-orange-600/30 transition-all duration-200 transform hover:scale-105"
        >
          <div className="text-center">
            <CreditCard className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Approve Deposits</h3>
            <p className="text-gray-300 text-sm">Review and approve deposit requests</p>
            {stats.pendingDeposits > 0 && (
              <div className="mt-2">
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {stats.pendingDeposits} pending
                </span>
              </div>
            )}
          </div>
        </Link>

        <Link
          to="/admin/withdrawals"
          className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-200 transform hover:scale-105"
        >
          <div className="text-center">
            <Banknote className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Process Withdrawals</h3>
            <p className="text-gray-300 text-sm">Review and process withdrawal requests</p>
            {stats.pendingWithdrawals > 0 && (
              <div className="mt-2">
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {stats.pendingWithdrawals} pending
                </span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Recent Activity
        </h3>
        
        {stats.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((activity: ActivityItem) => (
              <div key={`${activity.type || 'withdrawal'}-${activity.id}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  {activity.type === 'deposit' ? (
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  ) : (
                    <Banknote className="h-5 w-5 text-purple-400" />
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {activity.username} - {activity.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {new Date(activity.created_at).toLocaleDateString()}
                      {activity.utr_number && ` • UTR: ${activity.utr_number}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">₹{activity.amount.toFixed(2)}</p>
                  <p className="text-yellow-400 text-sm">Pending</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
