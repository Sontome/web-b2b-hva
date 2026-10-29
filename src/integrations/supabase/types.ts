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
      airline_baggage_defaults: {
        Row: {
          airline: string
          bag_kg_per_piece: number | null
          bag_pieces: number | null
          carry_on_kg_per_piece: number | null
          carry_on_pieces: number | null
          enabled: boolean
          updated_at: string
        }
        Insert: {
          airline: string
          bag_kg_per_piece?: number | null
          bag_pieces?: number | null
          carry_on_kg_per_piece?: number | null
          carry_on_pieces?: number | null
          enabled?: boolean
          updated_at?: string
        }
        Update: {
          airline?: string
          bag_kg_per_piece?: number | null
          bag_pieces?: number | null
          carry_on_kg_per_piece?: number | null
          carry_on_pieces?: number | null
          enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      airline_promo_codes: {
        Row: {
          airline: string
          code: string
          created_at: string
          enabled: boolean
          id: string
          note: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          airline: string
          code: string
          created_at?: string
          enabled?: boolean
          id?: string
          note?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          airline?: string
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          note?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
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
      ape_email: {
        Row: {
          created_at: string
          email: string
          hang: string | null
          id: number
          pnr: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          hang?: string | null
          id?: never
          pnr: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          hang?: string | null
          id?: never
          pnr?: string
          status?: string
          updated_at?: string | null
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
      flight_change_email: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          hang: string
          id: number
          message_id: string | null
          sender_email: string
          sender_name: string | null
          subject: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          hang: string
          id?: number
          message_id?: string | null
          sender_email: string
          sender_name?: string | null
          subject: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          hang?: string
          id?: number
          message_id?: string | null
          sender_email?: string
          sender_name?: string | null
          subject?: string
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
          tongbillgiagoc: number | null
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
          tongbillgiagoc?: number | null
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
          tongbillgiagoc?: number | null
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
      kakanoti_apiapp: {
        Row: {
          email: string | null
          hang: string | null
          id: string
          namelist: string
          number_person: number | null
          phone: string | null
          pnr: string
          price: number | null
          status: string | null
          timecreat: string
          timesend: string | null
          type: string | null
        }
        Insert: {
          email?: string | null
          hang?: string | null
          id?: string
          namelist: string
          number_person?: number | null
          phone?: string | null
          pnr: string
          price?: number | null
          status?: string | null
          timecreat?: string
          timesend?: string | null
          type?: string | null
        }
        Update: {
          email?: string | null
          hang?: string | null
          id?: string
          namelist?: string
          number_person?: number | null
          phone?: string | null
          pnr?: string
          price?: number | null
          status?: string | null
          timecreat?: string
          timesend?: string | null
          type?: string | null
        }
        Relationships: []
      }
      kakao_apiapp_config: {
        Row: {
          domain: string
          id: string
          price_addon: number
          updated_at: string | null
        }
        Insert: {
          domain: string
          id?: string
          price_addon?: number
          updated_at?: string | null
        }
        Update: {
          domain?: string
          id?: string
          price_addon?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      mail_event_webhook_config: {
        Row: {
          enabled: boolean
          endpoint: string
          singleton: boolean
          vault_secret_id: string
        }
        Insert: {
          enabled?: boolean
          endpoint: string
          singleton?: boolean
          vault_secret_id: string
        }
        Update: {
          enabled?: boolean
          endpoint?: string
          singleton?: boolean
          vault_secret_id?: string
        }
        Relationships: []
      }
      mail_pnr_events: {
        Row: {
          attempts: number
          changed_at: string
          claim_token: string | null
          claimed_at: string | null
          claimed_generation: number | null
          due_at: string
          generation: number
          last_error: string | null
          pnr: string
          retry_required: boolean
          state: string
        }
        Insert: {
          attempts?: number
          changed_at?: string
          claim_token?: string | null
          claimed_at?: string | null
          claimed_generation?: number | null
          due_at: string
          generation?: number
          last_error?: string | null
          pnr: string
          retry_required?: boolean
          state?: string
        }
        Update: {
          attempts?: number
          changed_at?: string
          claim_token?: string | null
          claimed_at?: string | null
          claimed_generation?: number | null
          due_at?: string
          generation?: number
          last_error?: string | null
          pnr?: string
          retry_required?: boolean
          state?: string
        }
        Relationships: []
      }
      mail_queue: {
        Row: {
          airline: string | null
          attachments: Json
          banner: string | null
          created_at: string | null
          customer_name: string | null
          email: string
          from_email: string | null
          id: string
          last_error: string | null
          locked_until: string | null
          missing_pnrs: Json | null
          next_retry_at: string | null
          phone: string | null
          pnrs: Json
          ready_after: string | null
          retry_count: number | null
          salutation: string | null
          sent_at: string | null
          smtp_started_at: string | null
          status: string
          type: number | null
          updated_at: string | null
          worker_token: string | null
        }
        Insert: {
          airline?: string | null
          attachments?: Json
          banner?: string | null
          created_at?: string | null
          customer_name?: string | null
          email: string
          from_email?: string | null
          id?: string
          last_error?: string | null
          locked_until?: string | null
          missing_pnrs?: Json | null
          next_retry_at?: string | null
          phone?: string | null
          pnrs: Json
          ready_after?: string | null
          retry_count?: number | null
          salutation?: string | null
          sent_at?: string | null
          smtp_started_at?: string | null
          status?: string
          type?: number | null
          updated_at?: string | null
          worker_token?: string | null
        }
        Update: {
          airline?: string | null
          attachments?: Json
          banner?: string | null
          created_at?: string | null
          customer_name?: string | null
          email?: string
          from_email?: string | null
          id?: string
          last_error?: string | null
          locked_until?: string | null
          missing_pnrs?: Json | null
          next_retry_at?: string | null
          phone?: string | null
          pnrs?: Json
          ready_after?: string | null
          retry_count?: number | null
          salutation?: string | null
          sent_at?: string | null
          smtp_started_at?: string | null
          status?: string
          type?: number | null
          updated_at?: string | null
          worker_token?: string | null
        }
        Relationships: []
      }
      mail_queue_log: {
        Row: {
          airline: string | null
          archived_at: string
          attachments: Json | null
          banner: string | null
          created_at: string | null
          customer_name: string | null
          email: string
          final_reason: string | null
          from_email: string | null
          id: string
          last_error: string | null
          message_id: string | null
          missing_pnrs: Json | null
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
          airline?: string | null
          archived_at?: string
          attachments?: Json | null
          banner?: string | null
          created_at?: string | null
          customer_name?: string | null
          email: string
          final_reason?: string | null
          from_email?: string | null
          id: string
          last_error?: string | null
          message_id?: string | null
          missing_pnrs?: Json | null
          phone?: string | null
          pnrs: Json
          retry_count?: number | null
          salutation?: string | null
          sent_at?: string | null
          status: string
          type?: number | null
          updated_at?: string | null
        }
        Update: {
          airline?: string | null
          archived_at?: string
          attachments?: Json | null
          banner?: string | null
          created_at?: string | null
          customer_name?: string | null
          email?: string
          final_reason?: string | null
          from_email?: string | null
          id?: string
          last_error?: string | null
          message_id?: string | null
          missing_pnrs?: Json | null
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
      mail_send_webhook_config: {
        Row: {
          enabled: boolean
          endpoint: string
          singleton: boolean
          vault_secret_id: string
        }
        Insert: {
          enabled?: boolean
          endpoint: string
          singleton?: boolean
          vault_secret_id: string
        }
        Update: {
          enabled?: boolean
          endpoint?: string
          singleton?: boolean
          vault_secret_id?: string
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
          hang: string | null
          id: number
          last_sent_at: string | null
          mail_queue_id: string | null
          mail_type: string
          phone: string | null
          pnr: string
          salutation: string | null
          send_attempt_id: string | null
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
          hang?: string | null
          id?: number
          last_sent_at?: string | null
          mail_queue_id?: string | null
          mail_type?: string
          phone?: string | null
          pnr: string
          salutation?: string | null
          send_attempt_id?: string | null
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
          hang?: string | null
          id?: number
          last_sent_at?: string | null
          mail_queue_id?: string | null
          mail_type?: string
          phone?: string | null
          pnr?: string
          salutation?: string | null
          send_attempt_id?: string | null
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
          perm_check_premia: boolean
          perm_check_sunpq: boolean | null
          perm_check_vj: boolean | null
          perm_check_vna: boolean | null
          perm_check_vna_issued: boolean | null
          perm_get_pending_ticket: boolean | null
          perm_get_ticket_image: boolean | null
          perm_hold_ticket: boolean | null
          perm_reprice: boolean | null
          perm_reprice_sun: boolean
          perm_send_ticket: boolean | null
          phone: string | null
          price_markup: number | null
          price_ow_other: number | null
          price_ow_premia: number
          price_ow_sunpq: number | null
          price_ow_vj: number | null
          price_ow_vna: number | null
          price_rt_other: number | null
          price_rt_premia: number
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
          perm_check_premia?: boolean
          perm_check_sunpq?: boolean | null
          perm_check_vj?: boolean | null
          perm_check_vna?: boolean | null
          perm_check_vna_issued?: boolean | null
          perm_get_pending_ticket?: boolean | null
          perm_get_ticket_image?: boolean | null
          perm_hold_ticket?: boolean | null
          perm_reprice?: boolean | null
          perm_reprice_sun?: boolean
          perm_send_ticket?: boolean | null
          phone?: string | null
          price_markup?: number | null
          price_ow_other?: number | null
          price_ow_premia?: number
          price_ow_sunpq?: number | null
          price_ow_vj?: number | null
          price_ow_vna?: number | null
          price_rt_other?: number | null
          price_rt_premia?: number
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
          perm_check_premia?: boolean
          perm_check_sunpq?: boolean | null
          perm_check_vj?: boolean | null
          perm_check_vna?: boolean | null
          perm_check_vna_issued?: boolean | null
          perm_get_pending_ticket?: boolean | null
          perm_get_ticket_image?: boolean | null
          perm_hold_ticket?: boolean | null
          perm_reprice?: boolean | null
          perm_reprice_sun?: boolean
          perm_send_ticket?: boolean | null
          phone?: string | null
          price_markup?: number | null
          price_ow_other?: number | null
          price_ow_premia?: number
          price_ow_sunpq?: number | null
          price_ow_vj?: number | null
          price_ow_vna?: number | null
          price_rt_other?: number | null
          price_rt_premia?: number
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
      ticket_campaigns: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
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
          url_callback: string | null
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
          url_callback?: string | null
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
          url_callback?: string | null
        }
        Relationships: []
      }
      ticket_rules: {
        Row: {
          action: string
          airline: string | null
          arrival_time: string | null
          booking_class: string | null
          campaign_id: string
          created_at: string
          departure_time: string | null
          enabled: boolean
          id: string
          leg_scope: string | null
          match_scope: string | null
          priority: number
          require_other_leg_direct: boolean
          route: string | null
          segment_position: number | null
          updated_at: string
          value: string | null
        }
        Insert: {
          action: string
          airline?: string | null
          arrival_time?: string | null
          booking_class?: string | null
          campaign_id: string
          created_at?: string
          departure_time?: string | null
          enabled?: boolean
          id?: string
          leg_scope?: string | null
          match_scope?: string | null
          priority?: number
          require_other_leg_direct?: boolean
          route?: string | null
          segment_position?: number | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          action?: string
          airline?: string | null
          arrival_time?: string | null
          booking_class?: string | null
          campaign_id?: string
          created_at?: string
          departure_time?: string | null
          enabled?: boolean
          id?: string
          leg_scope?: string | null
          match_scope?: string | null
          priority?: number
          require_other_leg_direct?: boolean
          route?: string | null
          segment_position?: number | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ticket_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_rules_vps: {
        Row: {
          action: string
          airline: string | null
          arrival_time: string | null
          booking_class: string | null
          campaign_id: string | null
          created_at: string
          departure_time: string | null
          enabled: boolean
          end_date: string | null
          id: string
          leg_scope: string | null
          match_scope: string | null
          priority: number
          require_other_leg_direct: boolean
          route: string | null
          segment_position: number | null
          start_date: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          action: string
          airline?: string | null
          arrival_time?: string | null
          booking_class?: string | null
          campaign_id?: string | null
          created_at?: string
          departure_time?: string | null
          enabled?: boolean
          end_date?: string | null
          id?: string
          leg_scope?: string | null
          match_scope?: string | null
          priority?: number
          require_other_leg_direct?: boolean
          route?: string | null
          segment_position?: number | null
          start_date?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          action?: string
          airline?: string | null
          arrival_time?: string | null
          booking_class?: string | null
          campaign_id?: string | null
          created_at?: string
          departure_time?: string | null
          enabled?: boolean
          end_date?: string | null
          id?: string
          leg_scope?: string | null
          match_scope?: string | null
          priority?: number
          require_other_leg_direct?: boolean
          route?: string | null
          segment_position?: number | null
          start_date?: string | null
          updated_at?: string
          value?: string | null
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
      cancel_expired_holding_tickets: { Args: never; Returns: undefined }
      clear_sent_phone: { Args: never; Returns: number }
      customer_flights_list:
        | {
            Args: {
              p_customer_name?: string
              p_email?: string
              p_fly_from?: string
              p_fly_to?: string
              p_page?: number
              p_page_size?: number
              p_phone?: string
              p_pnr?: string
              p_sent_from?: string
              p_sent_to?: string
              p_sort?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_customer_name?: string
              p_email?: string
              p_fly_from?: string
              p_fly_to?: string
              p_hang?: string
              p_page?: number
              p_page_size?: number
              p_phone?: string
              p_pnr?: string
              p_sent_from?: string
              p_sent_to?: string
              p_sort?: string
            }
            Returns: Json
          }
      delete_old_reprice: { Args: never; Returns: undefined }
      get_not_ready_latest_kakanoti_apiapp: {
        Args: never
        Returns: {
          email: string | null
          hang: string | null
          id: string
          namelist: string
          number_person: number | null
          phone: string | null
          pnr: string
          price: number | null
          status: string | null
          timecreat: string
          timesend: string | null
          type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "kakanoti_apiapp"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_phone_email_to_pnr: {
        Args: { pnr_input: string }
        Returns: {
          email: string
          name: string
          phone: string
        }[]
      }
      get_ready_latest_kakanoti_apiapp: {
        Args: never
        Returns: {
          email: string | null
          hang: string | null
          id: string
          namelist: string
          number_person: number | null
          phone: string | null
          pnr: string
          price: number | null
          status: string | null
          timecreat: string
          timesend: string | null
          type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "kakanoti_apiapp"
          isOneToOne: false
          isSetofReturn: true
        }
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
      lookup_ticket_hang: { Args: { p_pnr: string }; Returns: string }
      mail_archive: {
        Args: {
          p_error?: string
          p_id: string
          p_message_id?: string
          p_reason?: string
          p_status: string
          p_token: string
        }
        Returns: boolean
      }
      mail_center_detail: { Args: { p_id: string }; Returns: Json }
      mail_center_list: {
        Args: {
          p_airline?: string
          p_date_from?: string
          p_date_to?: string
          p_from_email?: string
          p_has_error?: boolean
          p_has_missing?: boolean
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
          p_tab?: string
        }
        Returns: Json
      }
      mail_center_stats: { Args: never; Returns: Json }
      mail_claim: {
        Args: { p_lease_seconds?: number; p_limit?: number }
        Returns: {
          airline: string | null
          attachments: Json
          banner: string | null
          created_at: string | null
          customer_name: string | null
          email: string
          from_email: string | null
          id: string
          last_error: string | null
          locked_until: string | null
          missing_pnrs: Json | null
          next_retry_at: string | null
          phone: string | null
          pnrs: Json
          ready_after: string | null
          retry_count: number | null
          salutation: string | null
          sent_at: string | null
          smtp_started_at: string | null
          status: string
          type: number | null
          updated_at: string | null
          worker_token: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mail_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mail_enqueue_sync: { Args: { p_id: string }; Returns: undefined }
      mail_event_claim: {
        Args: { p_limit?: number }
        Returns: {
          claim_token: string
          generation: number
          pnr: string
        }[]
      }
      mail_event_fail: {
        Args: { p_error: string; p_pnr: string; p_token: string }
        Returns: boolean
      }
      mail_event_finish: {
        Args: { p_pnr: string; p_token: string }
        Returns: string
      }
      mail_event_recover: {
        Args: { p_timeout_seconds?: number }
        Returns: number
      }
      mail_event_sync: {
        Args: { p_pnr: string; p_token: string }
        Returns: boolean
      }
      mail_expire_leases: { Args: never; Returns: number }
      mail_mark_smtp_started: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      mail_retry: {
        Args: {
          p_error: string
          p_id: string
          p_max_retries?: number
          p_token: string
          p_uncertain?: boolean
        }
        Returns: boolean
      }
      mail_sync_events: {
        Args: { p_limit?: number; p_quiet_seconds?: number }
        Returns: number
      }
      mq_archive_sent: {
        Args: { p_queue_id: string; p_token: string }
        Returns: boolean
      }
      mq_claim_due_pnrs: {
        Args: { p_pnrs: string[] }
        Returns: {
          claim_token: string
          generation: number
          pnr: string
        }[]
      }
      mq_claim_send: {
        Args: { p_lease_seconds?: number; p_queue_id: string }
        Returns: {
          claim_token: string
          queue_id: string
        }[]
      }
      mq_create_queue: {
        Args: {
          p_attachments?: Json
          p_banner?: string
          p_customer_name?: string
          p_email: string
          p_from_email?: string
          p_phone?: string
          p_pnrs: Json
          p_salutation?: string
          p_type?: number
        }
        Returns: {
          created: boolean
          queue_airline: string
          queue_from_email: string
          queue_id: string
          queue_missing_pnrs: Json
          queue_pnrs: Json
          queue_status: string
        }[]
      }
      mq_extend_send_lease: {
        Args: { p_lease_seconds?: number; p_queue_id: string; p_token: string }
        Returns: boolean
      }
      mq_finish_send: {
        Args: { p_queue_id: string; p_token: string }
        Returns: number
      }
      mq_mark_smtp_started: {
        Args: { p_queue_id: string; p_token: string }
        Returns: boolean
      }
      mq_pending_events: {
        Args: never
        Returns: {
          due_at: string
          pnr: string
        }[]
      }
      mq_pnrs_key: { Args: { p_pnrs: Json }; Returns: string }
      mq_recover_send_queues: {
        Args: { p_limit?: number }
        Returns: {
          queue_id: string
          queue_status: string
        }[]
      }
      mq_sender_failure: {
        Args: {
          p_error: string
          p_queue_id: string
          p_smtp_started: boolean
          p_token: string
        }
        Returns: boolean
      }
      mq_sync_claimed_batch: { Args: { p_claims: Json }; Returns: number }
      run_add_email_ape_sun_worker: { Args: never; Returns: undefined }
      sync_kakanoti_phone_sent: { Args: never; Returns: undefined }
      update_kakanoti_row_sent: { Args: never; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
