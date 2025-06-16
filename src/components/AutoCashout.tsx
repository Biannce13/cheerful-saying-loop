import { useEffect } from 'react';
import { Target, ToggleLeft, ToggleRight } from 'lucide-react';

interface AutoCashoutProps {
  enabled: boolean;
  targetMultiplier: number;
  currentMultiplier: number;
  onToggle: (enabled: boolean) => void;
  onTargetChange: (target: number) => void;
  onTrigger: () => void;
}

export function AutoCashout({
  enabled,
  targetMultiplier,
  currentMultiplier,
  onToggle,
  onTargetChange,
  onTrigger
}: AutoCashoutProps) {
  useEffect(() => {
    if (enabled && currentMultiplier >= targetMultiplier && currentMultiplier > 1) {
      onTrigger();
    }
  }, [enabled, currentMultiplier, targetMultiplier, onTrigger]);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-orange-400" />
          <span className="text-orange-300 font-medium">Auto Cashout</span>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className="flex items-center space-x-2 text-sm"
        >
          {enabled ? (
            <ToggleRight className="h-6 w-6 text-green-400" />
          ) : (
            <ToggleLeft className="h-6 w-6 text-gray-400" />
          )}
          <span className={enabled ? 'text-green-400' : 'text-gray-400'}>
            {enabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Multiplier
            </label>
            <input
              type="number"
              value={targetMultiplier}
              onChange={(e) => onTargetChange(parseFloat(e.target.value) || 1.1)}
              min="1.1"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
          </div>
          
          <div className="text-center p-2 bg-orange-500/20 border border-orange-500/30 rounded-lg">
            <p className="text-orange-300 text-sm">
              Will auto-cashout at {targetMultiplier.toFixed(1)}x
            </p>
            {currentMultiplier > 1 && (
              <p className="text-orange-200 text-xs">
                Current: {currentMultiplier.toFixed(3)}x
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
