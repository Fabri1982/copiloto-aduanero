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
      agencies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings_json: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings_json?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings_json?: Json | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_id: string
          actor_type: string
          agency_id: string
          case_id: string | null
          created_at: string | null
          event_name: string
          event_payload_json: Json | null
          id: string
        }
        Insert: {
          actor_id: string
          actor_type: string
          agency_id: string
          case_id?: string | null
          created_at?: string | null
          event_name: string
          event_payload_json?: Json | null
          id?: string
        }
        Update: {
          actor_id?: string
          actor_type?: string
          agency_id?: string
          case_id?: string | null
          created_at?: string | null
          event_name?: string
          event_payload_json?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "operation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          case_id: string
          created_at: string | null
          document_type: string
          file_name: string
          file_path: string
          id: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          document_type?: string
          file_name: string
          file_path: string
          id?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "operation_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_cases: {
        Row: {
          agency_id: string
          client_name: string
          created_at: string | null
          created_by: string | null
          id: string
          priority: string | null
          reference_code: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          client_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          reference_code?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          reference_code?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_cases_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_agency_id: { Args: Record<string, never>; Returns: string }
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
