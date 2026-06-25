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
      always_send_phone: {
        Row: {
          phone: string
        }
        Insert: {
          phone: string
        }
        Update: {
          phone?: string
        }
        Relationships: []
      }
      domain_config: {
        Row: {
          config_json: Json
          domain: string
          updated_at: string | null
        }
        Insert: {
          config_json: Json
          domain: string
          updated_at?: string | null
        }
        Update: {
          config_json?: Json
          domain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      held_ticket_segments: {
        Row: {
          arrival_airport: string
          created_at: string
          departure_airport: string
          departure_date: string
          departure_time: string
          held_ticket_id: string
          id: string
          segment_order: number
          trip: string
        }
        Insert: {
          arrival_airport: string
          created_at?: string
          departure_airport: string
          departure_date: string
          departure_time: string
          held_ticket_id: string
          id?: string
          segment_order: number
          trip: string
        }
        Update: {
          arrival_airport?: string
          created_at?: string
          departure_airport?: string
          departure_date?: string
          departure_time?: string
          held_ticket_id?: string
          id?: string
          segment_order?: number
          trip?: string
        }
        Relationships: [
          {
            foreignKeyName: "held_ticket_segments_held_ticket_id_fkey"
            columns: ["held_ticket_id"]
            isOneToOne: false
            referencedRelation: "held_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      held_tickets: {
        Row: {
          airline: string
          created_at: string
          expire_date: string | null
          hold_date: string
          id: string
          namelist: string[]
          number_person: number
          payment_status: boolean
          pnr: string
          ticket_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          airline: string
          created_at?: string
          expire_date?: string | null
          hold_date?: string
          id?: string
          namelist?: string[]
          number_person?: number
          payment_status?: boolean
          pnr: string
          ticket_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string
          created_at?: string
          expire_date?: string | null
          hold_date?: string
          id?: string
          namelist?: string[]
          number_person?: number
          payment_status?: boolean
          pnr?: string
          ticket_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inbound_email: {
        Row: {
          body: string | null
          created_at: string | null
          customer: string | null
          file_name: string | null
          file_path: string | null
          hang: string | null
          id: string
          note: string | null
          noti: boolean | null
          pnr: string | null
          sender_email: string | null
          sender_name: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          customer?: string | null
          file_name?: string | null
          file_path?: string | null
          hang?: string | null
          id?: string
          note?: string | null
          noti?: boolean | null
          pnr?: string | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          customer?: string | null
          file_name?: string | null
          file_path?: string | null
          hang?: string | null
          id?: string
          note?: string | null
          noti?: boolean | null
          pnr?: string | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      kakanoti: {
        Row: {
          id: string
          name: string
          phone: string | null
          pnr: string
          row_sent: boolean | null
          timecreat: string
          type: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          pnr: string
          row_sent?: boolean | null
          timecreat?: string
          type?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          pnr?: string
          row_sent?: boolean | null
          timecreat?: string
          type?: string | null
        }
        Relationships: []
      }
      mail_queue: {
        Row: {
          banner: string | null
          created_at: string | null
          customer_name: string | null
          email: string
          id: string
          last_error: string | null
          missing_pnrs: Json | null
          next_retry_at: string | null
          phone: string | null
          pnrs: Json
          retry_count: number | null
          salutation: string | null
          sent_at: string | null
          status: string
          type: number | null
          updated_at: string | null
        }
        Insert: {
          banner?: string | null
          created_at?: string | null
          customer_name?: string | null
          email: string
          id?: string
          last_error?: string | null
          missing_pnrs?: Json | null
          next_retry_at?: string | null
          phone?: string | null
          pnrs: Json
          retry_count?: number | null
          salutation?: string | null
          sent_at?: string | null
          status?: string
          type?: number | null
          updated_at?: string | null
        }
        Update: {
          banner?: string | null
          created_at?: string | null
          customer_name?: string | null
          email?: string
          id?: string
          last_error?: string | null
          missing_pnrs?: Json | null
          next_retry_at?: string | null
          phone?: string | null
          pnrs?: Json
          retry_count?: number | null
          salutation?: string | null
          sent_at?: string | null
          status?: string
          type?: number | null
          updated_at?: string | null
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
      pnr_email: {
        Row: {
          email: string | null
          id: string
          pnr: string | null
          timecreat: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          pnr?: string | null
          timecreat?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          pnr?: string | null
          timecreat?: string | null
        }
        Relationships: []
      }
      pnr_email_logs: {
        Row: {
          customer_name: string | null
          day1: string | null
          day2: string | null
          day3: string | null
          day4: string | null
          email: string
          first_sent_at: string | null
          id: number
          last_sent_at: string | null
          mail_type: string
          phone: string | null
          pnr: string
          salutation: string | null
          send_count: number | null
          time1: string | null
          time2: string | null
          time3: string | null
          time4: string | null
          trip1: string | null
          trip2: string | null
          trip3: string | null
          trip4: string | null
        }
        Insert: {
          customer_name?: string | null
          day1?: string | null
          day2?: string | null
          day3?: string | null
          day4?: string | null
          email: string
          first_sent_at?: string | null
          id?: number
          last_sent_at?: string | null
          mail_type?: string
          phone?: string | null
          pnr: string
          salutation?: string | null
          send_count?: number | null
          time1?: string | null
          time2?: string | null
          time3?: string | null
          time4?: string | null
          trip1?: string | null
          trip2?: string | null
          trip3?: string | null
          trip4?: string | null
        }
        Update: {
          customer_name?: string | null
          day1?: string | null
          day2?: string | null
          day3?: string | null
          day4?: string | null
          email?: string
          first_sent_at?: string | null
          id?: number
          last_sent_at?: string | null
          mail_type?: string
          phone?: string | null
          pnr?: string
          salutation?: string | null
          send_count?: number | null
          time1?: string | null
          time2?: string | null
          time3?: string | null
          time4?: string | null
          trip1?: string | null
          trip2?: string | null
          trip3?: string | null
          trip4?: string | null
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
          list_other: string[] | null
          perm_check_discount: boolean | null
          perm_check_other: boolean | null
          perm_check_sunpq: boolean | null
          perm_check_vj: boolean | null
          perm_check_vna: boolean | null
          perm_check_vna_issued: boolean | null
          perm_get_pending_ticket: boolean | null
          perm_get_ticket_image: boolean | null
          perm_hold_ticket: boolean | null
          perm_reprice: boolean | null
          perm_send_ticket: boolean | null
          phone: string | null
          price_markup: number | null
          price_ow_other: number | null
          price_ow_sunpq: number | null
          price_ow_vj: number | null
          price_ow_vna: number | null
          price_rt_other: number | null
          price_rt_sunpq: number | null
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
          list_other?: string[] | null
          perm_check_discount?: boolean | null
          perm_check_other?: boolean | null
          perm_check_sunpq?: boolean | null
          perm_check_vj?: boolean | null
          perm_check_vna?: boolean | null
          perm_check_vna_issued?: boolean | null
          perm_get_pending_ticket?: boolean | null
          perm_get_ticket_image?: boolean | null
          perm_hold_ticket?: boolean | null
          perm_reprice?: boolean | null
          perm_send_ticket?: boolean | null
          phone?: string | null
          price_markup?: number | null
          price_ow_other?: number | null
          price_ow_sunpq?: number | null
          price_ow_vj?: number | null
          price_ow_vna?: number | null
          price_rt_other?: number | null
          price_rt_sunpq?: number | null
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
          list_other?: string[] | null
          perm_check_discount?: boolean | null
          perm_check_other?: boolean | null
          perm_check_sunpq?: boolean | null
          perm_check_vj?: boolean | null
          perm_check_vna?: boolean | null
          perm_check_vna_issued?: boolean | null
          perm_get_pending_ticket?: boolean | null
          perm_get_ticket_image?: boolean | null
          perm_hold_ticket?: boolean | null
          perm_reprice?: boolean | null
          perm_send_ticket?: boolean | null
          phone?: string | null
          price_markup?: number | null
          price_ow_other?: number | null
          price_ow_sunpq?: number | null
          price_ow_vj?: number | null
          price_ow_vna?: number | null
          price_rt_other?: number | null
          price_rt_sunpq?: number | null
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
      reprice: {
        Row: {
          auto_reprice: boolean | null
          created_at: string
          email: string | null
          id: string
          id_f2: string | null
          last_checked_at: string | null
          new_price: number | null
          old_price: number | null
          pnr: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          auto_reprice?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          id_f2?: string | null
          last_checked_at?: string | null
          new_price?: number | null
          old_price?: number | null
          pnr: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          auto_reprice?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          id_f2?: string | null
          last_checked_at?: string | null
          new_price?: number | null
          old_price?: number | null
          pnr?: string
          status?: string
          type?: string
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
      sent_delay_pnr: {
        Row: {
          email: string | null
          error_message: string | null
          hang: string | null
          id: string
          kakao_status: string | null
          newtime: string | null
          oldtime: string | null
          phone: string | null
          pnr: string | null
          rcs_status: string | null
          sent_at: string | null
          timecreate: string | null
          trip: string | null
        }
        Insert: {
          email?: string | null
          error_message?: string | null
          hang?: string | null
          id?: string
          kakao_status?: string | null
          newtime?: string | null
          oldtime?: string | null
          phone?: string | null
          pnr?: string | null
          rcs_status?: string | null
          sent_at?: string | null
          timecreate?: string | null
          trip?: string | null
        }
        Update: {
          email?: string | null
          error_message?: string | null
          hang?: string | null
          id?: string
          kakao_status?: string | null
          newtime?: string | null
          oldtime?: string | null
          phone?: string | null
          pnr?: string | null
          rcs_status?: string | null
          sent_at?: string | null
          timecreate?: string | null
          trip?: string | null
        }
        Relationships: []
      }
      sent_phone: {
        Row: {
          phone: string
          sent_at: string
        }
        Insert: {
          phone: string
          sent_at?: string
        }
        Update: {
          phone?: string
          sent_at?: string
        }
        Relationships: []
      }
      set_rate_limit: {
        Row: {
          id: string
          minutes: number
          updated_at: string
        }
        Insert: {
          id?: string
          minutes?: number
          updated_at?: string
        }
        Update: {
          id?: string
          minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      ticket_log: {
        Row: {
          created_at: string | null
          day1: string | null
          day2: string | null
          day3: string | null
          day4: string | null
          file_path: string | null
          hang: string | null
          id: number
          name: string | null
          paymentstatus: boolean | null
          pnr: string | null
          time1: string | null
          time2: string | null
          time3: string | null
          time4: string | null
          trip1: string | null
          trip2: string | null
          trip3: string | null
          trip4: string | null
        }
        Insert: {
          created_at?: string | null
          day1?: string | null
          day2?: string | null
          day3?: string | null
          day4?: string | null
          file_path?: string | null
          hang?: string | null
          id?: never
          name?: string | null
          paymentstatus?: boolean | null
          pnr?: string | null
          time1?: string | null
          time2?: string | null
          time3?: string | null
          time4?: string | null
          trip1?: string | null
          trip2?: string | null
          trip3?: string | null
          trip4?: string | null
        }
        Update: {
          created_at?: string | null
          day1?: string | null
          day2?: string | null
          day3?: string | null
          day4?: string | null
          file_path?: string | null
          hang?: string | null
          id?: never
          name?: string | null
          paymentstatus?: boolean | null
          pnr?: string | null
          time1?: string | null
          time2?: string | null
          time3?: string | null
          time4?: string | null
          trip1?: string | null
          trip2?: string | null
          trip3?: string | null
          trip4?: string | null
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
      clear_sent_phone: { Args: never; Returns: number }
      delete_old_reprice: { Args: never; Returns: undefined }
      get_phone_email_to_pnr: {
        Args: { pnr_input: string }
        Returns: {
          email: string
          name: string
          phone: string
        }[]
      }
      get_unsent_latest_kakao: {
        Args: never
        Returns: {
          id: string
          phone: string
          pnr: string
          type: string
          wl: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_kakanoti_phone_sent: { Args: never; Returns: undefined }
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
