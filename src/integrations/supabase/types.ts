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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string | null
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string | null
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          id: string
          is_online: boolean | null
          rating: number | null
          total_rides: number | null
          updated_at: string | null
          user_id: string
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          rating?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          rating?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          ride_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cardholder_name: string | null
          created_at: string | null
          first_ride_used: boolean | null
          full_name: string | null
          iban: string | null
          id: string
          loyalty_points: number | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cardholder_name?: string | null
          created_at?: string | null
          first_ride_used?: boolean | null
          full_name?: string | null
          iban?: string | null
          id?: string
          loyalty_points?: number | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cardholder_name?: string | null
          created_at?: string | null
          first_ride_used?: boolean | null
          full_name?: string | null
          iban?: string | null
          id?: string
          loyalty_points?: number | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          accepted_at: string | null
          cancellation_fee: number | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string
          distance_at_cancel_km: number | null
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string | null
          dropoff_lat: number
          dropoff_lng: number
          duration_minutes: number | null
          first_ride_discount: boolean | null
          id: string
          loyalty_points_earned: number | null
          pickup_address: string | null
          pickup_lat: number
          pickup_lng: number
          price: number | null
          promo_discount: number | null
          promo_type: string | null
          scheduled_time: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancellation_fee?: number | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          distance_at_cancel_km?: number | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat: number
          dropoff_lng: number
          duration_minutes?: number | null
          first_ride_discount?: boolean | null
          id?: string
          loyalty_points_earned?: number | null
          pickup_address?: string | null
          pickup_lat: number
          pickup_lng: number
          price?: number | null
          promo_discount?: number | null
          promo_type?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancellation_fee?: number | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          distance_at_cancel_km?: number | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number
          dropoff_lng?: number
          duration_minutes?: number | null
          first_ride_discount?: boolean | null
          id?: string
          loyalty_points_earned?: number | null
          pickup_address?: string | null
          pickup_lat?: number
          pickup_lng?: number
          price?: number | null
          promo_discount?: number | null
          promo_type?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      sepa_transactions: {
        Row: {
          amount: number
          cardholder_name: string | null
          created_at: string | null
          customer_id: string
          driver_id: string
          iban_last4: string | null
          id: string
          processed_at: string | null
          ride_id: string
          status: string | null
        }
        Insert: {
          amount: number
          cardholder_name?: string | null
          created_at?: string | null
          customer_id: string
          driver_id: string
          iban_last4?: string | null
          id?: string
          processed_at?: string | null
          ride_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          cardholder_name?: string | null
          created_at?: string | null
          customer_id?: string
          driver_id?: string
          iban_last4?: string | null
          id?: string
          processed_at?: string | null
          ride_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sepa_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      award_loyalty_points: {
        Args: { p_points: number; p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "driver" | "admin"
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
      app_role: ["customer", "driver", "admin"],
    },
  },
} as const
