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
      company_settings: {
        Row: {
          assinatura: string
          created_at: string
          id: string
          instagram: string
          logo_url: string
          meet_padrao: string
          nome_empresa: string
          site: string
          telefone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          assinatura?: string
          created_at?: string
          id?: string
          instagram?: string
          logo_url?: string
          meet_padrao?: string
          nome_empresa?: string
          site?: string
          telefone?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          assinatura?: string
          created_at?: string
          id?: string
          instagram?: string
          logo_url?: string
          meet_padrao?: string
          nome_empresa?: string
          site?: string
          telefone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          autor_nome: string
          created_at: string
          descricao: string
          id: string
          lead_id: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          autor_nome?: string
          created_at?: string
          descricao?: string
          id?: string
          lead_id: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          autor_nome?: string
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_files: {
        Row: {
          categoria: string
          created_at: string
          id: string
          lead_id: string
          mime: string
          nome: string
          path: string
          tamanho: number
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          lead_id: string
          mime?: string
          nome?: string
          path: string
          tamanho?: number
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          lead_id?: string
          mime?: string
          nome?: string
          path?: string
          tamanho?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_files_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
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
          area_atendimento: string
          canais_aquisicao: string[]
          cidade: string
          created_at: string
          dificuldade: string
          empresa: string
          faturamento_mensal: number
          faz_google_ads: boolean
          faz_meta_ads: boolean
          followup_stage: Database["public"]["Enums"]["followup_stage"] | null
          id: string
          instagram: string
          last_interaction_at: string
          link_perfil_google: string
          meet_link: string
          nome: string
          notas_rapidas: string
          notas_rapidas_updated_at: string | null
          objetivo: string
          observacoes: string
          origem: Database["public"]["Enums"]["lead_origin"]
          owner_id: string
          plano: string
          potencial: string
          proxima_acao: string
          responsavel_id: string | null
          reuniao_at: string | null
          segmento: string
          sem_interesse_at: string | null
          site: string
          stage: Database["public"]["Enums"]["lead_stage"]
          status_comercial: string
          telefone: string
          tem_perfil_google: boolean
          tem_site: boolean
          uf: string
          updated_at: string
          valor_contrato: number
          whatsapp: string
        }
        Insert: {
          area_atendimento?: string
          canais_aquisicao?: string[]
          cidade?: string
          created_at?: string
          dificuldade?: string
          empresa?: string
          faturamento_mensal?: number
          faz_google_ads?: boolean
          faz_meta_ads?: boolean
          followup_stage?: Database["public"]["Enums"]["followup_stage"] | null
          id?: string
          instagram?: string
          last_interaction_at?: string
          link_perfil_google?: string
          meet_link?: string
          nome: string
          notas_rapidas?: string
          notas_rapidas_updated_at?: string | null
          objetivo?: string
          observacoes?: string
          origem?: Database["public"]["Enums"]["lead_origin"]
          owner_id: string
          plano?: string
          potencial?: string
          proxima_acao?: string
          responsavel_id?: string | null
          reuniao_at?: string | null
          segmento?: string
          sem_interesse_at?: string | null
          site?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          status_comercial?: string
          telefone?: string
          tem_perfil_google?: boolean
          tem_site?: boolean
          uf?: string
          updated_at?: string
          valor_contrato?: number
          whatsapp?: string
        }
        Update: {
          area_atendimento?: string
          canais_aquisicao?: string[]
          cidade?: string
          created_at?: string
          dificuldade?: string
          empresa?: string
          faturamento_mensal?: number
          faz_google_ads?: boolean
          faz_meta_ads?: boolean
          followup_stage?: Database["public"]["Enums"]["followup_stage"] | null
          id?: string
          instagram?: string
          last_interaction_at?: string
          link_perfil_google?: string
          meet_link?: string
          nome?: string
          notas_rapidas?: string
          notas_rapidas_updated_at?: string | null
          objetivo?: string
          observacoes?: string
          origem?: Database["public"]["Enums"]["lead_origin"]
          owner_id?: string
          plano?: string
          potencial?: string
          proxima_acao?: string
          responsavel_id?: string | null
          reuniao_at?: string | null
          segmento?: string
          sem_interesse_at?: string | null
          site?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          status_comercial?: string
          telefone?: string
          tem_perfil_google?: boolean
          tem_site?: boolean
          uf?: string
          updated_at?: string
          valor_contrato?: number
          whatsapp?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          categoria: string
          conteudo: string
          created_at: string
          id: string
          nome: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          nome: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          nome?: string
          owner_id?: string
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
      proposal_templates: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          nome: string
          owner_id: string
          tipo: string
          updated_at: string
          url: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          id?: string
          nome: string
          owner_id: string
          tipo?: string
          updated_at?: string
          url?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          nome?: string
          owner_id?: string
          tipo?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          done: boolean
          done_at: string | null
          due_date: string | null
          due_time: string | null
          id: string
          lead_id: string | null
          owner_id: string
          prioridade: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          descricao?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          lead_id?: string | null
          owner_id: string
          prioridade?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string
          prioridade?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "gerente" | "vendedor" | "administrador"
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
      app_role: ["gerente", "vendedor", "administrador"],
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
