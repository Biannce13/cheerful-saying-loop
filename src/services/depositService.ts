
import { supabase } from '../integrations/supabase/client';

export interface Deposit {
  id: string;
  user_id: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  transaction_id?: string | null;
  payment_method: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function createDeposit(amount: number, utrNumber: string): Promise<Deposit> {
  try {
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Create deposit record
    const { data, error } = await supabase
      .from('deposits')
      .insert({
        user_id: userProfile.id,
        amount: amount,
        transaction_id: utrNumber,
        payment_method: 'upi',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create deposit request');
    }

    return data;
  } catch (error) {
    console.error('Error creating deposit:', error);
    throw error;
  }
}

export async function getDepositHistory(): Promise<Deposit[]> {
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
      .from('deposits')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch deposit history');
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching deposit history:', error);
    return [];
  }
}
