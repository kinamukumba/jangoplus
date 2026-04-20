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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_missions: {
        Row: {
          bio_target: number
          completed: boolean
          completed_at: string | null
          created_at: string
          fis_target: number
          id: string
          mission_date: string
          qui_target: number
          rev_target: number
          score_bio: number | null
          score_fis: number | null
          score_qui: number | null
          score_rev: number | null
          score_total: number | null
          user_id: string
        }
        Insert: {
          bio_target?: number
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          fis_target?: number
          id?: string
          mission_date: string
          qui_target?: number
          rev_target?: number
          score_bio?: number | null
          score_fis?: number | null
          score_qui?: number | null
          score_rev?: number | null
          score_total?: number | null
          user_id: string
        }
        Update: {
          bio_target?: number
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          fis_target?: number
          id?: string
          mission_date?: string
          qui_target?: number
          rev_target?: number
          score_bio?: number | null
          score_fis?: number | null
          score_qui?: number | null
          score_rev?: number | null
          score_total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mission_attempts: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          mission_id: string
          question_id: string
          selected_index: number
          subject_code: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct: boolean
          mission_id: string
          question_id: string
          selected_index: number
          subject_code: string
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          mission_id?: string
          question_id?: string
          selected_index?: number
          subject_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_attempts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "daily_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          options: Json
          statement: string
          subject_id: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          options: Json
          statement: string
          subject_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          statement?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          daily_target: number
          id: string
          name: string
        }
        Insert: {
          code: string
          daily_target?: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          daily_target?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          current_streak: number
          delay_days: number
          last_completed_date: string | null
          level: number
          updated_at: string
          user_id: string
          week_start_date: string
          weekly_missions: number
          weekly_xp: number
          xp_total: number
        }
        Insert: {
          current_streak?: number
          delay_days?: number
          last_completed_date?: string | null
          level?: number
          updated_at?: string
          user_id: string
          week_start_date?: string
          weekly_missions?: number
          weekly_xp?: number
          xp_total?: number
        }
        Update: {
          current_streak?: number
          delay_days?: number
          last_completed_date?: string | null
          level?: number
          updated_at?: string
          user_id?: string
          week_start_date?: string
          weekly_missions?: number
          weekly_xp?: number
          xp_total?: number
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          mission_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          mission_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          mission_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      weekly_leaderboard: {
        Row: {
          current_streak: number | null
          display_name: string | null
          level: number | null
          user_id: string | null
          week_start_date: string | null
          weekly_missions: number | null
          weekly_xp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      level_for_xp: { Args: { xp: number }; Returns: number }
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
  public: {
    Enums: {},
  },
} as const
