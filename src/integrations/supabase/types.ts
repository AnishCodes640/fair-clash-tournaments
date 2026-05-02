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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          bet_amount: number | null
          created_at: string
          game_id: string
          game_title: string
          id: string
          result: string | null
          user_id: string
          win_amount: number | null
        }
        Insert: {
          bet_amount?: number | null
          created_at?: string
          game_id: string
          game_title: string
          id?: string
          result?: string | null
          user_id: string
          win_amount?: number | null
        }
        Update: {
          bet_amount?: number | null
          created_at?: string
          game_id?: string
          game_title?: string
          id?: string
          result?: string | null
          user_id?: string
          win_amount?: number | null
        }
        Relationships: []
      }
      games: {
        Row: {
          bot_difficulty: string | null
          bot_enabled: boolean
          bot_win_probability: number | null
          created_at: string
          description: string | null
          game_file_url: string | null
          game_type: string
          house_edge: number | null
          icon_url: string | null
          id: string
          is_active: boolean
          max_bet: number | null
          min_bet: number | null
          multiplayer_enabled: boolean
          title: string
          tournament_enabled: boolean
          updated_at: string
        }
        Insert: {
          bot_difficulty?: string | null
          bot_enabled?: boolean
          bot_win_probability?: number | null
          created_at?: string
          description?: string | null
          game_file_url?: string | null
          game_type: string
          house_edge?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_bet?: number | null
          min_bet?: number | null
          multiplayer_enabled?: boolean
          title: string
          tournament_enabled?: boolean
          updated_at?: string
        }
        Update: {
          bot_difficulty?: string | null
          bot_enabled?: boolean
          bot_win_probability?: number | null
          created_at?: string
          description?: string | null
          game_file_url?: string | null
          game_type?: string
          house_edge?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_bet?: number | null
          min_bet?: number | null
          multiplayer_enabled?: boolean
          title?: string
          tournament_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ludo_players: {
        Row: {
          avatar_url: string | null
          finished: boolean
          id: string
          is_connected: boolean
          joined_at: string
          pieces: Json
          player_index: number
          room_id: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          finished?: boolean
          id?: string
          is_connected?: boolean
          joined_at?: string
          pieces?: Json
          player_index: number
          room_id: string
          user_id: string
          username?: string
        }
        Update: {
          avatar_url?: string | null
          finished?: boolean
          id?: string
          is_connected?: boolean
          joined_at?: string
          pieces?: Json
          player_index?: number
          room_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "ludo_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "ludo_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_rooms: {
        Row: {
          board_state: Json
          created_at: string
          creator_user_id: string | null
          current_turn: number
          dice_value: number | null
          entry_fee: number
          id: string
          mode: string
          prize_pool: number
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          board_state?: Json
          created_at?: string
          creator_user_id?: string | null
          current_turn?: number
          dice_value?: number | null
          entry_fee?: number
          id?: string
          mode?: string
          prize_pool?: number
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          board_state?: Json
          created_at?: string
          creator_user_id?: string | null
          current_turn?: number
          dice_value?: number | null
          entry_fee?: number
          id?: string
          mode?: string
          prize_pool?: number
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      notices: {
        Row: {
          auto_expiry_hours: number | null
          content: string
          created_at: string
          expiry_at: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          auto_expiry_hours?: number | null
          content: string
          created_at?: string
          expiry_at?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          auto_expiry_hours?: number | null
          content?: string
          created_at?: string
          expiry_at?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          reviewed_at: string | null
          screenshot_url: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          screenshot_url: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          screenshot_url?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_theme: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          privacy_accepted: boolean
          security_flags: Json | null
          status: string
          updated_at: string
          user_id: string
          username: string
          wallet_balance: number
        }
        Insert: {
          active_theme?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          privacy_accepted?: boolean
          security_flags?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          username: string
          wallet_balance?: number
        }
        Update: {
          active_theme?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          privacy_accepted?: boolean
          security_flags?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      tournament_participants: {
        Row: {
          id: string
          joined_at: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          current_players: number
          entry_fee: number
          game_id: string
          id: string
          match_type: string | null
          max_players: number
          prize_pool: number
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_players?: number
          entry_fee?: number
          game_id: string
          id?: string
          match_type?: string | null
          max_players?: number
          prize_pool?: number
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_players?: number
          entry_fee?: number
          game_id?: string
          id?: string
          match_type?: string | null
          max_players?: number
          prize_pool?: number
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_themes: {
        Row: {
          id: string
          purchased_at: string
          theme_id: string
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          theme_id: string
          user_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          theme_id?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fee: number | null
          id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          mobile_number: string | null
          net_amount: number
          platform_fee: number
          qr_code_url: string | null
          reviewed_at: string | null
          status: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          mobile_number?: string | null
          net_amount?: number
          platform_fee?: number
          qr_code_url?: string | null
          reviewed_at?: string | null
          status?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          mobile_number?: string | null
          net_amount?: number
          platform_fee?: number
          qr_code_url?: string | null
          reviewed_at?: string | null
          status?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          status: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_winnings: {
        Args: { p_amount: number; p_game_title: string; p_session_id?: string }
        Returns: Json
      }
      get_public_leaderboard: {
        Args: never
        Returns: {
          active_theme: string
          avatar_url: string
          display_name: string
          user_id: string
          username: string
          wallet_balance: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_bet: {
        Args: { p_amount: number; p_game_id: string; p_game_title: string }
        Returns: Json
      }
      purchase_theme: {
        Args: { p_price: number; p_theme_id: string }
        Returns: Json
      }
      record_loss: { Args: { p_session_id: string }; Returns: Json }
      refund_bet: {
        Args: { p_amount: number; p_reason: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_mobile_number?: string
          p_qr_code_url?: string
          p_upi_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
