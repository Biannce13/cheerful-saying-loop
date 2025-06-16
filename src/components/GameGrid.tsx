
import { GameGridProps } from '../types';

export function GameGrid({ 
  grid,
  gameActive,
  gameOver,
  revealedPositions,
  onCellClick,
  loading,
  currentMultiplier,
  potentialWinnings
}: GameGridProps) {

  const handleCellClick = (index: number) => {
    if (!gameActive || gameOver || revealedPositions.includes(index) || loading) return;
    onCellClick(index);
  };

  const getCellContent = (index: number) => {
    if (gameOver) {
      if (grid[index] === 'mine') {
        return '💣';
      } else if (revealedPositions.includes(index)) {
        return '💎';
      }
      return '';
    }
    
    if (revealedPositions.includes(index)) {
      return '💎';
    }
    
    return '';
  };

  const getCellClass = (index: number) => {
    let baseClass = 'w-16 h-16 border-2 border-white/20 rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-200 cursor-pointer transform hover:scale-105';
    
    if (gameOver) {
      if (grid[index] === 'mine') {
        baseClass += ' bg-red-500/80 text-white';
      } else if (revealedPositions.includes(index)) {
        baseClass += ' bg-green-500/80 text-white';
      } else {
        baseClass += ' bg-white/10 backdrop-blur-md hover:bg-white/20';
      }
    } else if (revealedPositions.includes(index)) {
      baseClass += ' bg-green-500/80 text-white';
    } else {
      baseClass += ' bg-white/10 backdrop-blur-md hover:bg-white/20';
    }
    
    if (!gameActive) {
      baseClass += ' cursor-not-allowed';
    }
    
    return baseClass;
  };

  return (
    <div className="space-y-6">
      {/* Game Info */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-gray-300 text-sm">Current Multiplier</p>
            <p className="text-2xl font-bold text-purple-400">{currentMultiplier.toFixed(3)}x</p>
          </div>
          <div>
            <p className="text-gray-300 text-sm">Potential Winnings</p>
            <p className="text-2xl font-bold text-green-400">₹{potentialWinnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-5 gap-2 p-4 bg-white/5 rounded-xl backdrop-blur-md border border-white/10">
        {Array.from({ length: 25 }, (_, index) => (
          <button
            key={index}
            className={getCellClass(index)}
            onClick={() => handleCellClick(index)}
            disabled={!gameActive || gameOver || revealedPositions.includes(index) || loading}
          >
            {getCellContent(index)}
          </button>
        ))}
      </div>
    </div>
  );
}
