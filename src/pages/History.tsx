
import { useState, useEffect } from 'react';
import { History as HistoryIcon, Gamepad2, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  status: string;
  details: string;
  created_at: string;
}

interface Game {
  id: number;
  bet_amount: number;
  mines_count: number;
  multiplier: number;
  status: string;
  winnings: number;
  created_at: string;
}

export function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'games'>('transactions');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'bonus'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
    fetchGames();
  }, [transactionFilter]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = transactionFilter === 'all' 
        ? '/api/transactions' 
        : `/api/transactions?type=${transactionFilter}`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchGames = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/games/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return <Clock className="h-5 w-5 text-yellow-400" />;
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (status === 'rejected') return <XCircle className="h-5 w-5 text-red-400" />;
    
    return type === 'deposit' || type === 'bonus' ? 
      <TrendingUp className="h-5 w-5 text-green-400" /> : 
      <TrendingDown className="h-5 w-5 text-red-400" />;
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return 'text-yellow-400';
    if (status === 'rejected') return 'text-red-400';
    
    return type === 'deposit' || type === 'bonus' ? 'text-green-400' : 'text-red-400';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300';
      case 'rejected': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'bonus': return 'Bonus';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <HistoryIcon className="h-16 w-16 text-purple-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
        <p className="text-gray-300">View all your transactions and game history</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/10 backdrop-blur-md rounded-lg p-1 mb-8">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'bg-purple-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-purple-600/20'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'games'
              ? 'bg-purple-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-purple-600/20'
          }`}
        >
          Games
        </button>
      </div>

      {/* Transaction Filter */}
      {activeTab === 'transactions' && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-gray-300 font-medium">Filter by type:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'deposit', label: 'Deposits' },
              { key: 'withdrawal', label: 'Withdrawals' },
              { key: 'bonus', label: 'Bonuses' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setTransactionFilter(filter.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  transactionFilter === filter.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-purple-600/20 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          {transactions.length > 0 ? (
            <div className="divide-y divide-white/10">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getTransactionIcon(transaction.type, transaction.status)}
                      <div>
                        <p className="text-white font-medium">
                          {formatTransactionType(transaction.type)}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatDate(transaction.created_at)}
                        </p>
                        {transaction.details && (
                          <p className="text-gray-300 text-sm mt-1">
                            {transaction.details}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getTransactionColor(transaction.type, transaction.status)}`}>
                        {transaction.type === 'deposit' || transaction.type === 'bonus' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(transaction.status)}`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-300">
                {transactionFilter === 'all' ? 'No transactions yet' : `No ${transactionFilter} transactions`}
              </p>
              <p className="text-gray-400 text-sm">Your transaction history will appear here</p>
            </div>
          )}
        </div>
      )}

      {/* Games Tab */}
      {activeTab === 'games' && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          {games.length > 0 ? (
            <div className="divide-y divide-white/10">
              {games.map((game) => (
                <div key={game.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Gamepad2 className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">
                          Mines Game • {game.mines_count} mines
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatDate(game.created_at)}
                        </p>
                        <p className="text-gray-300 text-sm">
                          Bet: ₹{game.bet_amount} • Multiplier: {game.multiplier}x
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        game.status === 'won' ? 'text-green-400' :
                        game.status === 'lost' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {game.status === 'won' ? `+₹${game.winnings.toFixed(2)}` :
                         game.status === 'lost' ? `-₹${game.bet_amount.toFixed(2)}` :
                         'Active'}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        game.status === 'won' ? 'bg-green-500/20 text-green-300' :
                        game.status === 'lost' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Gamepad2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-300">No games played yet</p>
              <p className="text-gray-400 text-sm">Your game history will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
