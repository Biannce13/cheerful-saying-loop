import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameGrid } from '../components/GameGrid';
import { PeriodTimer } from '../components/PeriodTimer';
import { AutoCashout } from '../components/AutoCashout';
import { Play, Square, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface GameState {
  gameId: number | null;
  gamePeriod: string | null;
  grid: ('hidden' | 'safe' | 'mine')[];
  gameActive: boolean;
  gameOver: boolean;
  betAmount: number;
  minesCount: number;
  baseMultiplier: number;
  currentMultiplier: number;
  revealedPositions: number[];
  minePositions: number[];
  winnings: number;
  potentialWinnings: number;
  nextMultiplier: number;
}

const BASE_MULTIPLIERS: { [key: number]: number } = {
  1: 1.01, 2: 1.05, 3: 1.08, 4: 1.10, 5: 1.15,
  6: 1.21, 7: 1.27, 8: 1.34, 9: 1.42, 10: 1.51,
  11: 1.61, 12: 1.73, 13: 1.86, 14: 2.02, 15: 2.20,
  16: 2.40, 17: 2.63, 18: 2.89, 19: 3.19, 20: 3.54,
  21: 3.95, 22: 4.44, 23: 5.02, 24: 5.74
};

export function Game() {
  const { user, refreshUser } = useAuth();
  const { socket, connected, currentPeriod } = useSocket();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    gamePeriod: null,
    grid: Array(25).fill('hidden'),
    gameActive: false,
    gameOver: false,
    betAmount: 100,
    minesCount: 3,
    baseMultiplier: 1.08,
    currentMultiplier: 1.0,
    revealedPositions: [],
    minePositions: [],
    winnings: 0,
    potentialWinnings: 0,
    nextMultiplier: 1.08,
  });
  
  const [loading, setLoading] = useState(false);
  const [lastBetPeriod, setLastBetPeriod] = useState<string | null>(null);
  
  // Auto cashout state
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutTarget, setAutoCashoutTarget] = useState(2.0);

  const canPlay = user?.is_admin || user?.initial_deposit_made;

  // Check if user can bet in current period
  const canBetInPeriod = (): boolean => {
    if (!currentPeriod) return false;
    if (!lastBetPeriod) return true;
    return currentPeriod !== lastBetPeriod;
  };

  useEffect(() => {
    if (user?.is_admin) {
      fetchGameSettings();
    }
  }, [user]);

  // Reset bet tracking when period changes
  useEffect(() => {
    if (currentPeriod && currentPeriod !== lastBetPeriod && !gameState.gameActive) {
      setLastBetPeriod(null);
    }
  }, [currentPeriod, lastBetPeriod, gameState.gameActive]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('gameStarted', (data: {
        gameId: number;
        gamePeriod: string;
        baseMultiplier: number;
        currentMultiplier: number;
      }) => {
        setGameState((prev: GameState) => ({
          ...prev,
          gameId: data.gameId,
          gamePeriod: data.gamePeriod,
          gameActive: true,
          gameOver: false,
          grid: Array(25).fill('hidden'),
          revealedPositions: [],
          minePositions: [],
          baseMultiplier: data.baseMultiplier,
          currentMultiplier: data.currentMultiplier,
          winnings: 0,
          potentialWinnings: 0,
        }));
        setLastBetPeriod(data.gamePeriod);
      });

      socket.on('multiplierUpdate', (data: {
        currentMultiplier: number;
        potentialWinnings: number;
        revealedPositions: number[];
        nextMultiplier: number;
      }) => {
        setGameState((prev: GameState) => ({
          ...prev,
          currentMultiplier: data.currentMultiplier,
          potentialWinnings: data.potentialWinnings,
          revealedPositions: data.revealedPositions,
          nextMultiplier: data.nextMultiplier,
        }));
      });

      socket.on('gameOver', (data: {
        minePositions?: number[];
        revealedPositions?: number[];
      }) => {
        setGameState((prev: GameState) => {
          const newGrid = [...prev.grid];
          // Show ALL mine positions based on the selected mines count
          if (data.minePositions && Array.isArray(data.minePositions)) {
            data.minePositions.forEach((pos: number) => {
              if (pos >= 0 && pos < 25) {
                newGrid[pos] = 'mine';
              }
            });
          }
          
          return {
            ...prev,
            grid: newGrid,
            gameOver: true,
            gameActive: false,
            revealedPositions: data.revealedPositions || prev.revealedPositions,
            minePositions: data.minePositions || prev.minePositions,
          };
        });
      });

      socket.on('cashoutSuccess', (data: {
        winnings: number;
      }) => {
        setGameState((prev: GameState) => ({
          ...prev,
          gameActive: false,
          gameOver: true,
          winnings: data.winnings,
        }));
        
        if (!user?.is_admin) {
          refreshUser();
        }
      });

      socket.on('autoCashout', (data: {
        winnings: number;
        reason: string;
      }) => {
        setGameState((prev: GameState) => ({
          ...prev,
          gameActive: false,
          gameOver: true,
          winnings: data.winnings,
        }));
        
        if (!user?.is_admin) {
          refreshUser();
        }
        
        toast.error(`Game auto-cashed out: ${data.reason}`);
      });

      socket.on('balanceUpdate', (data: {
        depositApproved?: boolean;
      }) => {
        if (data.depositApproved) {
          refreshUser();
        }
      });

      return () => {
        socket.off('gameStarted');
        socket.off('multiplierUpdate');
        socket.off('gameOver');
        socket.off('cashoutSuccess');
        socket.off('autoCashout');
        socket.off('balanceUpdate');
      };
    }
  }, [socket, user, refreshUser]);

  // ... keep existing code (fetchGameSettings function)

  const fetchGameSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Game mode setting handled if needed
      }
    } catch (error) {
      console.error('Failed to fetch game settings:', error);
    }
  };

  const startGame = async () => {
    if (!canPlay) {
      toast.error('Deposit ₹100 or more to start playing!');
      return;
    }

    if (!connected) {
      toast.error('Connection lost. Please wait for reconnection.');
      return;
    }

    // Check for multiple bets in same period
    if (!canBetInPeriod()) {
      toast.error('Only one bet allowed per game period. Please wait for the next period.');
      return;
    }

    if (gameState.betAmount < 10 || gameState.betAmount > 10000) {
      toast.error('Bet amount must be between ₹10 and ₹10,000');
      return;
    }

    if (!user?.is_admin && gameState.betAmount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          betAmount: gameState.betAmount,
          minesCount: gameState.minesCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Game state will be updated via socket events
      if (!user?.is_admin) {
        await refreshUser();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const revealCell = async (position: number) => {
    if (!gameState.gameActive || gameState.gameOver || gameState.revealedPositions.includes(position) || loading) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/game/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: gameState.gameId,
          position,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Update grid immediately for better UX
      const newGrid = [...gameState.grid];
      newGrid[position] = data.isMine ? 'mine' : 'safe';
      
      setGameState((prev: GameState) => ({
        ...prev,
        grid: newGrid,
        gameOver: data.gameOver,
        gameActive: !data.gameOver,
        revealedPositions: data.revealedPositions,
        minePositions: data.minePositions || prev.minePositions,
        winnings: data.winnings || prev.winnings,
        currentMultiplier: data.currentMultiplier || prev.currentMultiplier,
        potentialWinnings: data.potentialWinnings || prev.potentialWinnings,
        nextMultiplier: data.nextMultiplier || prev.nextMultiplier,
      }));

      // Show ALL mines when game is over, based on selected mines count
      if (data.gameOver && data.minePositions && Array.isArray(data.minePositions)) {
        const finalGrid = [...newGrid];
        data.minePositions.forEach((pos: number) => {
          if (pos >= 0 && pos < 25) {
            finalGrid[pos] = 'mine';
          }
        });
        setGameState((prev: GameState) => ({ ...prev, grid: finalGrid }));
      }

      if (!user?.is_admin) {
        await refreshUser();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reveal cell');
    } finally {
      setLoading(false);
    }
  };

  const cashOut = async () => {
    if (!gameState.gameActive || gameState.revealedPositions.length === 0) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/game/cashout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: gameState.gameId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // State will be updated via socket events
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cash out');
    } finally {
      setLoading(false);
    }
  };

  const updateMinesCount = (count: number) => {
    if (!gameState.gameActive) {
      setGameState((prev: GameState) => ({
        ...prev,
        minesCount: count,
        baseMultiplier: BASE_MULTIPLIERS[count],
      }));
    }
  };

  const handleAutoCashout = () => {
    if (autoCashoutEnabled && gameState.gameActive) {
      cashOut();
      setAutoCashoutEnabled(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mines Game</h1>
          <p className="text-gray-300">Find diamonds, avoid mines!</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Controls */}
          <div className="space-y-6">
            <PeriodTimer />
            
            {/* Bet Amount */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Place Your Bet</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bet Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={gameState.betAmount}
                    onChange={(e) => setGameState((prev: GameState) => ({
                      ...prev,
                      betAmount: Math.max(10, Math.min(10000, parseInt(e.target.value) || 10))
                    }))}
                    min="10"
                    max="10000"
                    disabled={gameState.gameActive}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Mines
                  </label>
                  <select
                    value={gameState.minesCount}
                    onChange={(e) => updateMinesCount(parseInt(e.target.value))}
                    disabled={gameState.gameActive}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num} className="bg-gray-800">
                        {num} mines ({BASE_MULTIPLIERS[num]}x)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    All {gameState.minesCount} mine positions will be revealed when hit
                  </p>
                </div>

                <div className="pt-4">
                  {!gameState.gameActive ? (
                    <button
                      onClick={startGame}
                      disabled={!gameState.betAmount || gameState.betAmount > (user?.balance || 0) || loading}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                    >
                      <Play className="h-5 w-5" />
                      <span>{loading ? 'Starting...' : 'Start Game'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={cashOut}
                      disabled={gameState.revealedPositions.length === 0 || loading}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                    >
                      <Square className="h-5 w-5" />
                      <span>{loading ? 'Cashing out...' : `Cashout ₹${gameState.potentialWinnings.toFixed(2)}`}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Auto Cashout */}
            <AutoCashout
              enabled={autoCashoutEnabled}
              targetMultiplier={autoCashoutTarget}
              currentMultiplier={gameState.currentMultiplier}
              onToggle={setAutoCashoutEnabled}
              onTargetChange={setAutoCashoutTarget}
              onTrigger={handleAutoCashout}
            />

            {/* Game Stats */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Game Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Mines:</span>
                  <span className="text-red-400">{gameState.minesCount}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Safe Cells:</span>
                  <span className="text-green-400">{25 - gameState.minesCount}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Revealed:</span>
                  <span className="text-blue-400">{gameState.revealedPositions.length}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Balance:</span>
                  <span className="text-yellow-400">₹{user?.balance?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Grid */}
          <div className="lg:col-span-2">
            <GameGrid
              grid={gameState.grid}
              gameActive={gameState.gameActive}
              gameOver={gameState.gameOver}
              revealedPositions={gameState.revealedPositions}
              onCellClick={revealCell}
              loading={loading}
              currentMultiplier={gameState.currentMultiplier}
              potentialWinnings={gameState.potentialWinnings}
            />

            {gameState.gameOver && (
              <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                  <h3 className="text-xl font-bold text-white">Game Over!</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  {gameState.winnings > 0 
                    ? `You won ₹${gameState.winnings.toFixed(2)}!`
                    : `You hit a mine! Lost ₹${gameState.betAmount}`
                  }
                </p>
                <p className="text-sm text-gray-400">
                  All mines and diamonds are now revealed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
