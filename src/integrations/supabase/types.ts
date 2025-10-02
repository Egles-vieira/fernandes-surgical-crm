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
      clientes: {
        Row: {
          atividade: string | null
          cgc: string | null
          cod_cond_pag: number | null
          cod_emitente: number | null
          cod_gr_cli: number | null
          cod_rep: number | null
          cod_suframa: string | null
          coligada: string | null
          cond_pag_fixa: Database["public"]["Enums"]["yes_no"] | null
          created_at: string
          e_mail: string | null
          email_financeiro: string | null
          email_xml: string | null
          equipevendas: string | null
          id: string
          identific: Database["public"]["Enums"]["identificacao_tipo"]
          ind_cre_cli: string | null
          ins_estadual: string | null
          lim_credito: number | null
          limite_disponivel: number | null
          nat_operacao: string | null
          natureza: Database["public"]["Enums"]["natureza_tipo"]
          nome_abrev: string | null
          nome_emit: string | null
          observacoes: string | null
          telefone1: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atividade?: string | null
          cgc?: string | null
          cod_cond_pag?: number | null
          cod_emitente?: number | null
          cod_gr_cli?: number | null
          cod_rep?: number | null
          cod_suframa?: string | null
          coligada?: string | null
          cond_pag_fixa?: Database["public"]["Enums"]["yes_no"] | null
          created_at?: string
          e_mail?: string | null
          email_financeiro?: string | null
          email_xml?: string | null
          equipevendas?: string | null
          id?: string
          identific?: Database["public"]["Enums"]["identificacao_tipo"]
          ind_cre_cli?: string | null
          ins_estadual?: string | null
          lim_credito?: number | null
          limite_disponivel?: number | null
          nat_operacao?: string | null
          natureza?: Database["public"]["Enums"]["natureza_tipo"]
          nome_abrev?: string | null
          nome_emit?: string | null
          observacoes?: string | null
          telefone1?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atividade?: string | null
          cgc?: string | null
          cod_cond_pag?: number | null
          cod_emitente?: number | null
          cod_gr_cli?: number | null
          cod_rep?: number | null
          cod_suframa?: string | null
          coligada?: string | null
          cond_pag_fixa?: Database["public"]["Enums"]["yes_no"] | null
          created_at?: string
          e_mail?: string | null
          email_financeiro?: string | null
          email_xml?: string | null
          equipevendas?: string | null
          id?: string
          identific?: Database["public"]["Enums"]["identificacao_tipo"]
          ind_cre_cli?: string | null
          ins_estadual?: string | null
          lim_credito?: number | null
          limite_disponivel?: number | null
          nat_operacao?: string | null
          natureza?: Database["public"]["Enums"]["natureza_tipo"]
          nome_abrev?: string | null
          nome_emit?: string | null
          observacoes?: string | null
          telefone1?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      condicoes_pagamento: {
        Row: {
          codigo_integracao: number
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          codigo_integracao: number
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          codigo_integracao?: number
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      enderecos_clientes: {
        Row: {
          bairro: string | null
          cep: string
          cidade: string
          cliente_id: string
          cod_entrega: string | null
          created_at: string
          endereco: string
          estado: string
          hora_entrega: string | null
          ibge: string | null
          id: string
          ins_estadual: string | null
          is_principal: boolean | null
          pais: string | null
          tipo: Database["public"]["Enums"]["tipo_endereco"]
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep: string
          cidade: string
          cliente_id: string
          cod_entrega?: string | null
          created_at?: string
          endereco: string
          estado: string
          hora_entrega?: string | null
          ibge?: string | null
          id?: string
          ins_estadual?: string | null
          is_principal?: boolean | null
          pais?: string | null
          tipo?: Database["public"]["Enums"]["tipo_endereco"]
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string
          cidade?: string
          cliente_id?: string
          cod_entrega?: string | null
          created_at?: string
          endereco?: string
          estado?: string
          hora_entrega?: string | null
          ibge?: string | null
          id?: string
          ins_estadual?: string | null
          is_principal?: boolean | null
          pais?: string | null
          tipo?: Database["public"]["Enums"]["tipo_endereco"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          created_at: string
          data_movimentacao: string
          documento: string | null
          id: string
          lote: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_atual: number
          responsavel: string | null
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string
          data_movimentacao?: string
          documento?: string | null
          id?: string
          lote?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_atual: number
          responsavel?: string | null
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string
          data_movimentacao?: string
          documento?: string | null
          id?: string
          lote?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          quantidade_anterior?: number
          quantidade_atual?: number
          responsavel?: string | null
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          aliquota_ipi: number
          cod_trib_icms: string
          created_at: string
          custo: number
          dtr: number
          grupo_estoque: number
          icms_sp_percent: number
          id: string
          lote_multiplo: number
          marcadores_produto: string[] | null
          narrativa: string | null
          ncm: string
          nome: string
          preco_venda: number
          previsao_chegada: string | null
          qtd_cr: number
          quantidade_em_maos: number
          quantidade_prevista: number
          referencia_interna: string
          responsavel: string | null
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          aliquota_ipi?: number
          cod_trib_icms?: string
          created_at?: string
          custo?: number
          dtr?: number
          grupo_estoque?: number
          icms_sp_percent?: number
          id?: string
          lote_multiplo?: number
          marcadores_produto?: string[] | null
          narrativa?: string | null
          ncm: string
          nome: string
          preco_venda?: number
          previsao_chegada?: string | null
          qtd_cr?: number
          quantidade_em_maos?: number
          quantidade_prevista?: number
          referencia_interna: string
          responsavel?: string | null
          unidade_medida: string
          updated_at?: string
        }
        Update: {
          aliquota_ipi?: number
          cod_trib_icms?: string
          created_at?: string
          custo?: number
          dtr?: number
          grupo_estoque?: number
          icms_sp_percent?: number
          id?: string
          lote_multiplo?: number
          marcadores_produto?: string[] | null
          narrativa?: string | null
          ncm?: string
          nome?: string
          preco_venda?: number
          previsao_chegada?: string | null
          qtd_cr?: number
          quantidade_em_maos?: number
          quantidade_prevista?: number
          referencia_interna?: string
          responsavel?: string | null
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_frete: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tipos_pedido: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_cnpj: string | null
          cliente_nome: string
          condicao_pagamento_id: string | null
          created_at: string
          data_venda: string
          desconto: number
          id: string
          numero_venda: string
          observacoes: string | null
          status: string
          tipo_frete_id: string | null
          tipo_pedido_id: string | null
          updated_at: string
          user_id: string
          valor_final: number
          valor_total: number
        }
        Insert: {
          cliente_cnpj?: string | null
          cliente_nome: string
          condicao_pagamento_id?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number
          id?: string
          numero_venda: string
          observacoes?: string | null
          status?: string
          tipo_frete_id?: string | null
          tipo_pedido_id?: string | null
          updated_at?: string
          user_id: string
          valor_final?: number
          valor_total?: number
        }
        Update: {
          cliente_cnpj?: string | null
          cliente_nome?: string
          condicao_pagamento_id?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number
          id?: string
          numero_venda?: string
          observacoes?: string | null
          status?: string
          tipo_frete_id?: string | null
          tipo_pedido_id?: string | null
          updated_at?: string
          user_id?: string
          valor_final?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "condicoes_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_tipo_frete_id_fkey"
            columns: ["tipo_frete_id"]
            isOneToOne: false
            referencedRelation: "tipos_frete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_tipo_pedido_id_fkey"
            columns: ["tipo_pedido_id"]
            isOneToOne: false
            referencedRelation: "tipos_pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_itens: {
        Row: {
          created_at: string
          desconto: number
          id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          valor_total: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          desconto?: number
          id?: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          valor_total: number
          venda_id: string
        }
        Update: {
          created_at?: string
          desconto?: number
          id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          valor_total?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      identificacao_tipo: "Cliente" | "Fornecedor" | "Ambos"
      natureza_tipo: "Juridica" | "Fisica"
      tipo_endereco: "principal" | "entrega" | "cobranca"
      yes_no: "YES" | "NO"
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
      identificacao_tipo: ["Cliente", "Fornecedor", "Ambos"],
      natureza_tipo: ["Juridica", "Fisica"],
      tipo_endereco: ["principal", "entrega", "cobranca"],
      yes_no: ["YES", "NO"],
    },
  },
} as const
