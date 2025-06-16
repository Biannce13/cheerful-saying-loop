
import { useEffect, useState } from 'react';

interface BetPreventionProps {
  currentPeriod: string | null;
  onBetAttempt: (allowed: boolean, reason?: string) => void;
}

export function BetPrevention({ currentPeriod, onBetAttempt }: BetPreventionProps) {
  const [lastBetPeriod, setLastBetPeriod] = useState<string | null>(null);
  const [betCount, setBetCount] = useState(0);

  useEffect(() => {
    // Reset bet count when period changes
    if (currentPeriod && currentPeriod !== lastBetPeriod) {
      setBetCount(0);
      setLastBetPeriod(currentPeriod);
    }
  }, [currentPeriod, lastBetPeriod]);

  const checkBetAllowed = (): boolean => {
    if (!currentPeriod) {
      onBetAttempt(false, 'Game period not available');
      return false;
    }

    if (betCount >= 1) {
      onBetAttempt(false, 'Only one bet allowed per game period');
      return false;
    }

    setBetCount(prev => prev + 1);
    onBetAttempt(true);
    return true;
  };

  return {
    checkBetAllowed,
    betCount,
    currentPeriod
  };
}
