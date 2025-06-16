
import { supabase } from '../integrations/supabase/client';

export interface Withdrawal {
  id: string;
  user_id: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | null;
  bank_details: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
  } | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function createWithdrawal(
  amount: number,
  bankDetails: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
  }
): Promise<Withdrawal> {
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

    // Check eligibility
    if (!userProfile.initial_deposit_made) {
      throw new Error('Initial deposit required');
    }

    const totalBets = userProfile.total_bets || 0;
    const requiredBetAmount = userProfile.required_bet_amount || 200;
    const balance = userProfile.balance || 0;

    if (totalBets < requiredBetAmount) {
      throw new Error('Minimum bet requirement not met');
    }

    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Deduct amount from balance
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance: balance - amount })
      .eq('id', userProfile.id);

    if (balanceError) {
      throw new Error('Failed to deduct balance');
    }

    // Create withdrawal record
    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userProfile.id,
        amount: amount,
        bank_details: bankDetails,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create withdrawal request');
    }

    return data as Withdrawal;
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    throw error;
  }
}

export async function getWithdrawalHistory(): Promise<Withdrawal[]> {
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
      .from('withdrawals')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch withdrawal history');
    }

    return (data || []) as Withdrawal[];
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    return [];
  }
}
