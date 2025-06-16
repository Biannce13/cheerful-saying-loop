
-- Create users table for storing user profile data
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 200.00,
  is_admin BOOLEAN DEFAULT FALSE,
  initial_deposit_made BOOLEAN DEFAULT FALSE,
  total_bets INTEGER DEFAULT 0,
  required_bet_amount DECIMAL(10,2) DEFAULT 200.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deposits table
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  transaction_id TEXT,
  payment_method TEXT DEFAULT 'upi',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bank_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_periods table
CREATE TABLE public.game_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id TEXT NOT NULL UNIQUE,
  mine_positions INTEGER[] NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed'))
);

-- Create games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  period_id TEXT REFERENCES public.game_periods(period_id),
  bet_amount DECIMAL(10,2) NOT NULL,
  mines_count INTEGER NOT NULL,
  revealed_positions INTEGER[] DEFAULT '{}',
  mine_positions INTEGER[] DEFAULT '{}',
  current_multiplier DECIMAL(6,3) DEFAULT 1.0,
  winnings DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cashed_out')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_history table for tracking all game results
CREATE TABLE public.game_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  bet_amount DECIMAL(10,2) NOT NULL,
  mines_count INTEGER NOT NULL,
  final_multiplier DECIMAL(6,3),
  winnings DECIMAL(10,2) DEFAULT 0,
  result TEXT CHECK (result IN ('won', 'lost', 'cashed_out')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- RLS Policies for deposits table
CREATE POLICY "Users can view their own deposits" ON public.deposits
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create their own deposits" ON public.deposits
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- RLS Policies for withdrawals table
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawals
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create their own withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- RLS Policies for games table
CREATE POLICY "Users can view their own games" ON public.games
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create their own games" ON public.games
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own games" ON public.games
  FOR UPDATE USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- RLS Policies for game_history table
CREATE POLICY "Users can view their own game history" ON public.game_history
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Admin policies (allow admins to see everything)
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins can view all deposits" ON public.deposits
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins can view all withdrawals" ON public.withdrawals
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin = TRUE));

-- Game periods are public (everyone can read)
CREATE POLICY "Everyone can view game periods" ON public.game_periods
  FOR SELECT TO authenticated USING (TRUE);

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, username, email, balance, is_admin)
  VALUES 
  (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    200.00,
    CASE WHEN NEW.email = 'admin@minex.com' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$$;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
