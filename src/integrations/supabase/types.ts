export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      deposits: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_method: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_history: {
        Row: {
          bet_amount: number
          created_at: string | null
          final_multiplier: number | null
          game_id: string | null
          id: string
          mines_count: number
          result: string | null
          user_id: string | null
          winnings: number | null
        }
        Insert: {
          bet_amount: number
          created_at?: string | null
          final_multiplier?: number | null
          game_id?: string | null
          id?: string
          mines_count: number
          result?: string | null
          user_id?: string | null
          winnings?: number | null
        }
        Update: {
          bet_amount?: number
          created_at?: string | null
          final_multiplier?: number | null
          game_id?: string | null
          id?: string
          mines_count?: number
          result?: string | null
          user_id?: string | null
          winnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_periods: {
        Row: {
          end_time: string | null
          id: string
          mine_positions: number[]
          period_id: string
          start_time: string | null
          status: string | null
        }
        Insert: {
          end_time?: string | null
          id?: string
          mine_positions: number[]
          period_id: string
          start_time?: string | null
          status?: string | null
        }
        Update: {
          end_time?: string | null
          id?: string
          mine_positions?: number[]
          period_id?: string
          start_time?: string | null
          status?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          bet_amount: number
          created_at: string | null
          current_multiplier: number | null
          id: string
          mine_positions: number[] | null
          mines_count: number
          period_id: string | null
          revealed_positions: number[] | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          winnings: number | null
        }
        Insert: {
          bet_amount: number
          created_at?: string | null
          current_multiplier?: number | null
          id?: string
          mine_positions?: number[] | null
          mines_count: number
          period_id?: string | null
          revealed_positions?: number[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          winnings?: number | null
        }
        Update: {
          bet_amount?: number
          created_at?: string | null
          current_multiplier?: number | null
          id?: string
          mine_positions?: number[] | null
          mines_count?: number
          period_id?: string | null
          revealed_positions?: number[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          winnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "game_periods"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          balance: number | null
          created_at: string | null
          email: string
          id: string
          initial_deposit_made: boolean | null
          is_admin: boolean | null
          required_bet_amount: number | null
          total_bets: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          auth_id?: string | null
          balance?: number | null
          created_at?: string | null
          email: string
          id?: string
          initial_deposit_made?: boolean | null
          is_admin?: boolean | null
          required_bet_amount?: number | null
          total_bets?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          auth_id?: string | null
          balance?: number | null
          created_at?: string | null
          email?: string
          id?: string
          initial_deposit_made?: boolean | null
          is_admin?: boolean | null
          required_bet_amount?: number | null
          total_bets?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          bank_details: Json | null
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          bank_details?: Json | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          bank_details?: Json | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
