
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: any | null;
  connected: boolean;
  currentPeriod: string;
  nextPeriod: string;
  timeRemaining: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket] = useState<any | null>(null);
  const [connected, setConnected] = useState(true); // Mock as connected
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [nextPeriod, setNextPeriod] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(60000);
  const [periodStartTime, setPeriodStartTime] = useState<number | null>(null);

  // Mock socket functionality for demo
  useEffect(() => {
    if (user) {
      setConnected(true);
      
      // Generate mock period data
      const now = Date.now();
      const periodId = new Date().getFullYear().toString() + 
        (new Date().getMonth() + 1).toString().padStart(2, '0') + 
        new Date().getDate().toString().padStart(2, '0') + 
        new Date().getHours().toString().padStart(2, '0') + 
        new Date().getMinutes().toString().padStart(2, '0') + 
        new Date().getSeconds().toString().padStart(2, '0');
      
      setCurrentPeriod(periodId);
      setNextPeriod((parseInt(periodId) + 1).toString());
      setPeriodStartTime(now);
    } else {
      setConnected(false);
    }
  }, [user]);

  // Mock countdown timer
  useEffect(() => {
    if (periodStartTime && timeRemaining > 0) {
      const timer = setInterval(() => {
        const elapsed = Date.now() - periodStartTime;
        const remaining = Math.max(0, 60000 - elapsed);
        setTimeRemaining(remaining);
        
        // Reset period when timer reaches 0
        if (remaining === 0) {
          const now = Date.now();
          const newPeriodId = (parseInt(currentPeriod) + 1).toString();
          setCurrentPeriod(newPeriodId);
          setNextPeriod((parseInt(newPeriodId) + 1).toString());
          setPeriodStartTime(now);
          setTimeRemaining(60000);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [periodStartTime, timeRemaining, currentPeriod]);

  const value = {
    socket,
    connected,
    currentPeriod,
    nextPeriod,
    timeRemaining,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
