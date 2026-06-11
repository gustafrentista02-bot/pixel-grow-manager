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
      lead_movements: {
        Row: {
          created_at: string
          from_stage: string
          id: string
          lead_id: string
          to_stage: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_stage?: string
          id?: string
          lead_id: string
          to_stage?: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_stage?: string
          id?: string
          lead_id?: string
          to_stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_movements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          autor_nome: string
          conteudo: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          autor_nome?: string
          conteudo: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          autor_nome?: string
          conteudo?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cidade: string
          created_at: string
          empresa: string
          faturamento_mensal: number
          followup_stage: Database["public"]["Enums"]["followup_stage"] | null
          id: string
          last_interaction_at: string
          nome: string
          observacoes: string
          origem: Database["public"]["Enums"]["lead_origin"]
          owner_id: string
          segmento: string
          sem_interesse_at: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          telefone: string
          uf: string
          updated_at: string
        }
        Insert: {
          cidade?: string
          created_at?: string
          empresa?: string
          faturamento_mensal?: number
          followup_stage?: Database["public"]["Enums"]["followup_stage"] | null
          id?: string
          last_interaction_at?: string
          nome: string
          observacoes?: string
          origem?: Database["public"]["Enums"]["lead_origin"]
          owner_id: string
          segmento?: string
          sem_interesse_at?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          telefone?: string
          uf?: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          empresa?: string
          faturamento_mensal?: number
          followup_stage?: Database["public"]["Enums"]["followup_stage"] | null
          id?: string
          last_interaction_at?: string
          nome?: string
          observacoes?: string
          origem?: Database["public"]["Enums"]["lead_origin"]
          owner_id?: string
          segmento?: string
          sem_interesse_at?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          telefone?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
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
      get_team_metrics: {
        Args: never
        Returns: {
          faturamento_ganho: number
          ganhos: number
          nome: string
          perdidos: number
          propostas: number
          reunioes: number
          total_leads: number
          user_id: string
        }[]
      }
      handle_signup: { Args: { _nome: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gerente" | "vendedor"
      followup_stage: "followup_1" | "followup_2" | "followup_3" | "followup_4"
      lead_origin:
        | "google"
        | "instagram"
        | "facebook"
        | "whatsapp"
        | "site"
        | "indicacao"
        | "trafego_pago"
        | "outro"
      lead_stage:
        | "lead_novo"
        | "conversando"
        | "reuniao"
        | "proposta"
        | "ganho"
        | "perdido"
        | "follow_up"
        | "sem_interesse"
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
      app_role: ["gerente", "vendedor"],
      followup_stage: ["followup_1", "followup_2", "followup_3", "followup_4"],
      lead_origin: [
        "google",
        "instagram",
        "facebook",
        "whatsapp",
        "site",
        "indicacao",
        "trafego_pago",
        "outro",
      ],
      lead_stage: [
        "lead_novo",
        "conversando",
        "reuniao",
        "proposta",
        "ganho",
        "perdido",
        "follow_up",
        "sem_interesse",
      ],
    },
  },
} as const
