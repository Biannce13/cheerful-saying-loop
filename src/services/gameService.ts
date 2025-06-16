
import { supabase } from '../integrations/supabase/client';

export interface GamePeriod {
  id: string;
  period_id: string;
  mine_positions: number[];
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed';
}

export interface Game {
  id: string;
  user_id: string;
  period_id: string;
  bet_amount: number;
  mines_count: number;
  revealed_positions: number[];
  mine_positions: number[];
  current_multiplier: number;
  winnings: number;
  status: 'active' | 'won' | 'lost' | 'cashed_out';
  created_at: string;
}

// Generate mine positions based on mines count
export function generateMinePositions(minesCount: number): number[] {
  const positions: number[] = [];
  while (positions.length < minesCount) {
    const pos = Math.floor(Math.random() * 25);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  return positions.sort((a, b) => a - b);
}

// Calculate multiplier based on mines count and safe cells revealed
export function calculateMultiplier(minesCount: number, safeRevealed: number): number {
  if (safeRevealed === 0) return 1.0;
  
  const totalCells = 25;
  const safeCells = totalCells - minesCount;
  
  let multiplier = 1.0;
  for (let i = 1; i <= safeRevealed; i++) {
    const remainingSafe = safeCells - i + 1;
    const remainingTotal = totalCells - i + 1;
    multiplier *= remainingTotal / remainingSafe;
  }
  
  return Math.max(1.01, multiplier);
}

// Get or create current game period
export async function getCurrentGamePeriod(): Promise<GamePeriod | null> {
  try {
    const { data, error } = await supabase
      .from('game_periods')
      .select('*')
      .eq('status', 'active')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current game period:', error);
      return null;
    }

    // If no active period exists, create one
    if (!data) {
      return await createNewGamePeriod();
    }

    return data;
  } catch (error) {
    console.error('Error in getCurrentGamePeriod:', error);
    return null;
  }
}

// Create a new game period
export async function createNewGamePeriod(): Promise<GamePeriod | null> {
  try {
    const periodId = generatePeriodId();
    const minePositions = generateMinePositions(3); // Default 3 mines

    const { data, error } = await supabase
      .from('game_periods')
      .insert({
        period_id: periodId,
        mine_positions: minePositions,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating new game period:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createNewGamePeriod:', error);
    return null;
  }
}

// Generate period ID
function generatePeriodId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

// Start a new game
export async function startGame(betAmount: number, minesCount: number): Promise<Game | null> {
  try {
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check balance (skip for admin)
    if (!userProfile.is_admin && userProfile.balance < betAmount) {
      throw new Error('Insufficient balance');
    }

    // Get current period
    const currentPeriod = await getCurrentGamePeriod();
    if (!currentPeriod) {
      throw new Error('No active game period');
    }

    // Generate mine positions for this specific game
    const gameMinePositions = generateMinePositions(minesCount);

    // Deduct balance (skip for admin)
    if (!userProfile.is_admin) {
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: userProfile.balance - betAmount })
        .eq('id', userProfile.id);

      if (balanceError) {
        throw new Error('Failed to deduct balance');
      }
    }

    // Create game
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        user_id: userProfile.id,
        period_id: currentPeriod.period_id,
        bet_amount: betAmount,
        mines_count: minesCount,
        mine_positions: gameMinePositions,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create game');
    }

    return game;
  } catch (error) {
    console.error('Error starting game:', error);
    throw error;
  }
}

// Reveal a cell
export async function revealCell(gameId: string, position: number): Promise<{
  isMine: boolean;
  gameOver: boolean;
  currentMultiplier?: number;
  potentialWinnings?: number;
  nextMultiplier?: number;
  minePositions?: number[];
}> {
  try {
    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'active')
      .single();

    if (gameError || !game) {
      throw new Error('Game not found or not active');
    }

    const revealedPositions = game.revealed_positions || [];
    
    if (revealedPositions.includes(position)) {
      throw new Error('Position already revealed');
    }

    const isMine = game.mine_positions.includes(position);
    const newRevealedPositions = [...revealedPositions, position];

    if (isMine) {
      // Game over - hit mine
      const { error } = await supabase
        .from('games')
        .update({
          revealed_positions: newRevealedPositions,
          status: 'lost'
        })
        .eq('id', gameId);

      if (error) {
        throw new Error('Failed to update game');
      }

      // Add to game history
      await supabase
        .from('game_history')
        .insert({
          user_id: game.user_id,
          game_id: gameId,
          bet_amount: game.bet_amount,
          mines_count: game.mines_count,
          final_multiplier: 0,
          winnings: 0,
          result: 'lost'
        });

      return {
        isMine: true,
        gameOver: true,
        minePositions: game.mine_positions
      };
    } else {
      // Safe position
      const safeCount = newRevealedPositions.length;
      const multiplier = calculateMultiplier(game.mines_count, safeCount);
      const potentialWinnings = game.bet_amount * multiplier;
      const nextMultiplier = calculateMultiplier(game.mines_count, safeCount + 1);

      const { error } = await supabase
        .from('games')
        .update({
          revealed_positions: newRevealedPositions,
          current_multiplier: multiplier
        })
        .eq('id', gameId);

      if (error) {
        throw new Error('Failed to update game');
      }

      return {
        isMine: false,
        gameOver: false,
        currentMultiplier: multiplier,
        potentialWinnings,
        nextMultiplier: safeCount < (25 - game.mines_count) ? nextMultiplier : multiplier
      };
    }
  } catch (error) {
    console.error('Error revealing cell:', error);
    throw error;
  }
}

// Cash out
export async function cashOut(gameId: string): Promise<number> {
  try {
    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'active')
      .single();

    if (gameError || !game) {
      throw new Error('Game not found or not active');
    }

    const revealedPositions = game.revealed_positions || [];
    if (revealedPositions.length === 0) {
      throw new Error('No positions revealed yet');
    }

    const winnings = game.bet_amount * game.current_multiplier;

    // Update game status
    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'cashed_out',
        winnings: winnings
      })
      .eq('id', gameId);

    if (updateError) {
      throw new Error('Failed to update game');
    }

    // Get user profile to update balance
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', game.user_id)
      .single();

    if (userProfile && !userProfile.is_admin) {
      // Update user balance
      await supabase
        .from('users')
        .update({ 
          balance: userProfile.balance + winnings,
          total_bets: userProfile.total_bets + game.bet_amount
        })
        .eq('id', game.user_id);
    }

    // Add to game history
    await supabase
      .from('game_history')
      .insert({
        user_id: game.user_id,
        game_id: gameId,
        bet_amount: game.bet_amount,
        mines_count: game.mines_count,
        final_multiplier: game.current_multiplier,
        winnings: winnings,
        result: 'cashed_out'
      });

    return winnings;
  } catch (error) {
    console.error('Error cashing out:', error);
    throw error;
  }
}

// Get game history
export async function getGameHistory(limit: number = 20): Promise<any[]> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch game history');
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching game history:', error);
    return [];
  }
}
