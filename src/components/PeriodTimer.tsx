
import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

export function PeriodTimer() {
  const { currentPeriod, nextPeriod, timeRemaining } = useSocket();
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    setDisplayTime(Math.max(0, Math.ceil(timeRemaining / 1000)));
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    return seconds.toString().padStart(2, '0');
  };

  const getProgressPercentage = () => {
    return Math.max(0, (displayTime / 60) * 100);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Current Period</h3>
        <p className="text-purple-300 text-sm mb-4">{currentPeriod}</p>
        
        <div className="relative mb-4">
          <div className="text-4xl font-bold text-white mb-2">
            00:{formatTime(displayTime)}
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm">
          Next Period: <span className="text-blue-300">{nextPeriod}</span>
        </p>
      </div>
    </div>
  );
}
