export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      auction_state: {
        Row: {
          current_bid: number | null
          current_bid_franchise_id: string | null
          current_player_id: string | null
          id: string
          round: number
          status: string
          updated_at: string
        }
        Insert: {
          current_bid?: number | null
          current_bid_franchise_id?: string | null
          current_player_id?: string | null
          id?: string
          round?: number
          status?: string
          updated_at?: string
        }
        Update: {
          current_bid?: number | null
          current_bid_franchise_id?: string | null
          current_player_id?: string | null
          id?: string
          round?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_state_current_bid_franchise_id_fkey"
            columns: ["current_bid_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_state_current_player_id_fkey"
            columns: ["current_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_state_current_player_id_fkey"
            columns: ["current_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      balls: {
        Row: {
          ball_number: number
          batter_player_id: string | null
          bowler_player_id: string | null
          created_at: string
          id: string
          innings_id: string
          is_bye: boolean
          is_legbye: boolean
          is_noball: boolean
          is_wicket: boolean
          is_wide: boolean
          over_number: number
          runs: number
          wicket_type: string | null
        }
        Insert: {
          ball_number: number
          batter_player_id?: string | null
          bowler_player_id?: string | null
          created_at?: string
          id?: string
          innings_id: string
          is_bye?: boolean
          is_legbye?: boolean
          is_noball?: boolean
          is_wicket?: boolean
          is_wide?: boolean
          over_number: number
          runs?: number
          wicket_type?: string | null
        }
        Update: {
          ball_number?: number
          batter_player_id?: string | null
          bowler_player_id?: string | null
          created_at?: string
          id?: string
          innings_id?: string
          is_bye?: boolean
          is_legbye?: boolean
          is_noball?: boolean
          is_wicket?: boolean
          is_wide?: boolean
          over_number?: number
          runs?: number
          wicket_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balls_batter_player_id_fkey"
            columns: ["batter_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_batter_player_id_fkey"
            columns: ["batter_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_bowler_player_id_fkey"
            columns: ["bowler_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_bowler_player_id_fkey"
            columns: ["bowler_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          created_at: string
          franchise_id: string
          id: string
          player_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          franchise_id: string
          id?: string
          player_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          franchise_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      franchises: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_name: string | null
          purse_remaining: number
          purse_total: number
          short_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_name?: string | null
          purse_remaining: number
          purse_total: number
          short_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_name?: string | null
          purse_remaining?: number
          purse_total?: number
          short_code?: string | null
        }
        Relationships: []
      }
      innings: {
        Row: {
          batting_franchise_id: string
          id: string
          innings_number: number
          match_id: string
          overs: number
          total_runs: number
          total_wickets: number
        }
        Insert: {
          batting_franchise_id: string
          id?: string
          innings_number: number
          match_id: string
          overs?: number
          total_runs?: number
          total_wickets?: number
        }
        Update: {
          batting_franchise_id?: string
          id?: string
          innings_number?: number
          match_id?: string
          overs?: number
          total_runs?: number
          total_wickets?: number
        }
        Relationships: [
          {
            foreignKeyName: "innings_batting_franchise_id_fkey"
            columns: ["batting_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      league_settings: {
        Row: {
          base_price: Json
          bid_increment: number
          categories: Json
          created_at: string
          franchise_count: number
          id: string
          purse_per_franchise: number
          registration_fee: number
          season: string
          squad_max_per_franchise: number
          squad_min_per_franchise: number
        }
        Insert: {
          base_price?: Json
          bid_increment?: number
          categories?: Json
          created_at?: string
          franchise_count?: number
          id?: string
          purse_per_franchise?: number
          registration_fee?: number
          season?: string
          squad_max_per_franchise?: number
          squad_min_per_franchise?: number
        }
        Update: {
          base_price?: Json
          bid_increment?: number
          categories?: Json
          created_at?: string
          franchise_count?: number
          id?: string
          purse_per_franchise?: number
          registration_fee?: number
          season?: string
          squad_max_per_franchise?: number
          squad_min_per_franchise?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          franchise_a_id: string
          franchise_b_id: string
          ground: string | null
          id: string
          match_number: number | null
          result_note: string | null
          scheduled_at: string
          status: string
          toss_winner_id: string | null
          winner_id: string | null
        }
        Insert: {
          franchise_a_id: string
          franchise_b_id: string
          ground?: string | null
          id?: string
          match_number?: number | null
          result_note?: string | null
          scheduled_at: string
          status?: string
          toss_winner_id?: string | null
          winner_id?: string | null
        }
        Update: {
          franchise_a_id?: string
          franchise_b_id?: string
          ground?: string | null
          id?: string
          match_number?: number | null
          result_note?: string | null
          scheduled_at?: string
          status?: string
          toss_winner_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_franchise_a_id_fkey"
            columns: ["franchise_a_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_franchise_b_id_fkey"
            columns: ["franchise_b_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_toss_winner_id_fkey"
            columns: ["toss_winner_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          achievements: string | null
          age: number
          assigned_category: string | null
          batting_average: string | null
          batting_strike_rate: string | null
          batting_style: string | null
          bowling_strike_rate: string | null
          bowling_style: string | null
          company: string | null
          cricheroes_url: string | null
          dob: string | null
          economy: string | null
          email: string | null
          full_name: string
          id: string
          jersey_name: string | null
          jersey_number: string | null
          linkedin_url: string | null
          locality: string | null
          lower_size: string | null
          matches_played: string | null
          medical_injury: string | null
          phone: string
          photo_url: string | null
          preferred_category: string | null
          previous_team: string | null
          registration_code: string | null
          registration_fee_agreed: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string | null
          roles: string[]
          runs_scored: string | null
          status: string
          submitted_at: string
          tshirt_size: string | null
          wickets_taken: string | null
          work_email: string | null
        }
        Insert: {
          achievements?: string | null
          age: number
          assigned_category?: string | null
          batting_average?: string | null
          batting_strike_rate?: string | null
          batting_style?: string | null
          bowling_strike_rate?: string | null
          bowling_style?: string | null
          company?: string | null
          cricheroes_url?: string | null
          dob?: string | null
          economy?: string | null
          email?: string | null
          full_name: string
          id?: string
          jersey_name?: string | null
          jersey_number?: string | null
          linkedin_url?: string | null
          locality?: string | null
          lower_size?: string | null
          matches_played?: string | null
          medical_injury?: string | null
          phone: string
          photo_url?: string | null
          preferred_category?: string | null
          previous_team?: string | null
          registration_code?: string | null
          registration_fee_agreed?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          roles?: string[]
          runs_scored?: string | null
          status?: string
          submitted_at?: string
          tshirt_size?: string | null
          wickets_taken?: string | null
          work_email?: string | null
        }
        Update: {
          achievements?: string | null
          age?: number
          assigned_category?: string | null
          batting_average?: string | null
          batting_strike_rate?: string | null
          batting_style?: string | null
          bowling_strike_rate?: string | null
          bowling_style?: string | null
          company?: string | null
          cricheroes_url?: string | null
          dob?: string | null
          economy?: string | null
          email?: string | null
          full_name?: string
          id?: string
          jersey_name?: string | null
          jersey_number?: string | null
          linkedin_url?: string | null
          locality?: string | null
          lower_size?: string | null
          matches_played?: string | null
          medical_injury?: string | null
          phone?: string
          photo_url?: string | null
          preferred_category?: string | null
          previous_team?: string | null
          registration_code?: string | null
          registration_fee_agreed?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          roles?: string[]
          runs_scored?: string | null
          status?: string
          submitted_at?: string
          tshirt_size?: string | null
          wickets_taken?: string | null
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          franchise_id: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          franchise_id?: string | null
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          created_at?: string
          franchise_id?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_enquiries: {
        Row: {
          company: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          status: string
          tier_interest: string | null
        }
        Insert: {
          company: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
          tier_interest?: string | null
        }
        Update: {
          company?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
          tier_interest?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          display_order: number
          id: string
          logo_url: string | null
          name: string
          tier: string | null
          website_url: string | null
        }
        Insert: {
          display_order?: number
          id?: string
          logo_url?: string | null
          name: string
          tier?: string | null
          website_url?: string | null
        }
        Update: {
          display_order?: number
          id?: string
          logo_url?: string | null
          name?: string
          tier?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      squads: {
        Row: {
          created_at: string
          franchise_id: string
          id: string
          player_id: string
          round: number
          sold_price: number
        }
        Insert: {
          created_at?: string
          franchise_id: string
          id?: string
          player_id: string
          round?: number
          sold_price: number
        }
        Update: {
          created_at?: string
          franchise_id?: string
          id?: string
          player_id?: string
          round?: number
          sold_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "squads_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          franchise_id: string
          id: string
          player_id: string
          remarks: string | null
          target_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          franchise_id: string
          id?: string
          player_id: string
          remarks?: string | null
          target_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          franchise_id?: string
          id?: string
          player_id?: string
          remarks?: string | null
          target_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      players_pool: {
        Row: {
          age: number | null
          assigned_category: string | null
          batting_average: string | null
          batting_strike_rate: string | null
          bowling_strike_rate: string | null
          cricheroes_url: string | null
          economy: string | null
          full_name: string | null
          id: string | null
          matches_played: string | null
          photo_url: string | null
          roles: string[] | null
          runs_scored: string | null
          wickets_taken: string | null
        }
        Relationships: []
      }
      players_public: {
        Row: {
          assigned_category: string | null
          full_name: string | null
          id: string | null
          photo_url: string | null
          role: string | null
        }
        Insert: {
          assigned_category?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          role?: string | null
        }
        Update: {
          assigned_category?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_phone_registered: { Args: { p_phone: string }; Returns: number }
      current_app_role: { Args: never; Returns: string }
      current_franchise_id: { Args: never; Returns: string }
      place_bid: { Args: never; Returns: Json }
      sell_current_player: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
