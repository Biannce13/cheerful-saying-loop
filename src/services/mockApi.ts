
// Mock API service to simulate backend functionality in Lovable environment
interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  is_admin: boolean;
  initial_deposit_made: boolean;
  total_bets: number;
  required_bet_amount: number;
}

interface LoginResponse {
  token: string;
  user: User;
}

// In-memory storage for demo purposes
let users: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@minex.com',
    balance: 10000,
    is_admin: true,
    initial_deposit_made: true,
    total_bets: 0,
    required_bet_amount: 200,
  }
];

let nextUserId = 2;

// Mock delay to simulate network requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    await delay(500);
    
    // Check for admin credentials
    if (username === 'admin' && password === 'admin123') {
      const user = users.find(u => u.username === 'admin')!;
      return {
        token: 'mock-admin-token-' + Date.now(),
        user
      };
    }
    
    // Check for regular user
    const user = users.find(u => u.username === username || u.email === username);
    if (user && password === 'password123') { // Simple password for demo
      return {
        token: 'mock-token-' + Date.now(),
        user
      };
    }
    
    throw new Error('Invalid credentials');
  },

  async register(username: string, email: string, password: string): Promise<LoginResponse> {
    await delay(500);
    
    // Check if user already exists
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      throw new Error('Username or email already exists');
    }
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    // Create new user
    const newUser: User = {
      id: nextUserId++,
      username,
      email,
      balance: 200, // Welcome bonus
      is_admin: false,
      initial_deposit_made: false,
      total_bets: 0,
      required_bet_amount: 200,
    };
    
    users.push(newUser);
    
    return {
      token: 'mock-token-' + Date.now(),
      user: newUser
    };
  },

  async getUserProfile(token: string): Promise<User> {
    await delay(300);
    
    if (token.includes('admin')) {
      return users.find(u => u.is_admin)!;
    }
    
    // Return a demo user for non-admin tokens
    return users.find(u => !u.is_admin) || users[0];
  },

  // Mock admin endpoints
  async getAdminStats() {
    await delay(300);
    return {
      total_users: users.filter(u => !u.is_admin).length,
      pending_deposits: 0,
      pending_withdrawals: 0,
      total_balance: users.reduce((sum, u) => sum + u.balance, 0)
    };
  },

  async getCurrentPeriod() {
    await delay(200);
    const now = new Date();
    const periodId = now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0') + 
      now.getDate().toString().padStart(2, '0') + 
      now.getHours().toString().padStart(2, '0') + 
      now.getMinutes().toString().padStart(2, '0') + 
      now.getSeconds().toString().padStart(2, '0');
    
    return {
      period_id: periodId,
      mine_positions: [Math.floor(Math.random() * 25), Math.floor(Math.random() * 25), Math.floor(Math.random() * 25)],
      start_time: now.toISOString()
    };
  }
};
