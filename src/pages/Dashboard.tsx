import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Gamepad2, 
  Plus, 
  Minus, 
  History, 
  Wallet, 
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';

export function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser();
    fetchRecentGames();
  }, []);

  const fetchRecentGames = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/games/history?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const games = await response.json();
        setRecentGames(games.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch recent games:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // Don't show deposit/withdraw actions for admin
  if (user.is_admin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.username}!
          </h1>
          <p className="text-gray-300">Your ultimate gaming platform - MineX</p>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            to="/admin"
            className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-purple-600/30 hover:to-blue-600/30 transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-center">
              <Star className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Admin Panel</h3>
              <p className="text-gray-300 text-sm">Manage users and transactions</p>
            </div>
          </Link>

          <Link
            to="/game"
            className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-green-600/30 hover:to-emerald-600/30 transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-center">
              <Gamepad2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Test Game</h3>
              <p className="text-gray-300 text-sm">Test the mines game</p>
            </div>
          </Link>

          <Link
            to="/history"
            className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-yellow-600/30 hover:to-orange-600/30 transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-center">
              <History className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">History</h3>
              <p className="text-gray-300 text-sm">View transaction history</p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Recent Games</h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="text-gray-300 mt-2">Loading recent games...</p>
            </div>
          ) : recentGames.length > 0 ? (
            <div className="space-y-3">
              {recentGames.map((game: any) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Gamepad2 className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">
                        {game.mines_count} mines • ₹{game.bet_amount} bet
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(game.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      game.status === 'won' ? 'text-green-400' : 
                      game.status === 'lost' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {game.status === 'won' ? `+₹${game.winnings}` : 
                       game.status === 'lost' ? `-₹${game.bet_amount}` : 'Active'}
                    </p>
                    <p className="text-gray-400 text-sm capitalize">{game.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gamepad2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-300">No games played yet</p>
              <p className="text-gray-400 text-sm">Start your first game to see activity here</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const canPlay = user.initial_deposit_made;
  const needsDeposit = !user.initial_deposit_made;
  const bonusWithdrawEligible = user.total_bets >= 200;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user.username}!
        </h1>
        <p className="text-gray-300">Ready to play some mines?</p>
      </div>

      {/* Balance and Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Current Balance</p>
              <p className="text-2xl font-bold text-white">₹{user.balance?.toFixed(2) || '0.00'}</p>
            </div>
            <Wallet className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Bets</p>
              <p className="text-2xl font-bold text-white">₹{user.total_bets?.toFixed(2) || '0.00'}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Account Status</p>
              <p className="text-lg font-bold text-white">
                {needsDeposit ? 'Needs Deposit' : 'Active'}
              </p>
            </div>
            <Star className={`h-8 w-8 ${needsDeposit ? 'text-yellow-500' : 'text-green-400'}`} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Withdrawal Status</p>
              <p className="text-lg font-bold text-white">
                {bonusWithdrawEligible ? 'Eligible' : 'Locked'}
              </p>
            </div>
            <Clock className={`h-8 w-8 ${bonusWithdrawEligible ? 'text-green-400' : 'text-red-400'}`} />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {needsDeposit && (
        <div className="mb-8 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-center">
            <strong>Deposit ₹100 or more to start playing!</strong> Your welcome bonus is waiting.
          </p>
        </div>
      )}

      {!bonusWithdrawEligible && (
        <div className="mb-8 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-center">
            Make bets worth ₹{(200 - (user.total_bets || 0)).toFixed(2)} more to unlock bonus withdrawal.
          </p>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/game"
          className={`bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 transition-all duration-200 transform hover:scale-105 ${
            !canPlay ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600/30 hover:to-emerald-600/30'
          }`}
          onClick={(e) => !canPlay && e.preventDefault()}
        >
          <div className="text-center">
            <Gamepad2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Play Mines</h3>
            <p className="text-gray-300 text-sm">
              {canPlay ? 'Start playing and win big!' : 'Deposit required to play'}
            </p>
          </div>
        </Link>

        <Link
          to="/deposit"
          className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-blue-600/30 hover:to-indigo-600/30 transition-all duration-200 transform hover:scale-105"
        >
          <div className="text-center">
            <Plus className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Add Money</h3>
            <p className="text-gray-300 text-sm">Deposit via UPI QR code</p>
          </div>
        </Link>

        <Link
          to="/withdraw"
          className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-200 transform hover:scale-105"
        >
          <div className="text-center">
            <Minus className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Withdraw</h3>
            <p className="text-gray-300 text-sm">Cash out your winnings</p>
          </div>
        </Link>

        <Link
          to="/history"
          className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:from-yellow-600/30 hover:to-orange-600/30 transition-all duration-200 transform hover:scale-105"
        >
          <div className="text-center">
            <History className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">History</h3>
            <p className="text-gray-300 text-sm">View your transactions</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Recent Games</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-gray-300 mt-2">Loading recent games...</p>
          </div>
        ) : recentGames.length > 0 ? (
          <div className="space-y-3">
            {recentGames.map((game: any) => (
              <div key={game.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Gamepad2 className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">
                      {game.mines_count} mines • ₹{game.bet_amount} bet
                    </p>
                    <p className="text-gray-400 text-sm">
                      {new Date(game.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    game.status === 'won' ? 'text-green-400' : 
                    game.status === 'lost' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {game.status === 'won' ? `+₹${game.winnings}` : 
                     game.status === 'lost' ? `-₹${game.bet_amount}` : 'Active'}
                  </p>
                  <p className="text-gray-400 text-sm capitalize">{game.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Gamepad2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300">No games played yet</p>
            <p className="text-gray-400 text-sm">Start your first game to see activity here</p>
          </div>
        )}
      </div>
    </div>
  );
}
