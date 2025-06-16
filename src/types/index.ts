
export interface BankDetails {
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  is_locked: boolean;
}

export interface User {
  username: string;
  email: string;
  balance: number;
  is_admin: boolean;
  initial_deposit_made: boolean;
  total_bets?: number;
  required_bet_amount?: number;
}

export interface HackControl {
  user_id: number;
  enabled: boolean;
}

export interface OnlineUser {
  id: number;
  username: string;
  balance: number;
  last_activity: string;
}

export interface AdminStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalGames: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

export interface GameMode {
  game_mode: 'auto' | 'manual';
}

export interface AdminGame {
  id: number;
  period: string;
  bet_amount: number;
  mines_count: number;
  mine_positions: number[];
  revealed_positions: number[];
  status: string;
  winnings: number;
  created_at: string;
}

export interface GameGridProps {
  grid: ('mine' | 'safe' | 'hidden')[];
  gameActive: boolean;
  gameOver: boolean;
  revealedPositions: number[];
  onCellClick: (index: number) => void;
  loading: boolean;
  currentMultiplier: number;
  potentialWinnings: number;
}
