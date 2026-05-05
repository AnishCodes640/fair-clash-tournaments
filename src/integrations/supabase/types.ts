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
      admin_banners: {
        Row: {
          bg_color: string | null
          body: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          priority: number
          starts_at: string
          title: string
        }
        Insert: {
          bg_color?: string | null
          body?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          starts_at?: string
          title: string
        }
        Update: {
          bg_color?: string | null
          body?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
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
      auto_flags: {
        Row: {
          created_at: string
          details: Json
          id: string
          rule: string
          severity: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          rule: string
          severity?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          rule?: string
          severity?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      aviator_daily_pool: {
        Row: {
          pool_date: string
          total_in: number
          total_out: number
          updated_at: string
        }
        Insert: {
          pool_date?: string
          total_in?: number
          total_out?: number
          updated_at?: string
        }
        Update: {
          pool_date?: string
          total_in?: number
          total_out?: number
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          deleted_for_recipient: boolean
          deleted_for_sender: boolean
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_for_recipient?: boolean
          deleted_for_sender?: boolean
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_for_recipient?: boolean
          deleted_for_sender?: boolean
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
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
      mailbox_messages: {
        Row: {
          audience: string
          body: string
          created_at: string
          expires_at: string | null
          id: string
          scheduled_at: string
          sender_id: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          scheduled_at?: string
          sender_id: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          scheduled_at?: string
          sender_id?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      mailbox_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailbox_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mailbox_messages"
            referencedColumns: ["id"]
          },
        ]
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
      player_progression: {
        Row: {
          achievements: Json
          best_streak: number
          created_at: string
          current_streak: number
          id: string
          level: string
          lifetime_earnings: number
          lifetime_games: number
          lifetime_wins: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          achievements?: Json
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          level?: string
          lifetime_earnings?: number
          lifetime_games?: number
          lifetime_wins?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          achievements?: Json
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          level?: string
          lifetime_earnings?: number
          lifetime_games?: number
          lifetime_wins?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      prediction_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          match_id: string
          multiplier: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          match_id: string
          multiplier?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          match_id?: string
          multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "prediction_options_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "sports_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_likes: {
        Row: {
          created_at: string
          id: string
          liked_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_id?: string
          liker_id?: string
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
      quiz_session_answers: {
        Row: {
          answered_at: string | null
          correct_answer: string
          id: string
          is_correct: boolean | null
          question_id: string
          session_id: string
          user_answer: string | null
        }
        Insert: {
          answered_at?: string | null
          correct_answer: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          session_id: string
          user_answer?: string | null
        }
        Update: {
          answered_at?: string | null
          correct_answer?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          session_id?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          correct_count: number
          created_at: string
          entry_fee: number
          id: string
          reward: number
          status: string
          user_id: string
          wrong_count: number
        }
        Insert: {
          correct_count?: number
          created_at?: string
          entry_fee?: number
          id?: string
          reward?: number
          status?: string
          user_id: string
          wrong_count?: number
        }
        Update: {
          correct_count?: number
          created_at?: string
          entry_fee?: number
          id?: string
          reward?: number
          status?: string
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      sports_matches: {
        Row: {
          created_at: string
          current_players: number
          description: string | null
          entry_fee: number
          id: string
          max_players: number
          start_time: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          winning_option_id: string | null
        }
        Insert: {
          created_at?: string
          current_players?: number
          description?: string | null
          entry_fee?: number
          id?: string
          max_players?: number
          start_time: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          winning_option_id?: string | null
        }
        Update: {
          created_at?: string
          current_players?: number
          description?: string | null
          entry_fee?: number
          id?: string
          max_players?: number
          start_time?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          winning_option_id?: string | null
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
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_predictions: {
        Row: {
          bet_amount: number
          created_at: string
          id: string
          match_id: string
          option_id: string
          result: string
          user_id: string
          win_amount: number
        }
        Insert: {
          bet_amount: number
          created_at?: string
          id?: string
          match_id: string
          option_id: string
          result?: string
          user_id: string
          win_amount?: number
        }
        Update: {
          bet_amount?: number
          created_at?: string
          id?: string
          match_id?: string
          option_id?: string
          result?: string
          user_id?: string
          win_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "sports_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_predictions_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "prediction_options"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          admin_note: string | null
          category: string
          context_url: string | null
          created_at: string
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          category: string
          context_url?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          context_url?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
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
      user_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          source: string
          starts_at: string
          tier: string
          tier_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          source?: string
          starts_at?: string
          tier: string
          tier_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          source?: string
          starts_at?: string
          tier?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_tiers: {
        Row: {
          display_name: string
          duration: string
          duration_days: number
          id: string
          is_active: boolean
          price: number
          tier: string
        }
        Insert: {
          display_name: string
          duration: string
          duration_days: number
          id: string
          is_active?: boolean
          price: number
          tier: string
        }
        Update: {
          display_name?: string
          duration?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          price?: number
          tier?: string
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
      admin_grant_verification: {
        Args: { p_deduct: boolean; p_tier_id: string; p_user_id: string }
        Returns: Json
      }
      aviator_record_bet: { Args: { p_amount: number }; Returns: Json }
      aviator_record_payout: { Args: { p_amount: number }; Returns: Json }
      delete_direct_message: { Args: { p_message_id: string }; Returns: Json }
      finish_quiz_session: { Args: { p_session_id: string }; Returns: Json }
      get_active_verification: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          tier: string
        }[]
      }
      get_friend_feed: {
        Args: { p_limit?: number }
        Returns: {
          active_theme: string
          avatar_url: string
          display_name: string
          kind: string
          occurred_at: string
          summary: string
          user_id: string
          username: string
        }[]
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
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          active_theme: string
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          follower_count: number
          following_count: number
          is_admin: boolean
          like_count: number
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_my_blocks: {
        Args: never
        Returns: {
          avatar_url: string
          blocked_id: string
          created_at: string
          display_name: string
          username: string
        }[]
      }
      mailbox_mark_read: { Args: { p_message_id: string }; Returns: Json }
      mark_conversation_read: { Args: { p_other: string }; Returns: Json }
      place_bet: {
        Args: { p_amount: number; p_game_id: string; p_game_title: string }
        Returns: Json
      }
      place_sports_prediction: {
        Args: { p_match_id: string; p_option_id: string }
        Returns: Json
      }
      purchase_theme: {
        Args: { p_price: number; p_theme_id: string }
        Returns: Json
      }
      purchase_verification: { Args: { p_tier_id: string }; Returns: Json }
      record_game_result: {
        Args: { p_amount: number; p_session_id: string; p_won: boolean }
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
      resolve_report: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      resolve_sports_match: {
        Args: { p_match_id: string; p_winning_option_id: string }
        Returns: Json
      }
      search_users: {
        Args: { p_query: string }
        Returns: {
          active_theme: string
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      send_direct_message: {
        Args: { p_body: string; p_recipient: string }
        Returns: Json
      }
      start_quiz_session: { Args: { p_questions: Json }; Returns: Json }
      submit_quiz_answer: {
        Args: { p_answer: string; p_question_id: string; p_session_id: string }
        Returns: Json
      }
      submit_report: {
        Args: {
          p_category: string
          p_context_url?: string
          p_reason: string
          p_target: string
        }
        Returns: Json
      }
      toggle_block: { Args: { p_target: string }; Returns: Json }
      toggle_follow: { Args: { p_target: string }; Returns: Json }
      toggle_profile_like: { Args: { p_target: string }; Returns: Json }
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
