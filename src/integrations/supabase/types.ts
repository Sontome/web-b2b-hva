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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      held_tickets: {
        Row: {
          created_at: string
          expire_date: string | null
          flight_details: Json | null
          hold_date: string
          id: string
          pnr: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expire_date?: string | null
          flight_details?: Json | null
          hold_date?: string
          id?: string
          pnr: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expire_date?: string | null
          flight_details?: Json | null
          hold_date?: string
          id?: string
          pnr?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monitored_flights: {
        Row: {
          airline: string
          arrival_airport: string
          auto_hold_enabled: boolean | null
          booking_key_departure: string | null
          booking_key_return: string | null
          check_interval_minutes: number | null
          created_at: string
          current_price: number | null
          departure_airport: string
          departure_date: string
          departure_time: string | null
          id: string
          is_active: boolean | null
          is_round_trip: boolean | null
          last_checked_at: string | null
          passengers: Json | null
          pnr: string | null
          reprice_pnr: string | null
          return_date: string | null
          return_time: string | null
          segments: Json | null
          ticket_class: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          airline: string
          arrival_airport: string
          auto_hold_enabled?: boolean | null
          booking_key_departure?: string | null
          booking_key_return?: string | null
          check_interval_minutes?: number | null
          created_at?: string
          current_price?: number | null
          departure_airport: string
          departure_date: string
          departure_time?: string | null
          id?: string
          is_active?: boolean | null
          is_round_trip?: boolean | null
          last_checked_at?: string | null
          passengers?: Json | null
          pnr?: string | null
          reprice_pnr?: string | null
          return_date?: string | null
          return_time?: string | null
          segments?: Json | null
          ticket_class?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string
          arrival_airport?: string
          auto_hold_enabled?: boolean | null
          booking_key_departure?: string | null
          booking_key_return?: string | null
          check_interval_minutes?: number | null
          created_at?: string
          current_price?: number | null
          departure_airport?: string
          departure_date?: string
          departure_time?: string | null
          id?: string
          is_active?: boolean | null
          is_round_trip?: boolean | null
          last_checked_at?: string | null
          passengers?: Json | null
          pnr?: string | null
          reprice_pnr?: string | null
          return_date?: string | null
          return_time?: string | null
          segments?: Json | null
          ticket_class?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          agent_name: string | null
          apikey_telegram: string | null
          banner: string | null
          business_number: string | null
          created_at: string
          full_name: string
          hold_ticket_quantity: number | null
          id: string
          idchat_telegram: string | null
          linkfacebook: string | null
          perm_check_discount: boolean | null
          perm_check_vj: boolean | null
          perm_check_vna: boolean | null
          perm_check_vna_issued: boolean | null
          perm_get_pending_ticket: boolean | null
          perm_get_ticket_image: boolean | null
          perm_hold_ticket: boolean | null
          perm_send_ticket: boolean | null
          phone: string | null
          price_markup: number | null
          price_ow_vj: number | null
          price_ow_vna: number | null
          price_rt_vj: number | null
          price_rt_vna: number | null
          price_vj: number | null
          price_vna: number | null
          status: string | null
          ticket_email: string | null
          ticket_phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agent_name?: string | null
          apikey_telegram?: string | null
          banner?: string | null
          business_number?: string | null
          created_at?: string
          full_name: string
          hold_ticket_quantity?: number | null
          id: string
          idchat_telegram?: string | null
          linkfacebook?: string | null
          perm_check_discount?: boolean | null
          perm_check_vj?: boolean | null
          perm_check_vna?: boolean | null
          perm_check_vna_issued?: boolean | null
          perm_get_pending_ticket?: boolean | null
          perm_get_ticket_image?: boolean | null
          perm_hold_ticket?: boolean | null
          perm_send_ticket?: boolean | null
          phone?: string | null
          price_markup?: number | null
          price_ow_vj?: number | null
          price_ow_vna?: number | null
          price_rt_vj?: number | null
          price_rt_vna?: number | null
          price_vj?: number | null
          price_vna?: number | null
          status?: string | null
          ticket_email?: string | null
          ticket_phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agent_name?: string | null
          apikey_telegram?: string | null
          banner?: string | null
          business_number?: string | null
          created_at?: string
          full_name?: string
          hold_ticket_quantity?: number | null
          id?: string
          idchat_telegram?: string | null
          linkfacebook?: string | null
          perm_check_discount?: boolean | null
          perm_check_vj?: boolean | null
          perm_check_vna?: boolean | null
          perm_check_vna_issued?: boolean | null
          perm_get_pending_ticket?: boolean | null
          perm_get_ticket_image?: boolean | null
          perm_hold_ticket?: boolean | null
          perm_send_ticket?: boolean | null
          phone?: string | null
          price_markup?: number | null
          price_ow_vj?: number | null
          price_ow_vna?: number | null
          price_rt_vj?: number | null
          price_rt_vna?: number | null
          price_vj?: number | null
          price_vna?: number | null
          status?: string | null
          ticket_email?: string | null
          ticket_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          id: string
          search_data: Json | null
          searched_at: string
          user_id: string
        }
        Insert: {
          id?: string
          search_data?: Json | null
          searched_at?: string
          user_id: string
        }
        Update: {
          id?: string
          search_data?: Json | null
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
