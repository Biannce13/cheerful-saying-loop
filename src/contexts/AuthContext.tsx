
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  is_admin: boolean;
  initial_deposit_made: boolean;
  total_bets: number;
  required_bet_amount: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      setLoading(true);
      console.log('Fetching user profile for auth_id:', authUser.id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      } else if (data) {
        console.log('User profile found:', data);
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          balance: parseFloat(String(data.balance || 0)),
          is_admin: data.is_admin || false,
          initial_deposit_made: data.initial_deposit_made || false,
          total_bets: data.total_bets || 0,
          required_bet_amount: parseFloat(String(data.required_bet_amount || 200)),
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      console.log('Attempting login with:', usernameOrEmail);
      
      let email = usernameOrEmail;
      
      // If the input doesn't contain @, it's likely a username, so we need to find the email
      if (!usernameOrEmail.includes('@')) {
        console.log('Username provided, looking up email...');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', usernameOrEmail)
          .single();

        if (userError || !userData) {
          console.error('User not found by username:', userError);
          throw new Error('Invalid username or password');
        }
        
        email = userData.email;
        console.log('Found email for username:', email);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase login error:', error);
        throw new Error('Invalid login credentials');
      }

      console.log('Login successful:', data);
      
      if (data.user) {
        await fetchUserProfile(data.user);
      }
    } catch (error) {
      console.error('Login process error:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('Attempting registration:', { username, email });
      
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username already exists');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) {
        console.error('Registration error:', error);
        throw new Error(error.message);
      }

      console.log('Registration successful:', data);

      // Since email confirmation is disabled, user should be logged in immediately
      if (data.user && data.session) {
        await fetchUserProfile(data.user);
      } else if (data.user && !data.session) {
        // This shouldn't happen with email confirmation disabled, but just in case
        throw new Error('Registration successful! Please try logging in with your credentials.');
      }
    } catch (error) {
      console.error('Registration process error:', error);
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const refreshUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await fetchUserProfile(authUser);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
