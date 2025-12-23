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
      alertas_metas: {
        Row: {
          criado_em: string | null
          expira_em: string | null
          id: string
          lido: boolean | null
          lido_em: string | null
          lido_por: string | null
          mensagem: string
          meta_id: string
          severidade: string
          tipo_alerta: string
        }
        Insert: {
          criado_em?: string | null
          expira_em?: string | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          lido_por?: string | null
          mensagem: string
          meta_id: string
          severidade: string
          tipo_alerta: string
        }
        Update: {
          criado_em?: string | null
          expira_em?: string | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          lido_por?: string | null
          mensagem?: string
          meta_id?: string
          severidade?: string
          tipo_alerta?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_metas_lido_por_fkey"
            columns: ["lido_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "alertas_metas_lido_por_fkey"
            columns: ["lido_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_metas_lido_por_fkey"
            columns: ["lido_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "alertas_metas_lido_por_fkey"
            columns: ["lido_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alertas_metas_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_metas_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "vw_metas_com_progresso"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          atividade_pai_id: string | null
          atualizado_em: string | null
          campos_customizados: Json | null
          chamada_id: string | null
          cliente_id: string | null
          codigo_disposicao_id: string | null
          concluida_no_prazo: boolean | null
          contato_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_conclusao: string | null
          data_inicio: string | null
          data_vencimento: string | null
          descricao: string | null
          duracao_estimada_minutos: number | null
          duracao_real_minutos: number | null
          eh_recorrente: boolean | null
          email_message_id: string | null
          equipe_id: string | null
          excluido_em: string | null
          id: string
          lembrete_em: string | null
          lembrete_enviado: boolean | null
          nba_aceita: boolean | null
          nba_confianca: number | null
          nba_motivo_rejeicao: string | null
          nba_sugestao_descricao: string | null
          nba_sugestao_tipo: string | null
          numero_atividade: string | null
          oportunidade_id: string | null
          prioridade: Database["public"]["Enums"]["prioridade_atividade"]
          proxima_atividade_id: string | null
          proximo_passo: string | null
          proximo_passo_obrigatorio: boolean | null
          regra_recorrencia: Json | null
          responsavel_id: string | null
          resultado_descricao: string | null
          reuniao_externa_id: string | null
          score_calculado_em: string | null
          score_decaimento_temporal: number | null
          score_engajamento: number | null
          score_lead_fit: number | null
          score_prioridade: number | null
          score_urgencia: number | null
          score_valor_potencial: number | null
          sentimento_analise_em: string | null
          sentimento_score: number | null
          sentimento_tipo: Database["public"]["Enums"]["sentimento_tipo"] | null
          status: Database["public"]["Enums"]["status_atividade"]
          tags: string[] | null
          ticket_id: string | null
          tipo: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          venda_id: string | null
          what_id: string | null
          what_tipo: Database["public"]["Enums"]["what_tipo"] | null
          whatsapp_mensagem_id: string | null
          who_id: string | null
          who_tipo: Database["public"]["Enums"]["who_tipo"] | null
        }
        Insert: {
          atividade_pai_id?: string | null
          atualizado_em?: string | null
          campos_customizados?: Json | null
          chamada_id?: string | null
          cliente_id?: string | null
          codigo_disposicao_id?: string | null
          concluida_no_prazo?: boolean | null
          contato_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          duracao_real_minutos?: number | null
          eh_recorrente?: boolean | null
          email_message_id?: string | null
          equipe_id?: string | null
          excluido_em?: string | null
          id?: string
          lembrete_em?: string | null
          lembrete_enviado?: boolean | null
          nba_aceita?: boolean | null
          nba_confianca?: number | null
          nba_motivo_rejeicao?: string | null
          nba_sugestao_descricao?: string | null
          nba_sugestao_tipo?: string | null
          numero_atividade?: string | null
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_atividade"]
          proxima_atividade_id?: string | null
          proximo_passo?: string | null
          proximo_passo_obrigatorio?: boolean | null
          regra_recorrencia?: Json | null
          responsavel_id?: string | null
          resultado_descricao?: string | null
          reuniao_externa_id?: string | null
          score_calculado_em?: string | null
          score_decaimento_temporal?: number | null
          score_engajamento?: number | null
          score_lead_fit?: number | null
          score_prioridade?: number | null
          score_urgencia?: number | null
          score_valor_potencial?: number | null
          sentimento_analise_em?: string | null
          sentimento_score?: number | null
          sentimento_tipo?:
            | Database["public"]["Enums"]["sentimento_tipo"]
            | null
          status?: Database["public"]["Enums"]["status_atividade"]
          tags?: string[] | null
          ticket_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          venda_id?: string | null
          what_id?: string | null
          what_tipo?: Database["public"]["Enums"]["what_tipo"] | null
          whatsapp_mensagem_id?: string | null
          who_id?: string | null
          who_tipo?: Database["public"]["Enums"]["who_tipo"] | null
        }
        Update: {
          atividade_pai_id?: string | null
          atualizado_em?: string | null
          campos_customizados?: Json | null
          chamada_id?: string | null
          cliente_id?: string | null
          codigo_disposicao_id?: string | null
          concluida_no_prazo?: boolean | null
          contato_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          duracao_estimada_minutos?: number | null
          duracao_real_minutos?: number | null
          eh_recorrente?: boolean | null
          email_message_id?: string | null
          equipe_id?: string | null
          excluido_em?: string | null
          id?: string
          lembrete_em?: string | null
          lembrete_enviado?: boolean | null
          nba_aceita?: boolean | null
          nba_confianca?: number | null
          nba_motivo_rejeicao?: string | null
          nba_sugestao_descricao?: string | null
          nba_sugestao_tipo?: string | null
          numero_atividade?: string | null
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_atividade"]
          proxima_atividade_id?: string | null
          proximo_passo?: string | null
          proximo_passo_obrigatorio?: boolean | null
          regra_recorrencia?: Json | null
          responsavel_id?: string | null
          resultado_descricao?: string | null
          reuniao_externa_id?: string | null
          score_calculado_em?: string | null
          score_decaimento_temporal?: number | null
          score_engajamento?: number | null
          score_lead_fit?: number | null
          score_prioridade?: number | null
          score_urgencia?: number | null
          score_valor_potencial?: number | null
          sentimento_analise_em?: string | null
          sentimento_score?: number | null
          sentimento_tipo?:
            | Database["public"]["Enums"]["sentimento_tipo"]
            | null
          status?: Database["public"]["Enums"]["status_atividade"]
          tags?: string[] | null
          ticket_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_atividade"]
          titulo?: string
          venda_id?: string | null
          what_id?: string | null
          what_tipo?: Database["public"]["Enums"]["what_tipo"] | null
          whatsapp_mensagem_id?: string | null
          who_id?: string | null
          who_tipo?: Database["public"]["Enums"]["who_tipo"] | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_atividade_pai_id_fkey"
            columns: ["atividade_pai_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_atividade_pai_id_fkey"
            columns: ["atividade_pai_id"]
            isOneToOne: false
            referencedRelation: "mv_atividades_prioridade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "atividades_codigo_disposicao_id_fkey"
            columns: ["codigo_disposicao_id"]
            isOneToOne: false
            referencedRelation: "codigos_disposicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "atividades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "atividades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_proxima_atividade_id_fkey"
            columns: ["proxima_atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_proxima_atividade_id_fkey"
            columns: ["proxima_atividade_id"]
            isOneToOne: false
            referencedRelation: "mv_atividades_prioridade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "atividades_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_comentarios: {
        Row: {
          anexos: Json | null
          atividade_id: string
          autor_id: string
          conteudo: string
          criado_em: string | null
          editado: boolean | null
          editado_em: string | null
          excluido_em: string | null
          id: string
          mencoes: string[] | null
        }
        Insert: {
          anexos?: Json | null
          atividade_id: string
          autor_id: string
          conteudo: string
          criado_em?: string | null
          editado?: boolean | null
          editado_em?: string | null
          excluido_em?: string | null
          id?: string
          mencoes?: string[] | null
        }
        Update: {
          anexos?: Json | null
          atividade_id?: string
          autor_id?: string
          conteudo?: string
          criado_em?: string | null
          editado?: boolean | null
          editado_em?: string | null
          excluido_em?: string | null
          id?: string
          mencoes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_comentarios_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_comentarios_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "mv_atividades_prioridade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      atividades_historico: {
        Row: {
          alterado_em: string | null
          alterado_por: string | null
          atividade_id: string
          campo_alterado: string
          id: string
          ip_address: unknown
          user_agent: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_em?: string | null
          alterado_por?: string | null
          atividade_id: string
          campo_alterado: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_em?: string | null
          alterado_por?: string | null
          atividade_id?: string
          campo_alterado?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "atividades_historico_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_historico_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "mv_atividades_prioridade"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_participantes: {
        Row: {
          atividade_id: string
          confirmado: boolean | null
          confirmado_em: string | null
          criado_em: string | null
          id: string
          papel: string | null
          usuario_id: string
        }
        Insert: {
          atividade_id: string
          confirmado?: boolean | null
          confirmado_em?: string | null
          criado_em?: string | null
          id?: string
          papel?: string | null
          usuario_id: string
        }
        Update: {
          atividade_id?: string
          confirmado?: boolean | null
          confirmado_em?: string | null
          criado_em?: string | null
          id?: string
          papel?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_participantes_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_participantes_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "mv_atividades_prioridade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_assistente_mensagens: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_assistente_mensagens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_api_logs: {
        Row: {
          cliente_id: string | null
          cnpj: string
          created_at: string | null
          custo_creditos: number | null
          dados_resposta: Json | null
          decisao_tomada: boolean | null
          erro: string | null
          id: string
          motivo_decisao: string | null
          sucesso: boolean | null
          tempo_resposta_ms: number | null
          tipo_consulta: string
        }
        Insert: {
          cliente_id?: string | null
          cnpj: string
          created_at?: string | null
          custo_creditos?: number | null
          dados_resposta?: Json | null
          decisao_tomada?: boolean | null
          erro?: string | null
          id?: string
          motivo_decisao?: string | null
          sucesso?: boolean | null
          tempo_resposta_ms?: number | null
          tipo_consulta: string
        }
        Update: {
          cliente_id?: string | null
          cnpj?: string
          created_at?: string | null
          custo_creditos?: number | null
          dados_resposta?: Json | null
          decisao_tomada?: boolean | null
          erro?: string | null
          id?: string
          motivo_decisao?: string | null
          sucesso?: boolean | null
          tempo_resposta_ms?: number | null
          tipo_consulta?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_api_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_api_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cliente_documentos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          cliente_id: string | null
          created_at: string | null
          id: string
          tamanho_bytes: number | null
          tipo: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          tamanho_bytes?: number | null
          tipo: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          tamanho_bytes?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cliente_enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: string | null
          codigo_ibge: string | null
          complemento: string | null
          created_at: string | null
          estado: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          numero: string | null
          pais: string | null
          tipo: string
          updated_at: string | null
          validado: boolean | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          numero?: string | null
          pais?: string | null
          tipo: string
          updated_at?: string | null
          validado?: boolean | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          numero?: string | null
          pais?: string | null
          tipo?: string
          updated_at?: string | null
          validado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_enderecos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_enderecos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cliente_filiais: {
        Row: {
          cliente_matriz_id: string | null
          cnpj: string
          created_at: string | null
          emails: Json | null
          endereco: Json | null
          id: string
          nome_fantasia: string | null
          razao_social: string | null
          situacao: string | null
          telefones: Json | null
        }
        Insert: {
          cliente_matriz_id?: string | null
          cnpj: string
          created_at?: string | null
          emails?: Json | null
          endereco?: Json | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string | null
          situacao?: string | null
          telefones?: Json | null
        }
        Update: {
          cliente_matriz_id?: string | null
          cnpj?: string
          created_at?: string | null
          emails?: Json | null
          endereco?: Json | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string | null
          situacao?: string | null
          telefones?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_filiais_cliente_matriz_id_fkey"
            columns: ["cliente_matriz_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_filiais_cliente_matriz_id_fkey"
            columns: ["cliente_matriz_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cliente_inscricoes_estaduais: {
        Row: {
          ativo: boolean | null
          cliente_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          inscricao_estadual: string | null
          situacao: string | null
          uf: string
        }
        Insert: {
          ativo?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          inscricao_estadual?: string | null
          situacao?: string | null
          uf: string
        }
        Update: {
          ativo?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          inscricao_estadual?: string | null
          situacao?: string | null
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_inscricoes_estaduais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_inscricoes_estaduais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cliente_socios: {
        Row: {
          cliente_id: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_entrada: string | null
          id: string
          nome: string
          percentual_participacao: number | null
          qualificacao: string | null
        }
        Insert: {
          cliente_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_entrada?: string | null
          id?: string
          nome: string
          percentual_participacao?: number | null
          qualificacao?: string | null
        }
        Update: {
          cliente_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_entrada?: string | null
          id?: string
          nome?: string
          percentual_participacao?: number | null
          qualificacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_socios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_socios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      clientes: {
        Row: {
          atividade: string | null
          capital_social: number | null
          cgc: string | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cod_cond_pag: number | null
          cod_emitente: number | null
          cod_gr_cli: number | null
          cod_rep: number | null
          cod_suframa: string | null
          coligada: string | null
          cond_pag_fixa: Database["public"]["Enums"]["yes_no"] | null
          conta_id: string | null
          created_at: string
          dados_cnpja: Json | null
          data_abertura: string | null
          data_opcao_simples: string | null
          e_mail: string | null
          eh_matriz: boolean | null
          email_financeiro: string | null
          email_xml: string | null
          equipe_id: string | null
          equipevendas: string | null
          id: string
          identific: Database["public"]["Enums"]["identificacao_tipo"]
          ind_cre_cli: string | null
          ins_estadual: string | null
          inscricao_suframa: string | null
          lim_credito: number | null
          limite_disponivel: number | null
          metadados_consulta: Json | null
          nat_operacao: string | null
          natureza: Database["public"]["Enums"]["natureza_tipo"]
          natureza_juridica: string | null
          nome_abrev: string | null
          nome_emit: string | null
          nome_fantasia: string | null
          observacoes: string | null
          optante_mei: boolean | null
          optante_simples: boolean | null
          porte: string | null
          regime_tributario: string | null
          situacao_cadastral: string | null
          situacao_suframa: string | null
          telefone1: string | null
          ultima_consulta_cnpja: string | null
          updated_at: string
          user_id: string
          vendedor_id: string | null
        }
        Insert: {
          atividade?: string | null
          capital_social?: number | null
          cgc?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cod_cond_pag?: number | null
          cod_emitente?: number | null
          cod_gr_cli?: number | null
          cod_rep?: number | null
          cod_suframa?: string | null
          coligada?: string | null
          cond_pag_fixa?: Database["public"]["Enums"]["yes_no"] | null
          conta_id?: string | null
          created_at?: string
          dados_cnpja?: Json | null
          data_abertura?: string | null
          data_opcao_simples?: string | null
          e_mail?: string | null
          eh_matriz?: boolean | null
          email_financeiro?: string | null
          email_xml?: string | null
          equipe_id?: string | null
          equipevendas?: string | null
          id?: string
          identific?: Database["public"]["Enums"]["identificacao_tipo"]
          ind_cre_cli?: string | null
          ins_estadual?: string | null
          inscricao_suframa?: string | null
          lim_credito?: number | null
          limite_disponivel?: number | null
          metadados_consulta?: Json | null
          nat_operacao?: string | null
          natureza?: Database["public"]["Enums"]["natureza_tipo"]
          natureza_juridica?: string | null
          nome_abrev?: string | null
          nome_emit?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          optante_mei?: boolean | null
          optante_simples?: boolean | null
          porte?: string | null
          regime_tributario?: string | null
          situacao_cadastral?: string | null
          situacao_suframa?: string | null
          telefone1?: string | null
          ultima_consulta_cnpja?: string | null
          updated_at?: string
          user_id: string
          vendedor_id?: string | null
        }
        Update: {
          atividade?: string | null
          capital_social?: number | null
          cgc?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cod_cond_pag?: number | null
          cod_emitente?: number | null
          cod_gr_cli?: number | null
          cod_rep?: number | null
          cod_suframa?: string | null
          coligada?: string | null
          cond_pag_fixa?: Database["public"]["Enums"]["yes_no"] | null
          conta_id?: string | null
          created_at?: string
          dados_cnpja?: Json | null
          data_abertura?: string | null
          data_opcao_simples?: string | null
          e_mail?: string | null
          eh_matriz?: boolean | null
          email_financeiro?: string | null
          email_xml?: string | null
          equipe_id?: string | null
          equipevendas?: string | null
          id?: string
          identific?: Database["public"]["Enums"]["identificacao_tipo"]
          ind_cre_cli?: string | null
          ins_estadual?: string | null
          inscricao_suframa?: string | null
          lim_credito?: number | null
          limite_disponivel?: number | null
          metadados_consulta?: Json | null
          nat_operacao?: string | null
          natureza?: Database["public"]["Enums"]["natureza_tipo"]
          natureza_juridica?: string | null
          nome_abrev?: string | null
          nome_emit?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          optante_mei?: boolean | null
          optante_simples?: boolean | null
          porte?: string | null
          regime_tributario?: string | null
          situacao_cadastral?: string | null
          situacao_suframa?: string | null
          telefone1?: string | null
          ultima_consulta_cnpja?: string | null
          updated_at?: string
          user_id?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "clientes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "clientes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      cnpja_configuracoes: {
        Row: {
          configs_extras: Json | null
          created_at: string | null
          emite_nf: boolean | null
          gerar_comprovantes_automaticamente: boolean | null
          id: string
          limite_consultas_simultaneas: number | null
          operacoes_interestaduais: boolean | null
          sempre_validar_cep: boolean | null
          tempo_cache_company_dias: number | null
          tempo_cache_office_dias: number | null
          tempo_cache_simples_dias: number | null
          tempo_cache_sintegra_dias: number | null
          tempo_cache_suframa_dias: number | null
          trabalha_com_icms: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          configs_extras?: Json | null
          created_at?: string | null
          emite_nf?: boolean | null
          gerar_comprovantes_automaticamente?: boolean | null
          id?: string
          limite_consultas_simultaneas?: number | null
          operacoes_interestaduais?: boolean | null
          sempre_validar_cep?: boolean | null
          tempo_cache_company_dias?: number | null
          tempo_cache_office_dias?: number | null
          tempo_cache_simples_dias?: number | null
          tempo_cache_sintegra_dias?: number | null
          tempo_cache_suframa_dias?: number | null
          trabalha_com_icms?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          configs_extras?: Json | null
          created_at?: string | null
          emite_nf?: boolean | null
          gerar_comprovantes_automaticamente?: boolean | null
          id?: string
          limite_consultas_simultaneas?: number | null
          operacoes_interestaduais?: boolean | null
          sempre_validar_cep?: boolean | null
          tempo_cache_company_dias?: number | null
          tempo_cache_office_dias?: number | null
          tempo_cache_simples_dias?: number | null
          tempo_cache_sintegra_dias?: number | null
          tempo_cache_suframa_dias?: number | null
          trabalha_com_icms?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      codigos_disposicao: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          codigo: string
          cor: string | null
          criado_em: string | null
          descricao: string | null
          dias_follow_up_padrao: number | null
          icone: string | null
          id: string
          marca_como_concluido: boolean | null
          nome: string
          ordem: number | null
          requer_agendamento: boolean | null
          requer_proximo_passo: boolean | null
          sugestao_nba_padrao: string | null
          tipo_atividade: Database["public"]["Enums"]["tipo_atividade"] | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo: string
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          dias_follow_up_padrao?: number | null
          icone?: string | null
          id?: string
          marca_como_concluido?: boolean | null
          nome: string
          ordem?: number | null
          requer_agendamento?: boolean | null
          requer_proximo_passo?: boolean | null
          sugestao_nba_padrao?: string | null
          tipo_atividade?: Database["public"]["Enums"]["tipo_atividade"] | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo?: string
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          dias_follow_up_padrao?: number | null
          icone?: string | null
          id?: string
          marca_como_concluido?: boolean | null
          nome?: string
          ordem?: number | null
          requer_agendamento?: boolean | null
          requer_proximo_passo?: boolean | null
          sugestao_nba_padrao?: string | null
          tipo_atividade?: Database["public"]["Enums"]["tipo_atividade"] | null
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
      configuracoes_sistema: {
        Row: {
          atualizado_em: string | null
          chave: string
          criado_em: string | null
          id: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string | null
          chave: string
          criado_em?: string | null
          id?: string
          valor: Json
        }
        Update: {
          atualizado_em?: string | null
          chave?: string
          criado_em?: string | null
          id?: string
          valor?: Json
        }
        Relationships: []
      }
      contas: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          classificacao: string | null
          cnpj: string | null
          conta_pai_id: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          endereco_cobranca_id: string | null
          endereco_entrega_id: string | null
          esta_ativa: boolean | null
          estagio_ciclo_vida: string | null
          excluido_em: string | null
          id: string
          nome_conta: string
          numero_funcionarios: number | null
          origem_lead: string | null
          proprietario_id: string | null
          receita_anual: number | null
          setor: string | null
          site: string | null
          tipo_conta: string | null
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          classificacao?: string | null
          cnpj?: string | null
          conta_pai_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          endereco_cobranca_id?: string | null
          endereco_entrega_id?: string | null
          esta_ativa?: boolean | null
          estagio_ciclo_vida?: string | null
          excluido_em?: string | null
          id?: string
          nome_conta: string
          numero_funcionarios?: number | null
          origem_lead?: string | null
          proprietario_id?: string | null
          receita_anual?: number | null
          setor?: string | null
          site?: string | null
          tipo_conta?: string | null
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          classificacao?: string | null
          cnpj?: string | null
          conta_pai_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          endereco_cobranca_id?: string | null
          endereco_entrega_id?: string | null
          esta_ativa?: boolean | null
          estagio_ciclo_vida?: string | null
          excluido_em?: string | null
          id?: string
          nome_conta?: string
          numero_funcionarios?: number | null
          origem_lead?: string | null
          proprietario_id?: string | null
          receita_anual?: number | null
          setor?: string | null
          site?: string | null
          tipo_conta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "contas_endereco_cobranca_id_fkey"
            columns: ["endereco_cobranca_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_endereco_entrega_id_fkey"
            columns: ["endereco_entrega_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          aceita_marketing: boolean | null
          atualizado_em: string | null
          atualizado_por: string | null
          budget_estimado: number | null
          campanha_origem: string | null
          cancelou_inscricao_email: boolean | null
          cargo: string | null
          celular: string | null
          cliente_id: string | null
          consentimento_lgpd: boolean | null
          conta_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_consentimento_lgpd: string | null
          data_nascimento: string | null
          data_ultima_atividade: string | null
          departamento: string | null
          descricao: string | null
          dores_identificadas: string | null
          email: string | null
          email_secundario: string | null
          endereco_correspondencia_id: string | null
          esta_ativo: boolean | null
          estagio_ciclo_vida: string | null
          excluido_em: string | null
          facebook_url: string | null
          frequencia_contato_preferida: string | null
          id: string
          idioma_preferido: string | null
          instagram_url: string | null
          interesses: string[] | null
          linkedin_url: string | null
          melhor_horario_contato: string | null
          nao_enviar_email: boolean | null
          nao_ligar: boolean | null
          necessidade_identificada: string | null
          nivel_autoridade: string | null
          nome_completo: string | null
          objetivos_profissionais: string | null
          origem_lead: string | null
          pontuacao_lead: number | null
          preferencia_contato: string | null
          primeiro_nome: string
          proprietario_id: string | null
          proximo_followup: string | null
          relacionamento_com: string | null
          reporta_para_id: string | null
          score_qualificacao: number | null
          skype_id: string | null
          sobrenome: string
          status_lead: string | null
          tags: string[] | null
          telefone: string | null
          timeline_decisao: string | null
          timezone: string | null
          tratamento: string | null
          twitter_url: string | null
          ultimo_contato: string | null
          whatsapp_numero: string | null
        }
        Insert: {
          aceita_marketing?: boolean | null
          atualizado_em?: string | null
          atualizado_por?: string | null
          budget_estimado?: number | null
          campanha_origem?: string | null
          cancelou_inscricao_email?: boolean | null
          cargo?: string | null
          celular?: string | null
          cliente_id?: string | null
          consentimento_lgpd?: boolean | null
          conta_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_consentimento_lgpd?: string | null
          data_nascimento?: string | null
          data_ultima_atividade?: string | null
          departamento?: string | null
          descricao?: string | null
          dores_identificadas?: string | null
          email?: string | null
          email_secundario?: string | null
          endereco_correspondencia_id?: string | null
          esta_ativo?: boolean | null
          estagio_ciclo_vida?: string | null
          excluido_em?: string | null
          facebook_url?: string | null
          frequencia_contato_preferida?: string | null
          id?: string
          idioma_preferido?: string | null
          instagram_url?: string | null
          interesses?: string[] | null
          linkedin_url?: string | null
          melhor_horario_contato?: string | null
          nao_enviar_email?: boolean | null
          nao_ligar?: boolean | null
          necessidade_identificada?: string | null
          nivel_autoridade?: string | null
          nome_completo?: string | null
          objetivos_profissionais?: string | null
          origem_lead?: string | null
          pontuacao_lead?: number | null
          preferencia_contato?: string | null
          primeiro_nome: string
          proprietario_id?: string | null
          proximo_followup?: string | null
          relacionamento_com?: string | null
          reporta_para_id?: string | null
          score_qualificacao?: number | null
          skype_id?: string | null
          sobrenome: string
          status_lead?: string | null
          tags?: string[] | null
          telefone?: string | null
          timeline_decisao?: string | null
          timezone?: string | null
          tratamento?: string | null
          twitter_url?: string | null
          ultimo_contato?: string | null
          whatsapp_numero?: string | null
        }
        Update: {
          aceita_marketing?: boolean | null
          atualizado_em?: string | null
          atualizado_por?: string | null
          budget_estimado?: number | null
          campanha_origem?: string | null
          cancelou_inscricao_email?: boolean | null
          cargo?: string | null
          celular?: string | null
          cliente_id?: string | null
          consentimento_lgpd?: boolean | null
          conta_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_consentimento_lgpd?: string | null
          data_nascimento?: string | null
          data_ultima_atividade?: string | null
          departamento?: string | null
          descricao?: string | null
          dores_identificadas?: string | null
          email?: string | null
          email_secundario?: string | null
          endereco_correspondencia_id?: string | null
          esta_ativo?: boolean | null
          estagio_ciclo_vida?: string | null
          excluido_em?: string | null
          facebook_url?: string | null
          frequencia_contato_preferida?: string | null
          id?: string
          idioma_preferido?: string | null
          instagram_url?: string | null
          interesses?: string[] | null
          linkedin_url?: string | null
          melhor_horario_contato?: string | null
          nao_enviar_email?: boolean | null
          nao_ligar?: boolean | null
          necessidade_identificada?: string | null
          nivel_autoridade?: string | null
          nome_completo?: string | null
          objetivos_profissionais?: string | null
          origem_lead?: string | null
          pontuacao_lead?: number | null
          preferencia_contato?: string | null
          primeiro_nome?: string
          proprietario_id?: string | null
          proximo_followup?: string | null
          relacionamento_com?: string | null
          reporta_para_id?: string | null
          score_qualificacao?: number | null
          skype_id?: string | null
          sobrenome?: string
          status_lead?: string | null
          tags?: string[] | null
          telefone?: string | null
          timeline_decisao?: string | null
          timezone?: string | null
          tratamento?: string | null
          twitter_url?: string | null
          ultimo_contato?: string | null
          whatsapp_numero?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "contatos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "contatos_endereco_correspondencia_id_fkey"
            columns: ["endereco_correspondencia_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_relacionamento_com_fkey"
            columns: ["relacionamento_com"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_reporta_para_id_fkey"
            columns: ["reporta_para_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_cliente: {
        Row: {
          atualizado_em: string | null
          cargo: string | null
          celular: string | null
          cliente_id: string
          criado_em: string | null
          email: string | null
          id: string
          is_principal: boolean | null
          nome: string
          observacoes: string | null
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cargo?: string | null
          celular?: string | null
          cliente_id: string
          criado_em?: string | null
          email?: string | null
          id?: string
          is_principal?: boolean | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cargo?: string | null
          celular?: string | null
          cliente_id?: string
          criado_em?: string | null
          email?: string | null
          id?: string
          is_principal?: boolean | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          aceita_em: string | null
          atualizado_em: string | null
          conta_id: string | null
          contato_id: string | null
          cotacao_pai_id: string | null
          criado_em: string | null
          criado_por: string | null
          enviada_em: string | null
          excluido_em: string | null
          id: string
          nome_cotacao: string
          numero_cotacao: string
          observacoes: string | null
          oportunidade_id: string | null
          proprietario_id: string | null
          rejeitada_em: string | null
          status: string | null
          subtotal: number | null
          termos_condicoes: string | null
          total_desconto: number | null
          total_geral: number | null
          total_imposto: number | null
          url_pdf: string | null
          valida_ate: string | null
          versao: number | null
        }
        Insert: {
          aceita_em?: string | null
          atualizado_em?: string | null
          conta_id?: string | null
          contato_id?: string | null
          cotacao_pai_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          enviada_em?: string | null
          excluido_em?: string | null
          id?: string
          nome_cotacao: string
          numero_cotacao: string
          observacoes?: string | null
          oportunidade_id?: string | null
          proprietario_id?: string | null
          rejeitada_em?: string | null
          status?: string | null
          subtotal?: number | null
          termos_condicoes?: string | null
          total_desconto?: number | null
          total_geral?: number | null
          total_imposto?: number | null
          url_pdf?: string | null
          valida_ate?: string | null
          versao?: number | null
        }
        Update: {
          aceita_em?: string | null
          atualizado_em?: string | null
          conta_id?: string | null
          contato_id?: string | null
          cotacao_pai_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          enviada_em?: string | null
          excluido_em?: string | null
          id?: string
          nome_cotacao?: string
          numero_cotacao?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          proprietario_id?: string | null
          rejeitada_em?: string | null
          status?: string | null
          subtotal?: number | null
          termos_condicoes?: string | null
          total_desconto?: number | null
          total_geral?: number | null
          total_imposto?: number | null
          url_pdf?: string | null
          valida_ate?: string | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "cotacoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_cotacao_pai_id_fkey"
            columns: ["cotacao_pai_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_condicoes_pagamento: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          codigo_integracao: string | null
          codigo_portal: string
          condicao_pagamento_id: string | null
          criado_em: string | null
          criado_por: string | null
          descricao_portal: string
          id: string
          plataforma_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo_integracao?: string | null
          codigo_portal: string
          condicao_pagamento_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao_portal: string
          id?: string
          plataforma_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo_integracao?: string | null
          codigo_portal?: string
          condicao_pagamento_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao_portal?: string
          id?: string
          plataforma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edi_condicoes_pagamento_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "condicoes_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_condicoes_pagamento_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_condicoes_pagamento_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_condicoes_pagamento_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_condicoes_pagamento_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "edi_condicoes_pagamento_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas_edi"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_cotacoes: {
        Row: {
          analisado_por_ia: boolean | null
          analise_concluida_em: string | null
          analise_ia_concluida_em: string | null
          analise_ia_iniciada_em: string | null
          analise_iniciada_em: string | null
          atualizado_em: string | null
          baixado_em: string | null
          cidade_cliente: string | null
          cnpj_cliente: string
          condicao_pagamento_id: string | null
          criado_em: string | null
          dados_brutos: string | null
          dados_originais: Json
          data_abertura: string
          data_encerramento: string | null
          data_vencimento_atual: string
          data_vencimento_original: string
          detalhes: Json | null
          erro_analise: string | null
          erro_analise_ia: string | null
          forma_pagamento_portal: string | null
          historico_steps: Json | null
          id: string
          id_cotacao_externa: string
          id_forma_pagamento_portal: string | null
          id_resposta_externa: string | null
          itens_analisados: number | null
          modelo_ia_utilizado: string | null
          nome_cliente: string | null
          numero_cotacao: string | null
          plataforma_id: string | null
          progresso_analise_percent: number | null
          resgatada: boolean | null
          resgatada_em: string | null
          resgatada_por: string | null
          respondido_em: string | null
          respondido_por: string | null
          status_analise_ia:
            | Database["public"]["Enums"]["status_analise_ia"]
            | null
          step_atual: string
          tags: string[] | null
          tempo_analise_segundos: number | null
          total_itens: number | null
          total_itens_analisados: number | null
          total_itens_confirmados: number | null
          total_itens_para_analise: number | null
          total_itens_respondidos: number | null
          total_sugestoes_geradas: number | null
          uf_cliente: string | null
          valor_total_confirmado: number | null
          valor_total_respondido: number | null
          versao_algoritmo: string | null
        }
        Insert: {
          analisado_por_ia?: boolean | null
          analise_concluida_em?: string | null
          analise_ia_concluida_em?: string | null
          analise_ia_iniciada_em?: string | null
          analise_iniciada_em?: string | null
          atualizado_em?: string | null
          baixado_em?: string | null
          cidade_cliente?: string | null
          cnpj_cliente: string
          condicao_pagamento_id?: string | null
          criado_em?: string | null
          dados_brutos?: string | null
          dados_originais: Json
          data_abertura: string
          data_encerramento?: string | null
          data_vencimento_atual: string
          data_vencimento_original: string
          detalhes?: Json | null
          erro_analise?: string | null
          erro_analise_ia?: string | null
          forma_pagamento_portal?: string | null
          historico_steps?: Json | null
          id?: string
          id_cotacao_externa: string
          id_forma_pagamento_portal?: string | null
          id_resposta_externa?: string | null
          itens_analisados?: number | null
          modelo_ia_utilizado?: string | null
          nome_cliente?: string | null
          numero_cotacao?: string | null
          plataforma_id?: string | null
          progresso_analise_percent?: number | null
          resgatada?: boolean | null
          resgatada_em?: string | null
          resgatada_por?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          status_analise_ia?:
            | Database["public"]["Enums"]["status_analise_ia"]
            | null
          step_atual?: string
          tags?: string[] | null
          tempo_analise_segundos?: number | null
          total_itens?: number | null
          total_itens_analisados?: number | null
          total_itens_confirmados?: number | null
          total_itens_para_analise?: number | null
          total_itens_respondidos?: number | null
          total_sugestoes_geradas?: number | null
          uf_cliente?: string | null
          valor_total_confirmado?: number | null
          valor_total_respondido?: number | null
          versao_algoritmo?: string | null
        }
        Update: {
          analisado_por_ia?: boolean | null
          analise_concluida_em?: string | null
          analise_ia_concluida_em?: string | null
          analise_ia_iniciada_em?: string | null
          analise_iniciada_em?: string | null
          atualizado_em?: string | null
          baixado_em?: string | null
          cidade_cliente?: string | null
          cnpj_cliente?: string
          condicao_pagamento_id?: string | null
          criado_em?: string | null
          dados_brutos?: string | null
          dados_originais?: Json
          data_abertura?: string
          data_encerramento?: string | null
          data_vencimento_atual?: string
          data_vencimento_original?: string
          detalhes?: Json | null
          erro_analise?: string | null
          erro_analise_ia?: string | null
          forma_pagamento_portal?: string | null
          historico_steps?: Json | null
          id?: string
          id_cotacao_externa?: string
          id_forma_pagamento_portal?: string | null
          id_resposta_externa?: string | null
          itens_analisados?: number | null
          modelo_ia_utilizado?: string | null
          nome_cliente?: string | null
          numero_cotacao?: string | null
          plataforma_id?: string | null
          progresso_analise_percent?: number | null
          resgatada?: boolean | null
          resgatada_em?: string | null
          resgatada_por?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          status_analise_ia?:
            | Database["public"]["Enums"]["status_analise_ia"]
            | null
          step_atual?: string
          tags?: string[] | null
          tempo_analise_segundos?: number | null
          total_itens?: number | null
          total_itens_analisados?: number | null
          total_itens_confirmados?: number | null
          total_itens_para_analise?: number | null
          total_itens_respondidos?: number | null
          total_sugestoes_geradas?: number | null
          uf_cliente?: string | null
          valor_total_confirmado?: number | null
          valor_total_respondido?: number | null
          versao_algoritmo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edi_cotacoes_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "condicoes_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas_edi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_resgatada_por_fkey"
            columns: ["resgatada_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_cotacoes_resgatada_por_fkey"
            columns: ["resgatada_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_resgatada_por_fkey"
            columns: ["resgatada_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_cotacoes_resgatada_por_fkey"
            columns: ["resgatada_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "edi_cotacoes_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_cotacoes_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_cotacoes_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      edi_cotacoes_itens: {
        Row: {
          analisado_em: string | null
          analisado_por_ia: boolean | null
          analise_ia_em: string | null
          atualizado_em: string | null
          codigo_produto_cliente: string | null
          confirmado_em: string | null
          cotacao_id: string | null
          criado_em: string | null
          dados_originais: Json
          descricao_produto_cliente: string
          detalhes_resposta: Json | null
          erro_analise_ia: string | null
          feedback_vendedor: string | null
          feedback_vendedor_em: string | null
          id: string
          id_item_externo: string | null
          id_unidade_medida_portal: string | null
          justificativa_ia: string | null
          marca_cliente: string | null
          metodo_vinculacao:
            | Database["public"]["Enums"]["metodo_vinculacao"]
            | null
          motivo_sem_produtos: string | null
          numero_item: number | null
          percentual_desconto: number | null
          preco_total: number | null
          preco_unitario_respondido: number | null
          produto_aceito_ia_id: string | null
          produto_id: string | null
          produto_selecionado_id: string | null
          produto_vinculo_id: string | null
          produtos_sugeridos_ia: Json | null
          quantidade_confirmada: number | null
          quantidade_respondida: number | null
          quantidade_solicitada: number
          requer_revisao_humana: boolean | null
          respondido_em: string | null
          revisado_em: string | null
          revisado_por: string | null
          score_confianca_ia: number | null
          sem_produtos_cf: boolean | null
          status: string | null
          tempo_analise_ms: number | null
          tempo_analise_segundos: number | null
          unidade_medida: string | null
          unidade_medida_portal: string | null
          valor_desconto: number | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por_ia?: boolean | null
          analise_ia_em?: string | null
          atualizado_em?: string | null
          codigo_produto_cliente?: string | null
          confirmado_em?: string | null
          cotacao_id?: string | null
          criado_em?: string | null
          dados_originais: Json
          descricao_produto_cliente: string
          detalhes_resposta?: Json | null
          erro_analise_ia?: string | null
          feedback_vendedor?: string | null
          feedback_vendedor_em?: string | null
          id?: string
          id_item_externo?: string | null
          id_unidade_medida_portal?: string | null
          justificativa_ia?: string | null
          marca_cliente?: string | null
          metodo_vinculacao?:
            | Database["public"]["Enums"]["metodo_vinculacao"]
            | null
          motivo_sem_produtos?: string | null
          numero_item?: number | null
          percentual_desconto?: number | null
          preco_total?: number | null
          preco_unitario_respondido?: number | null
          produto_aceito_ia_id?: string | null
          produto_id?: string | null
          produto_selecionado_id?: string | null
          produto_vinculo_id?: string | null
          produtos_sugeridos_ia?: Json | null
          quantidade_confirmada?: number | null
          quantidade_respondida?: number | null
          quantidade_solicitada: number
          requer_revisao_humana?: boolean | null
          respondido_em?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          score_confianca_ia?: number | null
          sem_produtos_cf?: boolean | null
          status?: string | null
          tempo_analise_ms?: number | null
          tempo_analise_segundos?: number | null
          unidade_medida?: string | null
          unidade_medida_portal?: string | null
          valor_desconto?: number | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por_ia?: boolean | null
          analise_ia_em?: string | null
          atualizado_em?: string | null
          codigo_produto_cliente?: string | null
          confirmado_em?: string | null
          cotacao_id?: string | null
          criado_em?: string | null
          dados_originais?: Json
          descricao_produto_cliente?: string
          detalhes_resposta?: Json | null
          erro_analise_ia?: string | null
          feedback_vendedor?: string | null
          feedback_vendedor_em?: string | null
          id?: string
          id_item_externo?: string | null
          id_unidade_medida_portal?: string | null
          justificativa_ia?: string | null
          marca_cliente?: string | null
          metodo_vinculacao?:
            | Database["public"]["Enums"]["metodo_vinculacao"]
            | null
          motivo_sem_produtos?: string | null
          numero_item?: number | null
          percentual_desconto?: number | null
          preco_total?: number | null
          preco_unitario_respondido?: number | null
          produto_aceito_ia_id?: string | null
          produto_id?: string | null
          produto_selecionado_id?: string | null
          produto_vinculo_id?: string | null
          produtos_sugeridos_ia?: Json | null
          quantidade_confirmada?: number | null
          quantidade_respondida?: number | null
          quantidade_solicitada?: number
          requer_revisao_humana?: boolean | null
          respondido_em?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          score_confianca_ia?: number | null
          sem_produtos_cf?: boolean | null
          status?: string | null
          tempo_analise_ms?: number | null
          tempo_analise_segundos?: number | null
          unidade_medida?: string | null
          unidade_medida_portal?: string | null
          valor_desconto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "edi_cotacoes_itens_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "edi_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_itens_produto_aceito_ia_id_fkey"
            columns: ["produto_aceito_ia_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_itens_produto_aceito_ia_id_fkey"
            columns: ["produto_aceito_ia_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_itens_produto_selecionado_id_fkey"
            columns: ["produto_selecionado_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_itens_produto_selecionado_id_fkey"
            columns: ["produto_selecionado_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_cotacoes_itens_produto_vinculo_id_fkey"
            columns: ["produto_vinculo_id"]
            isOneToOne: false
            referencedRelation: "edi_produtos_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_historico_mudancas: {
        Row: {
          alterado_em: string | null
          alterado_por: string | null
          campo: string
          detalhes: Json | null
          entidade_id: string
          entidade_tipo: string
          id: string
          motivo: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_em?: string | null
          alterado_por?: string | null
          campo: string
          detalhes?: Json | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          motivo?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_em?: string | null
          alterado_por?: string | null
          campo?: string
          detalhes?: Json | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          motivo?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      edi_logs_integracao: {
        Row: {
          dados_debug: Json | null
          entidade_id: string | null
          entidade_tipo: string | null
          erro: string | null
          executado_em: string | null
          executado_por: string | null
          id: string
          id_cotacao_externa: string | null
          id_pedido_externo: string | null
          mensagem_retorno: string | null
          metodo: string | null
          operacao: string
          parametros: Json | null
          payload_enviado: string | null
          payload_recebido: string | null
          plataforma_id: string | null
          stack_trace: string | null
          status_code: number | null
          status_http: number | null
          sucesso: boolean | null
          tempo_execucao_ms: number | null
          tipo: string
        }
        Insert: {
          dados_debug?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          erro?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          id_cotacao_externa?: string | null
          id_pedido_externo?: string | null
          mensagem_retorno?: string | null
          metodo?: string | null
          operacao: string
          parametros?: Json | null
          payload_enviado?: string | null
          payload_recebido?: string | null
          plataforma_id?: string | null
          stack_trace?: string | null
          status_code?: number | null
          status_http?: number | null
          sucesso?: boolean | null
          tempo_execucao_ms?: number | null
          tipo: string
        }
        Update: {
          dados_debug?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          erro?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          id_cotacao_externa?: string | null
          id_pedido_externo?: string | null
          mensagem_retorno?: string | null
          metodo?: string | null
          operacao?: string
          parametros?: Json | null
          payload_enviado?: string | null
          payload_recebido?: string | null
          plataforma_id?: string | null
          stack_trace?: string | null
          status_code?: number | null
          status_http?: number | null
          sucesso?: boolean | null
          tempo_execucao_ms?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "edi_logs_integracao_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_logs_integracao_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_logs_integracao_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_logs_integracao_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "edi_logs_integracao_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas_edi"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_pedidos: {
        Row: {
          atualizado_em: string | null
          cidade_cliente: string | null
          cnpj_cliente: string
          cotacao_id: string | null
          criado_em: string | null
          dados_brutos: string | null
          dados_originais: Json
          data_confirmacao: string
          data_entrega_prevista: string | null
          data_faturamento: string | null
          data_pedido: string
          detalhes: Json | null
          id: string
          id_pedido_externo: string
          integrado_erp: boolean | null
          integrado_erp_em: string | null
          nome_cliente: string | null
          numero_nota_fiscal: string | null
          numero_pedido: string | null
          plataforma_id: string | null
          resgatado_em: string | null
          status: string
          uf_cliente: string | null
          valor_desconto: number | null
          valor_final: number
          valor_frete: number | null
          valor_total: number
        }
        Insert: {
          atualizado_em?: string | null
          cidade_cliente?: string | null
          cnpj_cliente: string
          cotacao_id?: string | null
          criado_em?: string | null
          dados_brutos?: string | null
          dados_originais: Json
          data_confirmacao: string
          data_entrega_prevista?: string | null
          data_faturamento?: string | null
          data_pedido: string
          detalhes?: Json | null
          id?: string
          id_pedido_externo: string
          integrado_erp?: boolean | null
          integrado_erp_em?: string | null
          nome_cliente?: string | null
          numero_nota_fiscal?: string | null
          numero_pedido?: string | null
          plataforma_id?: string | null
          resgatado_em?: string | null
          status?: string
          uf_cliente?: string | null
          valor_desconto?: number | null
          valor_final: number
          valor_frete?: number | null
          valor_total: number
        }
        Update: {
          atualizado_em?: string | null
          cidade_cliente?: string | null
          cnpj_cliente?: string
          cotacao_id?: string | null
          criado_em?: string | null
          dados_brutos?: string | null
          dados_originais?: Json
          data_confirmacao?: string
          data_entrega_prevista?: string | null
          data_faturamento?: string | null
          data_pedido?: string
          detalhes?: Json | null
          id?: string
          id_pedido_externo?: string
          integrado_erp?: boolean | null
          integrado_erp_em?: string | null
          nome_cliente?: string | null
          numero_nota_fiscal?: string | null
          numero_pedido?: string | null
          plataforma_id?: string | null
          resgatado_em?: string | null
          status?: string
          uf_cliente?: string | null
          valor_desconto?: number | null
          valor_final?: number
          valor_frete?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "edi_pedidos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "edi_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_pedidos_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas_edi"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_pedidos_itens: {
        Row: {
          atualizado_em: string | null
          cancelado_em: string | null
          codigo_produto: string | null
          cotacao_item_id: string | null
          criado_em: string | null
          dados_originais: Json
          descricao_produto: string
          detalhes: Json | null
          foi_cancelado: boolean | null
          id: string
          id_item_externo: string | null
          motivo_cancelamento: string | null
          numero_item: number | null
          pedido_id: string | null
          percentual_desconto: number | null
          preco_unitario: number
          produto_id: string | null
          produto_vinculo_id: string | null
          quantidade: number
          quantidade_entregue: number | null
          status: string | null
          unidade_medida: string | null
          valor_desconto: number | null
          valor_total: number
        }
        Insert: {
          atualizado_em?: string | null
          cancelado_em?: string | null
          codigo_produto?: string | null
          cotacao_item_id?: string | null
          criado_em?: string | null
          dados_originais: Json
          descricao_produto: string
          detalhes?: Json | null
          foi_cancelado?: boolean | null
          id?: string
          id_item_externo?: string | null
          motivo_cancelamento?: string | null
          numero_item?: number | null
          pedido_id?: string | null
          percentual_desconto?: number | null
          preco_unitario: number
          produto_id?: string | null
          produto_vinculo_id?: string | null
          quantidade: number
          quantidade_entregue?: number | null
          status?: string | null
          unidade_medida?: string | null
          valor_desconto?: number | null
          valor_total: number
        }
        Update: {
          atualizado_em?: string | null
          cancelado_em?: string | null
          codigo_produto?: string | null
          cotacao_item_id?: string | null
          criado_em?: string | null
          dados_originais?: Json
          descricao_produto?: string
          detalhes?: Json | null
          foi_cancelado?: boolean | null
          id?: string
          id_item_externo?: string | null
          motivo_cancelamento?: string | null
          numero_item?: number | null
          pedido_id?: string | null
          percentual_desconto?: number | null
          preco_unitario?: number
          produto_id?: string | null
          produto_vinculo_id?: string | null
          quantidade?: number
          quantidade_entregue?: number | null
          status?: string | null
          unidade_medida?: string | null
          valor_desconto?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "edi_pedidos_itens_cotacao_item_id_fkey"
            columns: ["cotacao_item_id"]
            isOneToOne: false
            referencedRelation: "edi_cotacoes_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_pedidos_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "edi_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_pedidos_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_pedidos_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_pedidos_itens_produto_vinculo_id_fkey"
            columns: ["produto_vinculo_id"]
            isOneToOne: false
            referencedRelation: "edi_produtos_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_produtos_vinculo: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          ativo: boolean | null
          atualizado_em: string | null
          cnpj_cliente: string
          codigo_ean: string | null
          codigo_produto_cliente: string | null
          codigo_produto_fornecedor: string | null
          codigo_simpro: string | null
          criado_em: string | null
          criado_por: string | null
          desconto_padrao: number | null
          descricao_cliente: string | null
          eh_produto_alternativo: boolean | null
          estoque_minimo: number | null
          id: string
          observacoes: string | null
          ordem_prioridade: number | null
          plataforma_id: string | null
          preco_padrao: number | null
          produto_id: string | null
          prompt_ia: string | null
          resposta_ia: Json | null
          score_confianca: number | null
          sugerido_em: string | null
          sugerido_por_ia: boolean | null
          taxa_conversao: number | null
          total_cotacoes_respondidas: number | null
          total_pedidos_ganhos: number | null
          total_pedidos_perdidos: number | null
          ultima_cotacao_em: string | null
          ultimo_preco_respondido: number | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          cnpj_cliente: string
          codigo_ean?: string | null
          codigo_produto_cliente?: string | null
          codigo_produto_fornecedor?: string | null
          codigo_simpro?: string | null
          criado_em?: string | null
          criado_por?: string | null
          desconto_padrao?: number | null
          descricao_cliente?: string | null
          eh_produto_alternativo?: boolean | null
          estoque_minimo?: number | null
          id?: string
          observacoes?: string | null
          ordem_prioridade?: number | null
          plataforma_id?: string | null
          preco_padrao?: number | null
          produto_id?: string | null
          prompt_ia?: string | null
          resposta_ia?: Json | null
          score_confianca?: number | null
          sugerido_em?: string | null
          sugerido_por_ia?: boolean | null
          taxa_conversao?: number | null
          total_cotacoes_respondidas?: number | null
          total_pedidos_ganhos?: number | null
          total_pedidos_perdidos?: number | null
          ultima_cotacao_em?: string | null
          ultimo_preco_respondido?: number | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          cnpj_cliente?: string
          codigo_ean?: string | null
          codigo_produto_cliente?: string | null
          codigo_produto_fornecedor?: string | null
          codigo_simpro?: string | null
          criado_em?: string | null
          criado_por?: string | null
          desconto_padrao?: number | null
          descricao_cliente?: string | null
          eh_produto_alternativo?: boolean | null
          estoque_minimo?: number | null
          id?: string
          observacoes?: string | null
          ordem_prioridade?: number | null
          plataforma_id?: string | null
          preco_padrao?: number | null
          produto_id?: string | null
          prompt_ia?: string | null
          resposta_ia?: Json | null
          score_confianca?: number | null
          sugerido_em?: string | null
          sugerido_por_ia?: boolean | null
          taxa_conversao?: number | null
          total_cotacoes_respondidas?: number | null
          total_pedidos_ganhos?: number | null
          total_pedidos_perdidos?: number | null
          ultima_cotacao_em?: string | null
          ultimo_preco_respondido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "edi_produtos_vinculo_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas_edi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_produtos_vinculo_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_unidades_medida: {
        Row: {
          abreviacao_portal: string | null
          ativo: boolean | null
          atualizado_em: string | null
          codigo_portal: string
          criado_em: string | null
          criado_por: string | null
          descricao_portal: string
          id: string
          plataforma_id: string | null
          unidade_medida_interna: string
        }
        Insert: {
          abreviacao_portal?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo_portal: string
          criado_em?: string | null
          criado_por?: string | null
          descricao_portal: string
          id?: string
          plataforma_id?: string | null
          unidade_medida_interna: string
        }
        Update: {
          abreviacao_portal?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo_portal?: string
          criado_em?: string | null
          criado_por?: string | null
          descricao_portal?: string
          id?: string
          plataforma_id?: string | null
          unidade_medida_interna?: string
        }
        Relationships: [
          {
            foreignKeyName: "edi_unidades_medida_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_unidades_medida_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_unidades_medida_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "edi_unidades_medida_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "edi_unidades_medida_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas_edi"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings_queue: {
        Row: {
          atualizado_em: string
          criado_em: string
          erro_mensagem: string | null
          id: string
          max_tentativas: number
          processado_em: string | null
          produto_id: string
          status: string
          tentativas: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          erro_mensagem?: string | null
          id?: string
          max_tentativas?: number
          processado_em?: string | null
          produto_id: string
          status?: string
          tentativas?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          erro_mensagem?: string | null
          id?: string
          max_tentativas?: number
          processado_em?: string | null
          produto_id?: string
          status?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_queue_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_queue_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          atualizado_em: string | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo_estabelecimento: string | null
          complemento: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          esta_ativa: boolean | null
          estado: string | null
          excluido_em: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          natureza_operacao: string | null
          nome: string
          nome_empresa: string
          nome_fantasia: string | null
          numero: string | null
          razao_social: string | null
          setor: string | null
          site: string | null
          tamanho_empresa: string | null
          telefone: string | null
          url_logo: string | null
          url_logo_expandido: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo_estabelecimento?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          esta_ativa?: boolean | null
          estado?: string | null
          excluido_em?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          natureza_operacao?: string | null
          nome: string
          nome_empresa: string
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          setor?: string | null
          site?: string | null
          tamanho_empresa?: string | null
          telefone?: string | null
          url_logo?: string | null
          url_logo_expandido?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo_estabelecimento?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          esta_ativa?: boolean | null
          estado?: string | null
          excluido_em?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          natureza_operacao?: string | null
          nome?: string
          nome_empresa?: string
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          setor?: string | null
          site?: string | null
          tamanho_empresa?: string | null
          telefone?: string | null
          url_logo?: string | null
          url_logo_expandido?: string | null
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          atualizado_em: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          criado_em: string | null
          eh_primario: boolean | null
          estado: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          numero: string | null
          pais: string | null
          tipo_endereco: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          criado_em?: string | null
          eh_primario?: boolean | null
          estado?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          numero?: string | null
          pais?: string | null
          tipo_endereco?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          criado_em?: string | null
          eh_primario?: boolean | null
          estado?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          numero?: string | null
          pais?: string | null
          tipo_endereco?: string | null
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
          {
            foreignKeyName: "enderecos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      equipes: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          descricao: string | null
          esta_ativa: boolean | null
          excluido_em: string | null
          gestor_id: string | null
          id: string
          lider_equipe_id: string | null
          nome: string
          tipo_equipe: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          esta_ativa?: boolean | null
          excluido_em?: string | null
          gestor_id?: string | null
          id?: string
          lider_equipe_id?: string | null
          nome: string
          tipo_equipe?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          esta_ativa?: boolean | null
          excluido_em?: string | null
          gestor_id?: string | null
          id?: string
          lider_equipe_id?: string | null
          nome?: string
          tipo_equipe?: string | null
        }
        Relationships: []
      }
      estagios_pipeline: {
        Row: {
          alerta_estagnacao_dias: number | null
          atualizado_em: string | null
          automacoes: Json | null
          campos_obrigatorios: Json | null
          cor: string | null
          criado_em: string | null
          descricao: string | null
          duracao_esperada_dias: number | null
          eh_ganho_fechado: boolean | null
          eh_perdido_fechado: boolean | null
          icone: string | null
          id: string
          nome_estagio: string
          ordem_estagio: number
          percentual_probabilidade: number | null
          pipeline_id: string | null
          validacoes: Json | null
        }
        Insert: {
          alerta_estagnacao_dias?: number | null
          atualizado_em?: string | null
          automacoes?: Json | null
          campos_obrigatorios?: Json | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          duracao_esperada_dias?: number | null
          eh_ganho_fechado?: boolean | null
          eh_perdido_fechado?: boolean | null
          icone?: string | null
          id?: string
          nome_estagio: string
          ordem_estagio: number
          percentual_probabilidade?: number | null
          pipeline_id?: string | null
          validacoes?: Json | null
        }
        Update: {
          alerta_estagnacao_dias?: number | null
          atualizado_em?: string | null
          automacoes?: Json | null
          campos_obrigatorios?: Json | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          duracao_esperada_dias?: number | null
          eh_ganho_fechado?: boolean | null
          eh_perdido_fechado?: boolean | null
          icone?: string | null
          id?: string
          nome_estagio?: string
          ordem_estagio?: number
          percentual_probabilidade?: number | null
          pipeline_id?: string | null
          validacoes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "estagios_pipeline_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
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
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetaveis: {
        Row: {
          etiquetado_em: string | null
          id_etiquetavel: string
          tag_id: string
          tipo_etiquetavel: string
        }
        Insert: {
          etiquetado_em?: string | null
          id_etiquetavel: string
          tag_id: string
          tipo_etiquetavel: string
        }
        Update: {
          etiquetado_em?: string | null
          id_etiquetavel?: string
          tag_id?: string
          tipo_etiquetavel?: string
        }
        Relationships: [
          {
            foreignKeyName: "etiquetaveis_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      filas_atendimento: {
        Row: {
          atualizado_em: string
          cor: string
          criado_em: string
          descricao: string | null
          esta_ativa: boolean
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          descricao?: string | null
          esta_ativa?: boolean
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          descricao?: string | null
          esta_ativa?: boolean
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      ged_alertas: {
        Row: {
          dias_antes: number
          documento_id: string | null
          enviado: boolean | null
          enviado_em: string | null
          id: string
          usuarios_notificados: string[] | null
        }
        Insert: {
          dias_antes: number
          documento_id?: string | null
          enviado?: boolean | null
          enviado_em?: string | null
          id?: string
          usuarios_notificados?: string[] | null
        }
        Update: {
          dias_antes?: number
          documento_id?: string | null
          enviado?: boolean | null
          enviado_em?: string | null
          id?: string
          usuarios_notificados?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ged_alertas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "ged_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ged_documentos: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          atualizado_em: string | null
          atualizado_por: string | null
          criado_em: string | null
          criado_por: string
          data_emissao: string | null
          data_validade: string | null
          descricao: string | null
          documento_pai_id: string | null
          eh_versao_atual: boolean | null
          id: string
          metadados: Json | null
          numero_documento: string | null
          status_validade: string | null
          tags: string[] | null
          tamanho_bytes: number | null
          tipo_id: string
          tipo_mime: string | null
          titulo: string
          versao: number | null
          versao_label: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          atualizado_em?: string | null
          atualizado_por?: string | null
          criado_em?: string | null
          criado_por: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          documento_pai_id?: string | null
          eh_versao_atual?: boolean | null
          id?: string
          metadados?: Json | null
          numero_documento?: string | null
          status_validade?: string | null
          tags?: string[] | null
          tamanho_bytes?: number | null
          tipo_id: string
          tipo_mime?: string | null
          titulo: string
          versao?: number | null
          versao_label?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          atualizado_em?: string | null
          atualizado_por?: string | null
          criado_em?: string | null
          criado_por?: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          documento_pai_id?: string | null
          eh_versao_atual?: boolean | null
          id?: string
          metadados?: Json | null
          numero_documento?: string | null
          status_validade?: string | null
          tags?: string[] | null
          tamanho_bytes?: number | null
          tipo_id?: string
          tipo_mime?: string | null
          titulo?: string
          versao?: number | null
          versao_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ged_documentos_documento_pai_id_fkey"
            columns: ["documento_pai_id"]
            isOneToOne: false
            referencedRelation: "ged_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ged_documentos_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "ged_tipos_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ged_documentos_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "mv_ged_por_tipo"
            referencedColumns: ["tipo_id"]
          },
        ]
      }
      ged_permissoes: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          documento_id: string | null
          equipe_id: string | null
          id: string
          nivel: string | null
          role_nome: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          documento_id?: string | null
          equipe_id?: string | null
          id?: string
          nivel?: string | null
          role_nome?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          documento_id?: string | null
          equipe_id?: string | null
          id?: string
          nivel?: string | null
          role_nome?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ged_permissoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "ged_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ged_permissoes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ged_permissoes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "ged_permissoes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      ged_tipos_documento: {
        Row: {
          ativo: boolean | null
          cor: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          dias_alerta_vencimento: number | null
          exige_validade: boolean | null
          extensoes_permitidas: string[] | null
          icone: string | null
          id: string
          nome: string
          permite_versoes: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          dias_alerta_vencimento?: number | null
          exige_validade?: boolean | null
          extensoes_permitidas?: string[] | null
          icone?: string | null
          id?: string
          nome: string
          permite_versoes?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          dias_alerta_vencimento?: number | null
          exige_validade?: boolean | null
          extensoes_permitidas?: string[] | null
          icone?: string | null
          id?: string
          nome?: string
          permite_versoes?: boolean | null
        }
        Relationships: []
      }
      ged_visualizacoes: {
        Row: {
          acao: string
          criado_em: string | null
          dispositivo: string | null
          documento_id: string | null
          id: string
          ip_origem: unknown
          navegador: string | null
          tempo_visualizacao_segundos: number | null
          usuario_id: string
        }
        Insert: {
          acao: string
          criado_em?: string | null
          dispositivo?: string | null
          documento_id?: string | null
          id?: string
          ip_origem?: unknown
          navegador?: string | null
          tempo_visualizacao_segundos?: number | null
          usuario_id: string
        }
        Update: {
          acao?: string
          criado_em?: string | null
          dispositivo?: string | null
          documento_id?: string | null
          id?: string
          ip_origem?: unknown
          navegador?: string | null
          tempo_visualizacao_segundos?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ged_visualizacoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "ged_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_atividades_equipe: {
        Row: {
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string
          equipe_id: string
          id: string
          realizado_em: string
          realizado_por: string | null
          tipo_atividade: string
        }
        Insert: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao: string
          equipe_id: string
          id?: string
          realizado_em?: string
          realizado_por?: string | null
          tipo_atividade: string
        }
        Update: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string
          equipe_id?: string
          id?: string
          realizado_em?: string
          realizado_por?: string | null
          tipo_atividade?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_atividades_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_atividades_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "historico_atividades_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      historico_estagio_oportunidade: {
        Row: {
          alterado_em: string | null
          alterado_por: string | null
          dias_no_estagio_anterior: number | null
          estagio_anterior_id: string | null
          estagio_novo_id: string | null
          id: string
          observacoes: string | null
          oportunidade_id: string | null
        }
        Insert: {
          alterado_em?: string | null
          alterado_por?: string | null
          dias_no_estagio_anterior?: number | null
          estagio_anterior_id?: string | null
          estagio_novo_id?: string | null
          id?: string
          observacoes?: string | null
          oportunidade_id?: string | null
        }
        Update: {
          alterado_em?: string | null
          alterado_por?: string | null
          dias_no_estagio_anterior?: number | null
          estagio_anterior_id?: string | null
          estagio_novo_id?: string | null
          id?: string
          observacoes?: string | null
          oportunidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_estagio_oportunidade_estagio_anterior_id_fkey"
            columns: ["estagio_anterior_id"]
            isOneToOne: false
            referencedRelation: "estagios_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_estagio_oportunidade_estagio_novo_id_fkey"
            columns: ["estagio_novo_id"]
            isOneToOne: false
            referencedRelation: "estagios_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_estagio_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_lideranca_equipe: {
        Row: {
          alterado_em: string
          alterado_por: string
          equipe_id: string
          id: string
          lider_anterior_id: string | null
          lider_novo_id: string
          motivo: string | null
        }
        Insert: {
          alterado_em?: string
          alterado_por: string
          equipe_id: string
          id?: string
          lider_anterior_id?: string | null
          lider_novo_id: string
          motivo?: string | null
        }
        Update: {
          alterado_em?: string
          alterado_por?: string
          equipe_id?: string
          id?: string
          lider_anterior_id?: string | null
          lider_novo_id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_lideranca_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_lideranca_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "historico_lideranca_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      historico_ligacoes: {
        Row: {
          atendida: boolean | null
          atualizado_em: string | null
          chamada_atendida_em: string | null
          chamada_encerrada_em: string | null
          chamada_iniciada_em: string | null
          cliente_id: string | null
          contato_id: string | null
          criado_em: string | null
          dados_webhook: Json | null
          duracao_segundos: number | null
          id: string
          id_chamada_externa: string | null
          iniciada_em: string | null
          iniciada_por: string | null
          motivo_falha: string | null
          nome_contato: string | null
          numero_destino: string
          observacoes: string | null
          status: string | null
        }
        Insert: {
          atendida?: boolean | null
          atualizado_em?: string | null
          chamada_atendida_em?: string | null
          chamada_encerrada_em?: string | null
          chamada_iniciada_em?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          dados_webhook?: Json | null
          duracao_segundos?: number | null
          id?: string
          id_chamada_externa?: string | null
          iniciada_em?: string | null
          iniciada_por?: string | null
          motivo_falha?: string | null
          nome_contato?: string | null
          numero_destino: string
          observacoes?: string | null
          status?: string | null
        }
        Update: {
          atendida?: boolean | null
          atualizado_em?: string | null
          chamada_atendida_em?: string | null
          chamada_encerrada_em?: string | null
          chamada_iniciada_em?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          dados_webhook?: Json | null
          duracao_segundos?: number | null
          id?: string
          id_chamada_externa?: string | null
          iniciada_em?: string | null
          iniciada_por?: string | null
          motivo_falha?: string | null
          nome_contato?: string | null
          numero_destino?: string
          observacoes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_ligacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_ligacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "historico_ligacoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_membros_equipe: {
        Row: {
          carga_trabalho_anterior: number | null
          carga_trabalho_nova: number | null
          dias_na_equipe: number | null
          equipe_destino_id: string | null
          equipe_id: string
          equipe_origem_id: string | null
          id: string
          motivo: string | null
          papel_anterior: string | null
          papel_novo: string | null
          realizado_em: string
          realizado_por: string | null
          tipo_evento: string
          usuario_id: string
        }
        Insert: {
          carga_trabalho_anterior?: number | null
          carga_trabalho_nova?: number | null
          dias_na_equipe?: number | null
          equipe_destino_id?: string | null
          equipe_id: string
          equipe_origem_id?: string | null
          id?: string
          motivo?: string | null
          papel_anterior?: string | null
          papel_novo?: string | null
          realizado_em?: string
          realizado_por?: string | null
          tipo_evento: string
          usuario_id: string
        }
        Update: {
          carga_trabalho_anterior?: number | null
          carga_trabalho_nova?: number | null
          dias_na_equipe?: number | null
          equipe_destino_id?: string | null
          equipe_id?: string
          equipe_origem_id?: string | null
          id?: string
          motivo?: string | null
          papel_anterior?: string | null
          papel_novo?: string | null
          realizado_em?: string
          realizado_por?: string | null
          tipo_evento?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_membros_equipe_equipe_destino_id_fkey"
            columns: ["equipe_destino_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_destino_id_fkey"
            columns: ["equipe_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_destino_id_fkey"
            columns: ["equipe_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_origem_id_fkey"
            columns: ["equipe_origem_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_origem_id_fkey"
            columns: ["equipe_origem_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "historico_membros_equipe_equipe_origem_id_fkey"
            columns: ["equipe_origem_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      historico_status_atendimento: {
        Row: {
          alterado_em: string
          id: string
          status_anterior: string | null
          status_novo: string
          usuario_id: string
        }
        Insert: {
          alterado_em?: string
          id?: string
          status_anterior?: string | null
          status_novo: string
          usuario_id: string
        }
        Update: {
          alterado_em?: string
          id?: string
          status_anterior?: string | null
          status_novo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_status_atendimento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "historico_status_atendimento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_status_atendimento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "historico_status_atendimento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ia_configuracoes: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          config: Json | null
          criado_em: string | null
          id: string
          modulo: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          config?: Json | null
          criado_em?: string | null
          id?: string
          modulo: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          config?: Json | null
          criado_em?: string | null
          id?: string
          modulo?: string
        }
        Relationships: []
      }
      ia_feedback_historico: {
        Row: {
          cotacao_item_id: string
          criado_em: string | null
          detalhes_contexto: Json | null
          foi_aceito: boolean
          id: string
          motivo_rejeicao: string | null
          produto_correto_id: string | null
          produto_sugerido_id: string | null
          score_original: number | null
          tipo_feedback: string
          usuario_id: string | null
        }
        Insert: {
          cotacao_item_id: string
          criado_em?: string | null
          detalhes_contexto?: Json | null
          foi_aceito: boolean
          id?: string
          motivo_rejeicao?: string | null
          produto_correto_id?: string | null
          produto_sugerido_id?: string | null
          score_original?: number | null
          tipo_feedback: string
          usuario_id?: string | null
        }
        Update: {
          cotacao_item_id?: string
          criado_em?: string | null
          detalhes_contexto?: Json | null
          foi_aceito?: boolean
          id?: string
          motivo_rejeicao?: string | null
          produto_correto_id?: string | null
          produto_sugerido_id?: string | null
          score_original?: number | null
          tipo_feedback?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_feedback_historico_cotacao_item_id_fkey"
            columns: ["cotacao_item_id"]
            isOneToOne: false
            referencedRelation: "edi_cotacoes_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_feedback_historico_produto_correto_id_fkey"
            columns: ["produto_correto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_feedback_historico_produto_correto_id_fkey"
            columns: ["produto_correto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_feedback_historico_produto_sugerido_id_fkey"
            columns: ["produto_sugerido_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_feedback_historico_produto_sugerido_id_fkey"
            columns: ["produto_sugerido_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_score_ajustes: {
        Row: {
          ajuste_score: number
          ativo: boolean | null
          atualizado_em: string | null
          cnpj_cliente: string | null
          criado_em: string | null
          criado_por: string | null
          feedback_origem: string | null
          id: string
          motivo_ajuste: string | null
          observacoes: string | null
          padrao_codigo: string | null
          padrao_descricao: string | null
          plataforma_id: string | null
          produto_id: string | null
          score_anterior: number | null
          taxa_acerto: number | null
          total_ocorrencias: number | null
          ultima_utilizacao_em: string | null
        }
        Insert: {
          ajuste_score: number
          ativo?: boolean | null
          atualizado_em?: string | null
          cnpj_cliente?: string | null
          criado_em?: string | null
          criado_por?: string | null
          feedback_origem?: string | null
          id?: string
          motivo_ajuste?: string | null
          observacoes?: string | null
          padrao_codigo?: string | null
          padrao_descricao?: string | null
          plataforma_id?: string | null
          produto_id?: string | null
          score_anterior?: number | null
          taxa_acerto?: number | null
          total_ocorrencias?: number | null
          ultima_utilizacao_em?: string | null
        }
        Update: {
          ajuste_score?: number
          ativo?: boolean | null
          atualizado_em?: string | null
          cnpj_cliente?: string | null
          criado_em?: string | null
          criado_por?: string | null
          feedback_origem?: string | null
          id?: string
          motivo_ajuste?: string | null
          observacoes?: string | null
          padrao_codigo?: string | null
          padrao_descricao?: string | null
          plataforma_id?: string | null
          produto_id?: string | null
          score_anterior?: number | null
          taxa_acerto?: number | null
          total_ocorrencias?: number | null
          ultima_utilizacao_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_score_ajustes_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas_edi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_score_ajustes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_score_ajustes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_totvs_calcula_frete: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          numero_venda: string
          request_payload: string
          response_payload: string | null
          status: string
          tempo_api_ms: number | null
          tempo_preparacao_dados_ms: number | null
          tempo_resposta_ms: number | null
          venda_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          numero_venda: string
          request_payload: string
          response_payload?: string | null
          status?: string
          tempo_api_ms?: number | null
          tempo_preparacao_dados_ms?: number | null
          tempo_resposta_ms?: number | null
          venda_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          numero_venda?: string
          request_payload?: string
          response_payload?: string | null
          status?: string
          tempo_api_ms?: number | null
          tempo_preparacao_dados_ms?: number | null
          tempo_resposta_ms?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_totvs_calcula_frete_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_totvs_calcula_pedido: {
        Row: {
          codigo_oportunidade: string | null
          created_at: string | null
          error_message: string | null
          id: string
          numero_venda: string | null
          oportunidade_id: string | null
          request_payload: string
          response_payload: string | null
          status: string
          tempo_api_ms: number | null
          tempo_preparacao_dados_ms: number | null
          tempo_resposta_ms: number | null
          tempo_tratamento_dados_ms: number | null
          venda_id: string | null
        }
        Insert: {
          codigo_oportunidade?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          numero_venda?: string | null
          oportunidade_id?: string | null
          request_payload: string
          response_payload?: string | null
          status: string
          tempo_api_ms?: number | null
          tempo_preparacao_dados_ms?: number | null
          tempo_resposta_ms?: number | null
          tempo_tratamento_dados_ms?: number | null
          venda_id?: string | null
        }
        Update: {
          codigo_oportunidade?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          numero_venda?: string | null
          oportunidade_id?: string | null
          request_payload?: string
          response_payload?: string | null
          status?: string
          tempo_api_ms?: number | null
          tempo_preparacao_dados_ms?: number | null
          tempo_resposta_ms?: number | null
          tempo_tratamento_dados_ms?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_totvs_calcula_pedido_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracoes_totvs_calcula_pedido_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      interacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_interacao: string
          descricao: string
          id: string
          tipo: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_interacao?: string
          descricao: string
          id?: string
          tipo: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_interacao?: string
          descricao?: string
          id?: string
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      itens_linha_cotacao: {
        Row: {
          cotacao_id: string | null
          descricao: string | null
          id: string
          nome_produto: string | null
          ordem_linha: number | null
          percentual_desconto: number | null
          preco_total: number | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          valor_desconto: number | null
          valor_imposto: number | null
        }
        Insert: {
          cotacao_id?: string | null
          descricao?: string | null
          id?: string
          nome_produto?: string | null
          ordem_linha?: number | null
          percentual_desconto?: number | null
          preco_total?: number | null
          preco_unitario: number
          produto_id?: string | null
          quantidade?: number
          valor_desconto?: number | null
          valor_imposto?: number | null
        }
        Update: {
          cotacao_id?: string | null
          descricao?: string | null
          id?: string
          nome_produto?: string | null
          ordem_linha?: number | null
          percentual_desconto?: number | null
          preco_total?: number | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          valor_desconto?: number | null
          valor_imposto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_linha_cotacao_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_linha_cotacao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_linha_oportunidade: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          datasul_custo: number | null
          datasul_dep_exp: number | null
          datasul_divisao: number | null
          datasul_lote_mulven: number | null
          datasul_vl_merc_liq: number | null
          datasul_vl_tot_item: number | null
          descricao: string | null
          id: string
          nome_produto: string | null
          oportunidade_id: string | null
          ordem_linha: number | null
          percentual_desconto: number | null
          preco_total: number | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          valor_desconto: number | null
          valor_imposto: number | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          datasul_custo?: number | null
          datasul_dep_exp?: number | null
          datasul_divisao?: number | null
          datasul_lote_mulven?: number | null
          datasul_vl_merc_liq?: number | null
          datasul_vl_tot_item?: number | null
          descricao?: string | null
          id?: string
          nome_produto?: string | null
          oportunidade_id?: string | null
          ordem_linha?: number | null
          percentual_desconto?: number | null
          preco_total?: number | null
          preco_unitario: number
          produto_id?: string | null
          quantidade?: number
          valor_desconto?: number | null
          valor_imposto?: number | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          datasul_custo?: number | null
          datasul_dep_exp?: number | null
          datasul_divisao?: number | null
          datasul_lote_mulven?: number | null
          datasul_vl_merc_liq?: number | null
          datasul_vl_tot_item?: number | null
          descricao?: string | null
          id?: string
          nome_produto?: string | null
          oportunidade_id?: string | null
          ordem_linha?: number | null
          percentual_desconto?: number | null
          preco_total?: number | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          valor_desconto?: number | null
          valor_imposto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_linha_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_linha_oportunidade_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_linha_oportunidade_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_recalculo_oportunidade: {
        Row: {
          criado_em: string | null
          descricao: string | null
          erro: string | null
          id: string
          oportunidade_id: string
          processado_em: string | null
          regra: string | null
          status: string | null
          tentativas: number | null
          tipo_job: string | null
        }
        Insert: {
          criado_em?: string | null
          descricao?: string | null
          erro?: string | null
          id?: string
          oportunidade_id: string
          processado_em?: string | null
          regra?: string | null
          status?: string | null
          tentativas?: number | null
          tipo_job?: string | null
        }
        Update: {
          criado_em?: string | null
          descricao?: string | null
          erro?: string | null
          id?: string
          oportunidade_id?: string
          processado_em?: string | null
          regra?: string | null
          status?: string | null
          tentativas?: number | null
          tipo_job?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_recalculo_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          detalhes: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          detalhes?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          detalhes?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      membros_equipe: {
        Row: {
          carga_trabalho: number | null
          entrou_em: string | null
          equipe_id: string
          esta_ativo: boolean | null
          motivo_saida: string | null
          nivel_acesso: string | null
          observacoes: string | null
          papel: string | null
          saiu_em: string | null
          usuario_id: string
        }
        Insert: {
          carga_trabalho?: number | null
          entrou_em?: string | null
          equipe_id: string
          esta_ativo?: boolean | null
          motivo_saida?: string | null
          nivel_acesso?: string | null
          observacoes?: string | null
          papel?: string | null
          saiu_em?: string | null
          usuario_id: string
        }
        Update: {
          carga_trabalho?: number | null
          entrou_em?: string | null
          equipe_id?: string
          esta_ativo?: boolean | null
          motivo_saida?: string | null
          nivel_acesso?: string | null
          observacoes?: string | null
          papel?: string | null
          saiu_em?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      metas_equipe: {
        Row: {
          alerta_percentual: number | null
          atualizado_em: string | null
          cancelado_em: string | null
          concluido_em: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          equipe_id: string
          id: string
          metrica: string
          motivo_cancelamento: string | null
          nome: string
          periodo_fim: string
          periodo_inicio: string
          prioridade: string | null
          status: string | null
          tipo_meta: string
          unidade_medida: string | null
          valor_atual: number | null
          valor_objetivo: number
        }
        Insert: {
          alerta_percentual?: number | null
          atualizado_em?: string | null
          cancelado_em?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          equipe_id: string
          id?: string
          metrica: string
          motivo_cancelamento?: string | null
          nome: string
          periodo_fim: string
          periodo_inicio: string
          prioridade?: string | null
          status?: string | null
          tipo_meta: string
          unidade_medida?: string | null
          valor_atual?: number | null
          valor_objetivo: number
        }
        Update: {
          alerta_percentual?: number | null
          atualizado_em?: string | null
          cancelado_em?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          equipe_id?: string
          id?: string
          metrica?: string
          motivo_cancelamento?: string | null
          nome?: string
          periodo_fim?: string
          periodo_inicio?: string
          prioridade?: string | null
          status?: string | null
          tipo_meta?: string
          unidade_medida?: string | null
          valor_atual?: number | null
          valor_objetivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "metas_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "metas_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      metas_vendedor: {
        Row: {
          atualizado_em: string | null
          conversao_atual: number | null
          criado_em: string | null
          criado_por: string | null
          equipe_id: string | null
          id: string
          margem_atual: number | null
          meta_conversao: number | null
          meta_margem: number | null
          meta_unidades: number | null
          meta_valor: number
          periodo_fim: string
          periodo_inicio: string
          status: string | null
          unidades_atual: number | null
          valor_atual: number | null
          vendedor_id: string
        }
        Insert: {
          atualizado_em?: string | null
          conversao_atual?: number | null
          criado_em?: string | null
          criado_por?: string | null
          equipe_id?: string | null
          id?: string
          margem_atual?: number | null
          meta_conversao?: number | null
          meta_margem?: number | null
          meta_unidades?: number | null
          meta_valor?: number
          periodo_fim: string
          periodo_inicio: string
          status?: string | null
          unidades_atual?: number | null
          valor_atual?: number | null
          vendedor_id: string
        }
        Update: {
          atualizado_em?: string | null
          conversao_atual?: number | null
          criado_em?: string | null
          criado_por?: string | null
          equipe_id?: string | null
          id?: string
          margem_atual?: number | null
          meta_conversao?: number | null
          meta_margem?: number | null
          meta_unidades?: number | null
          meta_valor?: number
          periodo_fim?: string
          periodo_inicio?: string
          status?: string | null
          unidades_atual?: number | null
          valor_atual?: number | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_vendedor_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "metas_vendedor_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      nba_historico: {
        Row: {
          aceita: boolean | null
          atividade_origem_id: string | null
          atividade_sugerida_id: string | null
          confianca: number | null
          criado_em: string | null
          id: string
          motivo_rejeicao: string | null
          regra_id: string | null
          respondido_em: string | null
          sugestao_descricao: string | null
          sugestao_tipo: Database["public"]["Enums"]["tipo_atividade"]
          sugestao_titulo: string | null
          usuario_id: string | null
        }
        Insert: {
          aceita?: boolean | null
          atividade_origem_id?: string | null
          atividade_sugerida_id?: string | null
          confianca?: number | null
          criado_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          regra_id?: string | null
          respondido_em?: string | null
          sugestao_descricao?: string | null
          sugestao_tipo: Database["public"]["Enums"]["tipo_atividade"]
          sugestao_titulo?: string | null
          usuario_id?: string | null
        }
        Update: {
          aceita?: boolean | null
          atividade_origem_id?: string | null
          atividade_sugerida_id?: string | null
          confianca?: number | null
          criado_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          regra_id?: string | null
          respondido_em?: string | null
          sugestao_descricao?: string | null
          sugestao_tipo?: Database["public"]["Enums"]["tipo_atividade"]
          sugestao_titulo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nba_historico_atividade_origem_id_fkey"
            columns: ["atividade_origem_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nba_historico_atividade_origem_id_fkey"
            columns: ["atividade_origem_id"]
            isOneToOne: false
            referencedRelation: "mv_atividades_prioridade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nba_historico_atividade_sugerida_id_fkey"
            columns: ["atividade_sugerida_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nba_historico_atividade_sugerida_id_fkey"
            columns: ["atividade_sugerida_id"]
            isOneToOne: false
            referencedRelation: "mv_atividades_prioridade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nba_historico_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "nba_regras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nba_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "nba_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nba_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "nba_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      nba_regras: {
        Row: {
          acao_descricao_template: string | null
          acao_prazo_dias: number | null
          acao_prioridade:
            | Database["public"]["Enums"]["prioridade_atividade"]
            | null
          acao_tipo: Database["public"]["Enums"]["tipo_atividade"]
          acao_titulo_template: string | null
          ativo: boolean | null
          atualizado_em: string | null
          condicao_codigo_disposicao: string | null
          condicao_dias_sem_contato: number | null
          condicao_etapa_pipeline: string | null
          condicao_sentimento:
            | Database["public"]["Enums"]["sentimento_tipo"]
            | null
          condicao_tipo_atividade:
            | Database["public"]["Enums"]["tipo_atividade"]
            | null
          condicao_valor_minimo: number | null
          condicoes_extras: Json | null
          confianca: number | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          suporte: number | null
          vezes_aceita: number | null
          vezes_sugerida: number | null
        }
        Insert: {
          acao_descricao_template?: string | null
          acao_prazo_dias?: number | null
          acao_prioridade?:
            | Database["public"]["Enums"]["prioridade_atividade"]
            | null
          acao_tipo: Database["public"]["Enums"]["tipo_atividade"]
          acao_titulo_template?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          condicao_codigo_disposicao?: string | null
          condicao_dias_sem_contato?: number | null
          condicao_etapa_pipeline?: string | null
          condicao_sentimento?:
            | Database["public"]["Enums"]["sentimento_tipo"]
            | null
          condicao_tipo_atividade?:
            | Database["public"]["Enums"]["tipo_atividade"]
            | null
          condicao_valor_minimo?: number | null
          condicoes_extras?: Json | null
          confianca?: number | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          suporte?: number | null
          vezes_aceita?: number | null
          vezes_sugerida?: number | null
        }
        Update: {
          acao_descricao_template?: string | null
          acao_prazo_dias?: number | null
          acao_prioridade?:
            | Database["public"]["Enums"]["prioridade_atividade"]
            | null
          acao_tipo?: Database["public"]["Enums"]["tipo_atividade"]
          acao_titulo_template?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          condicao_codigo_disposicao?: string | null
          condicao_dias_sem_contato?: number | null
          condicao_etapa_pipeline?: string | null
          condicao_sentimento?:
            | Database["public"]["Enums"]["sentimento_tipo"]
            | null
          condicao_tipo_atividade?:
            | Database["public"]["Enums"]["tipo_atividade"]
            | null
          condicao_valor_minimo?: number | null
          condicoes_extras?: Json | null
          confianca?: number | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          suporte?: number | null
          vezes_aceita?: number | null
          vezes_sugerida?: number | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          criada_em: string | null
          descricao: string
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          lida: boolean | null
          lida_em: string | null
          metadata: Json | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          criada_em?: string | null
          descricao: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          metadata?: Json | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        Update: {
          criada_em?: string | null
          descricao?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          metadata?: Json | null
          tipo?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      oportunidades: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          campos_customizados: Json | null
          cliente_cnpj: string | null
          cliente_id: string | null
          cliente_nome: string | null
          codigo: string | null
          concorrentes: string | null
          conta_id: string | null
          contato_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_entrada_estagio: string | null
          data_fechamento: string | null
          descricao: string | null
          dias_no_estagio: number | null
          equipe_id: string | null
          esta_fechada: boolean | null
          estagio_id: string | null
          excluido_em: string | null
          fechada_em: string | null
          foi_ganha: boolean | null
          id: string
          motivo_perda: string | null
          nome_oportunidade: string
          origem_lead: string | null
          percentual_probabilidade: number | null
          pipeline_id: string | null
          proprietario_id: string | null
          proximo_passo: string | null
          receita_esperada: number | null
          tipo: string | null
          ultima_mudanca_estagio_em: string | null
          validade_proposta: string | null
          valor: number | null
          venda_id: string | null
          vendedor_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          campos_customizados?: Json | null
          cliente_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          codigo?: string | null
          concorrentes?: string | null
          conta_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_entrada_estagio?: string | null
          data_fechamento?: string | null
          descricao?: string | null
          dias_no_estagio?: number | null
          equipe_id?: string | null
          esta_fechada?: boolean | null
          estagio_id?: string | null
          excluido_em?: string | null
          fechada_em?: string | null
          foi_ganha?: boolean | null
          id?: string
          motivo_perda?: string | null
          nome_oportunidade: string
          origem_lead?: string | null
          percentual_probabilidade?: number | null
          pipeline_id?: string | null
          proprietario_id?: string | null
          proximo_passo?: string | null
          receita_esperada?: number | null
          tipo?: string | null
          ultima_mudanca_estagio_em?: string | null
          validade_proposta?: string | null
          valor?: number | null
          venda_id?: string | null
          vendedor_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          campos_customizados?: Json | null
          cliente_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          codigo?: string | null
          concorrentes?: string | null
          conta_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_entrada_estagio?: string | null
          data_fechamento?: string | null
          descricao?: string | null
          dias_no_estagio?: number | null
          equipe_id?: string | null
          esta_fechada?: boolean | null
          estagio_id?: string | null
          excluido_em?: string | null
          fechada_em?: string | null
          foi_ganha?: boolean | null
          id?: string
          motivo_perda?: string | null
          nome_oportunidade?: string
          origem_lead?: string | null
          percentual_probabilidade?: number | null
          pipeline_id?: string | null
          proprietario_id?: string | null
          proximo_passo?: string | null
          receita_esperada?: number | null
          tipo?: string | null
          ultima_mudanca_estagio_em?: string | null
          validade_proposta?: string | null
          valor?: number | null
          venda_id?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "oportunidades_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "oportunidades_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "oportunidades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "oportunidades_estagio_id_fkey"
            columns: ["estagio_id"]
            isOneToOne: false
            referencedRelation: "estagios_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          descricao: string | null
          eh_perfil_sistema: boolean | null
          excluido_em: string | null
          id: string
          nome: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          eh_perfil_sistema?: boolean | null
          excluido_em?: string | null
          id?: string
          nome: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          eh_perfil_sistema?: boolean | null
          excluido_em?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      perfis_permissoes: {
        Row: {
          perfil_id: string
          permissao_id: string
        }
        Insert: {
          perfil_id: string
          permissao_id: string
        }
        Update: {
          perfil_id?: string
          permissao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_permissoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_permissoes_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_sociais: {
        Row: {
          atualizado_em: string | null
          conta_id: string | null
          contato_id: string | null
          criado_em: string | null
          id: string
          nome_usuario: string | null
          numero_seguidores: number | null
          plataforma: string
          ultima_sincronizacao_em: string | null
          url_perfil: string | null
        }
        Insert: {
          atualizado_em?: string | null
          conta_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          id?: string
          nome_usuario?: string | null
          numero_seguidores?: number | null
          plataforma: string
          ultima_sincronizacao_em?: string | null
          url_perfil?: string | null
        }
        Update: {
          atualizado_em?: string | null
          conta_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          id?: string
          nome_usuario?: string | null
          numero_seguidores?: number | null
          plataforma?: string
          ultima_sincronizacao_em?: string | null
          url_perfil?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_sociais_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_sociais_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "perfis_sociais_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_usuario: {
        Row: {
          atendimentos_ativos_whatsapp: number | null
          atualizado_em: string | null
          cargo: string | null
          celular: string | null
          codigo_vendedor: string | null
          criado_em: string | null
          departamento: string | null
          empresa_id: string | null
          esta_ativo: boolean | null
          esta_disponivel: boolean | null
          filas_atendimento_ids: string[] | null
          foto_perfil_url: string | null
          fuso_horario: string | null
          gerente_id: string | null
          horario_trabalho_fim: string | null
          horario_trabalho_inicio: string | null
          id: string
          idioma: string | null
          max_atendimentos_whatsapp: number | null
          max_conversas_simultaneas: number | null
          motivo_pausa: string | null
          nome_completo: string | null
          numero_celular: string | null
          pausa_iniciada_em: string | null
          perfil_id: string | null
          primeiro_nome: string | null
          ramal: string | null
          sobrenome: string | null
          status_atendimento: string
          status_atendimento_whatsapp: string | null
          telefone: string | null
          tempo_medio_atendimento_dia: number | null
          total_atendimentos_dia: number | null
          ultimo_atendimento_whatsapp_em: string | null
          ultimo_login_em: string | null
          unidades_atendimento_ids: string[] | null
          url_avatar: string | null
        }
        Insert: {
          atendimentos_ativos_whatsapp?: number | null
          atualizado_em?: string | null
          cargo?: string | null
          celular?: string | null
          codigo_vendedor?: string | null
          criado_em?: string | null
          departamento?: string | null
          empresa_id?: string | null
          esta_ativo?: boolean | null
          esta_disponivel?: boolean | null
          filas_atendimento_ids?: string[] | null
          foto_perfil_url?: string | null
          fuso_horario?: string | null
          gerente_id?: string | null
          horario_trabalho_fim?: string | null
          horario_trabalho_inicio?: string | null
          id: string
          idioma?: string | null
          max_atendimentos_whatsapp?: number | null
          max_conversas_simultaneas?: number | null
          motivo_pausa?: string | null
          nome_completo?: string | null
          numero_celular?: string | null
          pausa_iniciada_em?: string | null
          perfil_id?: string | null
          primeiro_nome?: string | null
          ramal?: string | null
          sobrenome?: string | null
          status_atendimento?: string
          status_atendimento_whatsapp?: string | null
          telefone?: string | null
          tempo_medio_atendimento_dia?: number | null
          total_atendimentos_dia?: number | null
          ultimo_atendimento_whatsapp_em?: string | null
          ultimo_login_em?: string | null
          unidades_atendimento_ids?: string[] | null
          url_avatar?: string | null
        }
        Update: {
          atendimentos_ativos_whatsapp?: number | null
          atualizado_em?: string | null
          cargo?: string | null
          celular?: string | null
          codigo_vendedor?: string | null
          criado_em?: string | null
          departamento?: string | null
          empresa_id?: string | null
          esta_ativo?: boolean | null
          esta_disponivel?: boolean | null
          filas_atendimento_ids?: string[] | null
          foto_perfil_url?: string | null
          fuso_horario?: string | null
          gerente_id?: string | null
          horario_trabalho_fim?: string | null
          horario_trabalho_inicio?: string | null
          id?: string
          idioma?: string | null
          max_atendimentos_whatsapp?: number | null
          max_conversas_simultaneas?: number | null
          motivo_pausa?: string | null
          nome_completo?: string | null
          numero_celular?: string | null
          pausa_iniciada_em?: string | null
          perfil_id?: string | null
          primeiro_nome?: string | null
          ramal?: string | null
          sobrenome?: string | null
          status_atendimento?: string
          status_atendimento_whatsapp?: string | null
          telefone?: string | null
          tempo_medio_atendimento_dia?: number | null
          total_atendimentos_dia?: number | null
          ultimo_atendimento_whatsapp_em?: string | null
          ultimo_login_em?: string | null
          unidades_atendimento_ids?: string[] | null
          url_avatar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_usuario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_usuario_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          acao: string
          descricao: string | null
          id: string
          modulo: string
        }
        Insert: {
          acao: string
          descricao?: string | null
          id?: string
          modulo: string
        }
        Update: {
          acao?: string
          descricao?: string | null
          id?: string
          modulo?: string
        }
        Relationships: []
      }
      pipeline_custom_fields: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          dica: string | null
          estagio_id: string | null
          grupo: string | null
          id: string
          label: string
          largura: string | null
          nome_campo: string
          obrigatorio: boolean | null
          opcoes: Json | null
          ordem: number | null
          pipeline_id: string
          placeholder: string | null
          tipo_campo: Database["public"]["Enums"]["custom_field_tipo"]
          validacao: Json | null
          valor_padrao: Json | null
          visivel_formulario: boolean | null
          visivel_kanban: boolean | null
          visivel_lista: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          dica?: string | null
          estagio_id?: string | null
          grupo?: string | null
          id?: string
          label: string
          largura?: string | null
          nome_campo: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          pipeline_id: string
          placeholder?: string | null
          tipo_campo?: Database["public"]["Enums"]["custom_field_tipo"]
          validacao?: Json | null
          valor_padrao?: Json | null
          visivel_formulario?: boolean | null
          visivel_kanban?: boolean | null
          visivel_lista?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          dica?: string | null
          estagio_id?: string | null
          grupo?: string | null
          id?: string
          label?: string
          largura?: string | null
          nome_campo?: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          pipeline_id?: string
          placeholder?: string | null
          tipo_campo?: Database["public"]["Enums"]["custom_field_tipo"]
          validacao?: Json | null
          valor_padrao?: Json | null
          visivel_formulario?: boolean | null
          visivel_kanban?: boolean | null
          visivel_lista?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_custom_fields_estagio_id_fkey"
            columns: ["estagio_id"]
            isOneToOne: false
            referencedRelation: "estagios_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_custom_fields_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          atualizado_em: string | null
          configuracoes: Json | null
          cor: string | null
          criado_em: string | null
          descricao: string | null
          esta_ativo: boolean | null
          excluido_em: string | null
          icone: string | null
          id: string
          nome: string
          ordem_exibicao: number | null
          tipo_pipeline: string | null
        }
        Insert: {
          atualizado_em?: string | null
          configuracoes?: Json | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          esta_ativo?: boolean | null
          excluido_em?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem_exibicao?: number | null
          tipo_pipeline?: string | null
        }
        Update: {
          atualizado_em?: string | null
          configuracoes?: Json | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          esta_ativo?: boolean | null
          excluido_em?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem_exibicao?: number | null
          tipo_pipeline?: string | null
        }
        Relationships: []
      }
      plataformas_edi: {
        Row: {
          ambiente: string | null
          ativo: boolean | null
          atualizado_em: string | null
          configuracoes: Json
          criado_em: string | null
          criado_por: string | null
          formato_dados: string | null
          id: string
          intervalo_consulta_minutos: number | null
          mapeamento_campos: Json
          nome: string
          slug: string
          tipo_plataforma: string
          total_cotacoes_baixadas: number | null
          total_pedidos_baixados: number | null
          ultima_consulta_em: string | null
        }
        Insert: {
          ambiente?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          configuracoes?: Json
          criado_em?: string | null
          criado_por?: string | null
          formato_dados?: string | null
          id?: string
          intervalo_consulta_minutos?: number | null
          mapeamento_campos?: Json
          nome: string
          slug: string
          tipo_plataforma: string
          total_cotacoes_baixadas?: number | null
          total_pedidos_baixados?: number | null
          ultima_consulta_em?: string | null
        }
        Update: {
          ambiente?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          configuracoes?: Json
          criado_em?: string | null
          criado_por?: string | null
          formato_dados?: string | null
          id?: string
          intervalo_consulta_minutos?: number | null
          mapeamento_campos?: Json
          nome?: string
          slug?: string
          tipo_plataforma?: string
          total_cotacoes_baixadas?: number | null
          total_pedidos_baixados?: number | null
          ultima_consulta_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plataformas_edi_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "plataformas_edi_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plataformas_edi_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "plataformas_edi_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
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
          embedding: string | null
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
          embedding?: string | null
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
          embedding?: string | null
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
      produtos_catalogo: {
        Row: {
          atualizado_em: string | null
          categoria: string | null
          codigo_produto: string | null
          criado_em: string | null
          descricao: string | null
          eh_recorrente: boolean | null
          esta_ativo: boolean | null
          excluido_em: string | null
          familia_produto: string | null
          fornecedor: string | null
          frequencia_cobranca: string | null
          id: string
          nivel_reposicao: number | null
          nome_produto: string
          preco_custo: number | null
          preco_unitario: number | null
          quantidade_disponivel: number | null
          sku: string | null
          taxa_imposto: number | null
        }
        Insert: {
          atualizado_em?: string | null
          categoria?: string | null
          codigo_produto?: string | null
          criado_em?: string | null
          descricao?: string | null
          eh_recorrente?: boolean | null
          esta_ativo?: boolean | null
          excluido_em?: string | null
          familia_produto?: string | null
          fornecedor?: string | null
          frequencia_cobranca?: string | null
          id?: string
          nivel_reposicao?: number | null
          nome_produto: string
          preco_custo?: number | null
          preco_unitario?: number | null
          quantidade_disponivel?: number | null
          sku?: string | null
          taxa_imposto?: number | null
        }
        Update: {
          atualizado_em?: string | null
          categoria?: string | null
          codigo_produto?: string | null
          criado_em?: string | null
          descricao?: string | null
          eh_recorrente?: boolean | null
          esta_ativo?: boolean | null
          excluido_em?: string | null
          familia_produto?: string | null
          fornecedor?: string | null
          frequencia_cobranca?: string | null
          id?: string
          nivel_reposicao?: number | null
          nome_produto?: string
          preco_custo?: number | null
          preco_unitario?: number | null
          quantidade_disponivel?: number | null
          sku?: string | null
          taxa_imposto?: number | null
        }
        Relationships: []
      }
      produtos_score_ajuste: {
        Row: {
          atualizado_em: string | null
          id: string
          produto_id: string
          score_ml: number | null
          taxa_conversao: number | null
          total_feedbacks_negativos: number | null
          total_feedbacks_positivos: number | null
          total_vezes_comprado: number | null
          total_vezes_sugerido: number | null
        }
        Insert: {
          atualizado_em?: string | null
          id?: string
          produto_id: string
          score_ml?: number | null
          taxa_conversao?: number | null
          total_feedbacks_negativos?: number | null
          total_feedbacks_positivos?: number | null
          total_vezes_comprado?: number | null
          total_vezes_sugerido?: number | null
        }
        Update: {
          atualizado_em?: string | null
          id?: string
          produto_id?: string
          score_ml?: number | null
          taxa_conversao?: number | null
          total_feedbacks_negativos?: number | null
          total_feedbacks_positivos?: number | null
          total_vezes_comprado?: number | null
          total_vezes_sugerido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_score_ajuste_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_score_ajuste_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          nome_completo: string | null
          preferencias: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nome?: string | null
          nome_completo?: string | null
          preferencias?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          nome_completo?: string | null
          preferencias?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      progresso_metas: {
        Row: {
          diferenca: number | null
          id: string
          meta_id: string
          observacao: string | null
          origem: string | null
          percentual_conclusao: number | null
          referencia_id: string | null
          registrado_em: string | null
          registrado_por: string | null
          valor_anterior: number
          valor_novo: number
        }
        Insert: {
          diferenca?: number | null
          id?: string
          meta_id: string
          observacao?: string | null
          origem?: string | null
          percentual_conclusao?: number | null
          referencia_id?: string | null
          registrado_em?: string | null
          registrado_por?: string | null
          valor_anterior: number
          valor_novo: number
        }
        Update: {
          diferenca?: number | null
          id?: string
          meta_id?: string
          observacao?: string | null
          origem?: string | null
          percentual_conclusao?: number | null
          referencia_id?: string | null
          registrado_em?: string | null
          registrado_por?: string | null
          valor_anterior?: number
          valor_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "progresso_metas_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_metas_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "vw_metas_com_progresso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_metas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "progresso_metas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_metas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "progresso_metas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      progresso_metas_vendedor: {
        Row: {
          diferenca: number | null
          id: string
          meta_id: string
          observacao: string | null
          origem: string | null
          percentual_conclusao: number | null
          referencia_id: string | null
          registrado_em: string | null
          registrado_por: string | null
          valor_anterior: number
          valor_novo: number
        }
        Insert: {
          diferenca?: number | null
          id?: string
          meta_id: string
          observacao?: string | null
          origem?: string | null
          percentual_conclusao?: number | null
          referencia_id?: string | null
          registrado_em?: string | null
          registrado_por?: string | null
          valor_anterior: number
          valor_novo: number
        }
        Update: {
          diferenca?: number | null
          id?: string
          meta_id?: string
          observacao?: string | null
          origem?: string | null
          percentual_conclusao?: number | null
          referencia_id?: string | null
          registrado_em?: string | null
          registrado_por?: string | null
          valor_anterior?: number
          valor_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "progresso_metas_vendedor_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_vendedor"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_analytics: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          cidade: string | null
          device_type: string | null
          estado: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          ip_hash: string | null
          oportunidade_id: string | null
          os_name: string | null
          os_version: string | null
          pais: string | null
          proposta_token_id: string
          screen_height: number | null
          screen_width: number | null
          scroll_max_percent: number | null
          session_id: string
          tempo_total_segundos: number | null
          ultima_atividade_em: string | null
          venda_id: string | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          cidade?: string | null
          device_type?: string | null
          estado?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          ip_hash?: string | null
          oportunidade_id?: string | null
          os_name?: string | null
          os_version?: string | null
          pais?: string | null
          proposta_token_id: string
          screen_height?: number | null
          screen_width?: number | null
          scroll_max_percent?: number | null
          session_id: string
          tempo_total_segundos?: number | null
          ultima_atividade_em?: string | null
          venda_id?: string | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          cidade?: string | null
          device_type?: string | null
          estado?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          ip_hash?: string | null
          oportunidade_id?: string | null
          os_name?: string | null
          os_version?: string | null
          pais?: string | null
          proposta_token_id?: string
          screen_height?: number | null
          screen_width?: number | null
          scroll_max_percent?: number | null
          session_id?: string
          tempo_total_segundos?: number | null
          ultima_atividade_em?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_analytics_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_analytics_proposta_token_id_fkey"
            columns: ["proposta_token_id"]
            isOneToOne: false
            referencedRelation: "propostas_publicas_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_analytics_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_analytics_cliques: {
        Row: {
          analytics_id: string
          clicado_em: string | null
          elemento_id: string | null
          elemento_texto: string | null
          id: string
          scroll_position: number | null
          secao_atual: string | null
          tipo_acao: string
          venda_id: string | null
        }
        Insert: {
          analytics_id: string
          clicado_em?: string | null
          elemento_id?: string | null
          elemento_texto?: string | null
          id?: string
          scroll_position?: number | null
          secao_atual?: string | null
          tipo_acao: string
          venda_id?: string | null
        }
        Update: {
          analytics_id?: string
          clicado_em?: string | null
          elemento_id?: string | null
          elemento_texto?: string | null
          id?: string
          scroll_position?: number | null
          secao_atual?: string | null
          tipo_acao?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_analytics_cliques_analytics_id_fkey"
            columns: ["analytics_id"]
            isOneToOne: false
            referencedRelation: "propostas_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_analytics_cliques_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_analytics_secoes: {
        Row: {
          analytics_id: string
          id: string
          primeira_visualizacao_em: string | null
          secao_id: string
          secao_nome: string | null
          tempo_visivel_segundos: number | null
          ultima_visualizacao_em: string | null
          vezes_visualizada: number | null
        }
        Insert: {
          analytics_id: string
          id?: string
          primeira_visualizacao_em?: string | null
          secao_id: string
          secao_nome?: string | null
          tempo_visivel_segundos?: number | null
          ultima_visualizacao_em?: string | null
          vezes_visualizada?: number | null
        }
        Update: {
          analytics_id?: string
          id?: string
          primeira_visualizacao_em?: string | null
          secao_id?: string
          secao_nome?: string | null
          tempo_visivel_segundos?: number | null
          ultima_visualizacao_em?: string | null
          vezes_visualizada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_analytics_secoes_analytics_id_fkey"
            columns: ["analytics_id"]
            isOneToOne: false
            referencedRelation: "propostas_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_publicas_tokens: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          expira_em: string | null
          id: string
          mensagem_personalizada: string | null
          mostrar_descontos: boolean | null
          mostrar_precos: boolean | null
          oportunidade_id: string | null
          permitir_aceitar: boolean | null
          permitir_download_pdf: boolean | null
          permitir_recusar: boolean | null
          public_token: string
          senha_hash: string | null
          venda_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          expira_em?: string | null
          id?: string
          mensagem_personalizada?: string | null
          mostrar_descontos?: boolean | null
          mostrar_precos?: boolean | null
          oportunidade_id?: string | null
          permitir_aceitar?: boolean | null
          permitir_download_pdf?: boolean | null
          permitir_recusar?: boolean | null
          public_token: string
          senha_hash?: string | null
          venda_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          expira_em?: string | null
          id?: string
          mensagem_personalizada?: string | null
          mostrar_descontos?: boolean | null
          mostrar_precos?: boolean | null
          oportunidade_id?: string | null
          permitir_aceitar?: boolean | null
          permitir_download_pdf?: boolean | null
          permitir_recusar?: boolean | null
          public_token?: string
          senha_hash?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_publicas_tokens_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "propostas_publicas_tokens_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_publicas_tokens_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "propostas_publicas_tokens_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "propostas_publicas_tokens_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_publicas_tokens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_respostas: {
        Row: {
          analytics_id: string | null
          cargo_respondente: string | null
          comentario: string | null
          email_respondente: string | null
          id: string
          ip_assinatura: string | null
          motivo_recusa: string | null
          nome_respondente: string | null
          oportunidade_id: string | null
          proposta_token_id: string
          respondido_em: string | null
          telefone_respondente: string | null
          tipo_resposta: string
          user_agent_assinatura: string | null
          venda_id: string | null
        }
        Insert: {
          analytics_id?: string | null
          cargo_respondente?: string | null
          comentario?: string | null
          email_respondente?: string | null
          id?: string
          ip_assinatura?: string | null
          motivo_recusa?: string | null
          nome_respondente?: string | null
          oportunidade_id?: string | null
          proposta_token_id: string
          respondido_em?: string | null
          telefone_respondente?: string | null
          tipo_resposta: string
          user_agent_assinatura?: string | null
          venda_id?: string | null
        }
        Update: {
          analytics_id?: string | null
          cargo_respondente?: string | null
          comentario?: string | null
          email_respondente?: string | null
          id?: string
          ip_assinatura?: string | null
          motivo_recusa?: string | null
          nome_respondente?: string | null
          oportunidade_id?: string | null
          proposta_token_id?: string
          respondido_em?: string | null
          telefone_respondente?: string | null
          tipo_resposta?: string
          user_agent_assinatura?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_respostas_analytics_id_fkey"
            columns: ["analytics_id"]
            isOneToOne: false
            referencedRelation: "propostas_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_respostas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_respostas_proposta_token_id_fkey"
            columns: ["proposta_token_id"]
            isOneToOne: false
            referencedRelation: "propostas_publicas_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_respostas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      role_hierarquia: {
        Row: {
          criado_em: string | null
          descricao: string | null
          id: string
          nivel: number
          pode_acessar_menu_tecnico: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nivel: number
          pode_acessar_menu_tecnico?: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nivel?: number
          pode_acessar_menu_tecnico?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      solicitacoes_cadastro: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          atualizado_em: string
          cnpj: string
          contatos: Json | null
          criado_em: string
          criado_por: string | null
          dados_coletados: Json | null
          excluido_em: string | null
          id: string
          motivo_rejeicao: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["status_solicitacao_cadastro"]
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string
          cnpj: string
          contatos?: Json | null
          criado_em?: string
          criado_por?: string | null
          dados_coletados?: Json | null
          excluido_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao_cadastro"]
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string
          cnpj?: string
          contatos?: Json | null
          criado_em?: string
          criado_por?: string | null
          dados_coletados?: Json | null
          excluido_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao_cadastro"]
        }
        Relationships: []
      }
      tags: {
        Row: {
          categoria: string | null
          cor: string | null
          criado_em: string | null
          id: string
          nome: string
        }
        Insert: {
          categoria?: string | null
          cor?: string | null
          criado_em?: string | null
          id?: string
          nome: string
        }
        Update: {
          categoria?: string | null
          cor?: string | null
          criado_em?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          aberto_por: string | null
          anexos: Json | null
          atribuido_em: string | null
          atribuido_para: string | null
          avaliacao: number | null
          avaliado_em: string | null
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string | null
          comentario_avaliacao: string | null
          created_at: string
          data_abertura: string
          descricao: string
          esta_pausado: boolean | null
          fechado_em: string | null
          fila_id: string | null
          id: string
          motivo_pausa: string | null
          numero_ticket: string
          pausado_em: string | null
          prazo_resolucao: string | null
          prazo_resposta: string | null
          prioridade: Database["public"]["Enums"]["prioridade_ticket"]
          produto_id: string | null
          resolvido_em: string | null
          status: Database["public"]["Enums"]["status_ticket"]
          tags: string[] | null
          tempo_pausado_horas: number | null
          tempo_primeira_resposta_horas: number | null
          tempo_resolucao_horas: number | null
          tipo: Database["public"]["Enums"]["tipo_ticket"]
          titulo: string
          total_interacoes: number | null
          updated_at: string
          venda_id: string | null
        }
        Insert: {
          aberto_por?: string | null
          anexos?: Json | null
          atribuido_em?: string | null
          atribuido_para?: string | null
          avaliacao?: number | null
          avaliado_em?: string | null
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          comentario_avaliacao?: string | null
          created_at?: string
          data_abertura?: string
          descricao: string
          esta_pausado?: boolean | null
          fechado_em?: string | null
          fila_id?: string | null
          id?: string
          motivo_pausa?: string | null
          numero_ticket: string
          pausado_em?: string | null
          prazo_resolucao?: string | null
          prazo_resposta?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_ticket"]
          produto_id?: string | null
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["status_ticket"]
          tags?: string[] | null
          tempo_pausado_horas?: number | null
          tempo_primeira_resposta_horas?: number | null
          tempo_resolucao_horas?: number | null
          tipo?: Database["public"]["Enums"]["tipo_ticket"]
          titulo: string
          total_interacoes?: number | null
          updated_at?: string
          venda_id?: string | null
        }
        Update: {
          aberto_por?: string | null
          anexos?: Json | null
          atribuido_em?: string | null
          atribuido_para?: string | null
          avaliacao?: number | null
          avaliado_em?: string | null
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          comentario_avaliacao?: string | null
          created_at?: string
          data_abertura?: string
          descricao?: string
          esta_pausado?: boolean | null
          fechado_em?: string | null
          fila_id?: string | null
          id?: string
          motivo_pausa?: string | null
          numero_ticket?: string
          pausado_em?: string | null
          prazo_resolucao?: string | null
          prazo_resposta?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_ticket"]
          produto_id?: string | null
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["status_ticket"]
          tags?: string[] | null
          tempo_pausado_horas?: number | null
          tempo_primeira_resposta_horas?: number | null
          tempo_resolucao_horas?: number | null
          tipo?: Database["public"]["Enums"]["tipo_ticket"]
          titulo?: string
          total_interacoes?: number | null
          updated_at?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_anexos_chat: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          deletado: boolean | null
          deletado_em: string | null
          id: string
          nome_arquivo: string
          tamanho_bytes: number
          ticket_id: string | null
          tipo_anexo: string | null
          tipo_arquivo: string
          url_arquivo: string
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          deletado?: boolean | null
          deletado_em?: string | null
          id?: string
          nome_arquivo: string
          tamanho_bytes: number
          ticket_id?: string | null
          tipo_anexo?: string | null
          tipo_arquivo: string
          url_arquivo: string
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          deletado?: boolean | null
          deletado_em?: string | null
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number
          ticket_id?: string | null
          tipo_anexo?: string | null
          tipo_arquivo?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_anexos_chat_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_interacoes: {
        Row: {
          anexos: Json | null
          created_at: string
          criado_por: string | null
          id: string
          mensagem: string | null
          mensagem_interna: boolean | null
          nome_autor: string | null
          ticket_id: string
          tipo_interacao: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          anexos?: Json | null
          created_at?: string
          criado_por?: string | null
          id?: string
          mensagem?: string | null
          mensagem_interna?: boolean | null
          nome_autor?: string | null
          ticket_id: string
          tipo_interacao: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          anexos?: Json | null
          created_at?: string
          criado_por?: string | null
          id?: string
          mensagem?: string | null
          mensagem_interna?: boolean | null
          nome_autor?: string | null
          ticket_id?: string
          tipo_interacao?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_interacoes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_pausas: {
        Row: {
          created_at: string
          duracao_horas: number | null
          id: string
          motivo: string | null
          pausado_em: string
          pausado_por: string | null
          retomado_em: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          duracao_horas?: number | null
          id?: string
          motivo?: string | null
          pausado_em?: string
          pausado_por?: string | null
          retomado_em?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          duracao_horas?: number | null
          id?: string
          motivo?: string | null
          pausado_em?: string
          pausado_por?: string | null
          retomado_em?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_pausas_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_frete: {
        Row: {
          api_tipo_frete: string | null
          cod_canal_venda: number | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          api_tipo_frete?: string | null
          cod_canal_venda?: number | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          api_tipo_frete?: string | null
          cod_canal_venda?: number | null
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
      ura_audios: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          duracao_segundos: number | null
          formato: string | null
          id: string
          nome: string
          tamanho_kb: number | null
          url_audio: string
          usado_em_uras: number | null
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          duracao_segundos?: number | null
          formato?: string | null
          id?: string
          nome: string
          tamanho_kb?: number | null
          url_audio: string
          usado_em_uras?: number | null
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          duracao_segundos?: number | null
          formato?: string | null
          id?: string
          nome?: string
          tamanho_kb?: number | null
          url_audio?: string
          usado_em_uras?: number | null
        }
        Relationships: []
      }
      ura_horarios: {
        Row: {
          acao_fora_horario: string | null
          ativo: boolean | null
          dia_semana: number
          horario_fim: string
          horario_inicio: string
          id: string
          mensagem_fora_horario: string | null
          ura_id: string
        }
        Insert: {
          acao_fora_horario?: string | null
          ativo?: boolean | null
          dia_semana: number
          horario_fim: string
          horario_inicio: string
          id?: string
          mensagem_fora_horario?: string | null
          ura_id: string
        }
        Update: {
          acao_fora_horario?: string | null
          ativo?: boolean | null
          dia_semana?: number
          horario_fim?: string
          horario_inicio?: string
          id?: string
          mensagem_fora_horario?: string | null
          ura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ura_horarios_ura_id_fkey"
            columns: ["ura_id"]
            isOneToOne: false
            referencedRelation: "uras"
            referencedColumns: ["id"]
          },
        ]
      }
      ura_logs: {
        Row: {
          chamada_id: string | null
          criado_em: string | null
          duracao_total: number | null
          gravacao_url: string | null
          id: string
          metadata: Json | null
          numero_origem: string | null
          opcoes_selecionadas: Json | null
          status_final: string | null
          tentativas_invalidas: number | null
          transferido_para: string | null
          ura_id: string | null
        }
        Insert: {
          chamada_id?: string | null
          criado_em?: string | null
          duracao_total?: number | null
          gravacao_url?: string | null
          id?: string
          metadata?: Json | null
          numero_origem?: string | null
          opcoes_selecionadas?: Json | null
          status_final?: string | null
          tentativas_invalidas?: number | null
          transferido_para?: string | null
          ura_id?: string | null
        }
        Update: {
          chamada_id?: string | null
          criado_em?: string | null
          duracao_total?: number | null
          gravacao_url?: string | null
          id?: string
          metadata?: Json | null
          numero_origem?: string | null
          opcoes_selecionadas?: Json | null
          status_final?: string | null
          tentativas_invalidas?: number | null
          transferido_para?: string | null
          ura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ura_logs_ura_id_fkey"
            columns: ["ura_id"]
            isOneToOne: false
            referencedRelation: "uras"
            referencedColumns: ["id"]
          },
        ]
      }
      ura_opcoes: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          horario_disponivel: Json | null
          id: string
          mensagem_antes_acao: string | null
          numero_destino: string | null
          numero_opcao: number
          ordem: number | null
          ramal_destino: string | null
          tipo_acao: string
          titulo: string
          ura_id: string
          ura_submenu_id: string | null
          url_audio: string | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          horario_disponivel?: Json | null
          id?: string
          mensagem_antes_acao?: string | null
          numero_destino?: string | null
          numero_opcao: number
          ordem?: number | null
          ramal_destino?: string | null
          tipo_acao: string
          titulo: string
          ura_id: string
          ura_submenu_id?: string | null
          url_audio?: string | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          horario_disponivel?: Json | null
          id?: string
          mensagem_antes_acao?: string | null
          numero_destino?: string | null
          numero_opcao?: number
          ordem?: number | null
          ramal_destino?: string | null
          tipo_acao?: string
          titulo?: string
          ura_id?: string
          ura_submenu_id?: string | null
          url_audio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ura_opcoes_ura_id_fkey"
            columns: ["ura_id"]
            isOneToOne: false
            referencedRelation: "uras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ura_opcoes_ura_submenu_id_fkey"
            columns: ["ura_submenu_id"]
            isOneToOne: false
            referencedRelation: "uras"
            referencedColumns: ["id"]
          },
        ]
      }
      uras: {
        Row: {
          acao_apos_max_tentativas: string | null
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          max_tentativas_invalidas: number | null
          mensagem_boas_vindas: string
          nome: string
          numero_telefone: string | null
          opcao_invalida_mensagem: string | null
          ramal_transferencia_padrao: string | null
          tempo_espera_digito: number | null
          tipo_mensagem_boas_vindas: string | null
          url_audio_boas_vindas: string | null
          voz_tts: string | null
        }
        Insert: {
          acao_apos_max_tentativas?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          max_tentativas_invalidas?: number | null
          mensagem_boas_vindas: string
          nome: string
          numero_telefone?: string | null
          opcao_invalida_mensagem?: string | null
          ramal_transferencia_padrao?: string | null
          tempo_espera_digito?: number | null
          tipo_mensagem_boas_vindas?: string | null
          url_audio_boas_vindas?: string | null
          voz_tts?: string | null
        }
        Update: {
          acao_apos_max_tentativas?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          max_tentativas_invalidas?: number | null
          mensagem_boas_vindas?: string
          nome?: string
          numero_telefone?: string | null
          opcao_invalida_mensagem?: string | null
          ramal_transferencia_padrao?: string | null
          tempo_espera_digito?: number | null
          tipo_mensagem_boas_vindas?: string | null
          url_audio_boas_vindas?: string | null
          voz_tts?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          equipe_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          vendedor_vinculado_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipe_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          vendedor_vinculado_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipe_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          vendedor_vinculado_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "user_roles_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      usuario_clientes_vinculo: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          cliente_id: string
          criado_em: string | null
          criado_por: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          tipo_vinculo: string | null
          usuario_id: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cliente_id: string
          criado_em?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          tipo_vinculo?: string | null
          usuario_id: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cliente_id?: string
          criado_em?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          tipo_vinculo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_clientes_vinculo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_clientes_vinculo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      usuario_hierarquia: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          subordinado_id: string
          superior_id: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          subordinado_id: string
          superior_id: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          subordinado_id?: string
          superior_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cliente_cnpj: string | null
          cliente_id: string | null
          cliente_nome: string
          cod_emitente: number | null
          condicao_pagamento_id: string | null
          created_at: string
          data_faturamento_programado: string | null
          data_fechamento_prevista: string | null
          data_venda: string
          datasul_errordescription: string | null
          datasul_errornumber: number | null
          datasul_ind_cre_cli: string | null
          datasul_limite_disponivel: number | null
          datasul_msg_credito: string | null
          desconto: number
          endereco_entrega_id: string | null
          equipe_id: string | null
          etapa_pipeline: Database["public"]["Enums"]["etapa_pipeline"] | null
          faturamento_parcial: Database["public"]["Enums"]["yes_no"] | null
          frete_calculado: boolean | null
          frete_calculado_em: string | null
          frete_valor: number | null
          id: string
          motivo_perda: string | null
          numero_venda: string
          observacoes: string | null
          origem_lead: string | null
          prazo_entrega_dias: number | null
          probabilidade: number | null
          requer_aprovacao: boolean | null
          responsavel_id: string | null
          status: string
          tipo_frete_id: string | null
          tipo_pedido_id: string | null
          transportadora_cod: number | null
          transportadora_nome: string | null
          ultima_integracao_datasul_em: string | null
          ultima_integracao_datasul_requisicao: string | null
          ultima_integracao_datasul_resposta: string | null
          ultima_integracao_datasul_status: string | null
          updated_at: string
          user_id: string
          validade_proposta: string | null
          valor_estimado: number | null
          valor_final: number
          valor_total: number
          vendedor_id: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome: string
          cod_emitente?: number | null
          condicao_pagamento_id?: string | null
          created_at?: string
          data_faturamento_programado?: string | null
          data_fechamento_prevista?: string | null
          data_venda?: string
          datasul_errordescription?: string | null
          datasul_errornumber?: number | null
          datasul_ind_cre_cli?: string | null
          datasul_limite_disponivel?: number | null
          datasul_msg_credito?: string | null
          desconto?: number
          endereco_entrega_id?: string | null
          equipe_id?: string | null
          etapa_pipeline?: Database["public"]["Enums"]["etapa_pipeline"] | null
          faturamento_parcial?: Database["public"]["Enums"]["yes_no"] | null
          frete_calculado?: boolean | null
          frete_calculado_em?: string | null
          frete_valor?: number | null
          id?: string
          motivo_perda?: string | null
          numero_venda: string
          observacoes?: string | null
          origem_lead?: string | null
          prazo_entrega_dias?: number | null
          probabilidade?: number | null
          requer_aprovacao?: boolean | null
          responsavel_id?: string | null
          status?: string
          tipo_frete_id?: string | null
          tipo_pedido_id?: string | null
          transportadora_cod?: number | null
          transportadora_nome?: string | null
          ultima_integracao_datasul_em?: string | null
          ultima_integracao_datasul_requisicao?: string | null
          ultima_integracao_datasul_resposta?: string | null
          ultima_integracao_datasul_status?: string | null
          updated_at?: string
          user_id: string
          validade_proposta?: string | null
          valor_estimado?: number | null
          valor_final?: number
          valor_total?: number
          vendedor_id?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente_cnpj?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          cod_emitente?: number | null
          condicao_pagamento_id?: string | null
          created_at?: string
          data_faturamento_programado?: string | null
          data_fechamento_prevista?: string | null
          data_venda?: string
          datasul_errordescription?: string | null
          datasul_errornumber?: number | null
          datasul_ind_cre_cli?: string | null
          datasul_limite_disponivel?: number | null
          datasul_msg_credito?: string | null
          desconto?: number
          endereco_entrega_id?: string | null
          equipe_id?: string | null
          etapa_pipeline?: Database["public"]["Enums"]["etapa_pipeline"] | null
          faturamento_parcial?: Database["public"]["Enums"]["yes_no"] | null
          frete_calculado?: boolean | null
          frete_calculado_em?: string | null
          frete_valor?: number | null
          id?: string
          motivo_perda?: string | null
          numero_venda?: string
          observacoes?: string | null
          origem_lead?: string | null
          prazo_entrega_dias?: number | null
          probabilidade?: number | null
          requer_aprovacao?: boolean | null
          responsavel_id?: string | null
          status?: string
          tipo_frete_id?: string | null
          tipo_pedido_id?: string | null
          transportadora_cod?: number | null
          transportadora_nome?: string | null
          ultima_integracao_datasul_em?: string | null
          ultima_integracao_datasul_requisicao?: string | null
          ultima_integracao_datasul_resposta?: string | null
          ultima_integracao_datasul_status?: string | null
          updated_at?: string
          user_id?: string
          validade_proposta?: string | null
          valor_estimado?: number | null
          valor_final?: number
          valor_total?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "vendas_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "condicoes_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_endereco_entrega_id_fkey"
            columns: ["endereco_entrega_id"]
            isOneToOne: false
            referencedRelation: "enderecos_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "vendas_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
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
      vendas_entregas: {
        Row: {
          codigo_rastreio: string | null
          created_at: string
          data_entrega: string | null
          data_previsao: string | null
          id: string
          observacoes: string | null
          peso_kg: number | null
          status_entrega: Database["public"]["Enums"]["status_entrega"]
          transportadora_cnpj: string | null
          transportadora_nome: string | null
          updated_at: string
          url_rastreio: string | null
          venda_id: string
          volumes: number | null
        }
        Insert: {
          codigo_rastreio?: string | null
          created_at?: string
          data_entrega?: string | null
          data_previsao?: string | null
          id?: string
          observacoes?: string | null
          peso_kg?: number | null
          status_entrega?: Database["public"]["Enums"]["status_entrega"]
          transportadora_cnpj?: string | null
          transportadora_nome?: string | null
          updated_at?: string
          url_rastreio?: string | null
          venda_id: string
          volumes?: number | null
        }
        Update: {
          codigo_rastreio?: string | null
          created_at?: string
          data_entrega?: string | null
          data_previsao?: string | null
          id?: string
          observacoes?: string | null
          peso_kg?: number | null
          status_entrega?: Database["public"]["Enums"]["status_entrega"]
          transportadora_cnpj?: string | null
          transportadora_nome?: string | null
          updated_at?: string
          url_rastreio?: string | null
          venda_id?: string
          volumes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_entregas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_itens: {
        Row: {
          created_at: string
          datasul_custo: number | null
          datasul_dep_exp: number | null
          datasul_divisao: number | null
          datasul_lote_mulven: number | null
          datasul_vl_merc_liq: number | null
          datasul_vl_tot_item: number | null
          desconto: number
          frete_rateado: number | null
          id: string
          preco_tabela: number | null
          preco_unitario: number
          produto_id: string
          quantidade: number
          sequencia_item: number | null
          valor_total: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          datasul_custo?: number | null
          datasul_dep_exp?: number | null
          datasul_divisao?: number | null
          datasul_lote_mulven?: number | null
          datasul_vl_merc_liq?: number | null
          datasul_vl_tot_item?: number | null
          desconto?: number
          frete_rateado?: number | null
          id?: string
          preco_tabela?: number | null
          preco_unitario: number
          produto_id: string
          quantidade: number
          sequencia_item?: number | null
          valor_total: number
          venda_id: string
        }
        Update: {
          created_at?: string
          datasul_custo?: number | null
          datasul_dep_exp?: number | null
          datasul_divisao?: number | null
          datasul_lote_mulven?: number | null
          datasul_vl_merc_liq?: number | null
          datasul_vl_tot_item?: number | null
          desconto?: number
          frete_rateado?: number | null
          id?: string
          preco_tabela?: number | null
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          sequencia_item?: number | null
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
            foreignKeyName: "vendas_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
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
      vendas_notas_fiscais: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string
          id: string
          natureza_operacao: string | null
          numero_nf: string
          observacoes: string | null
          serie_nf: string | null
          status: Database["public"]["Enums"]["status_nota_fiscal"]
          updated_at: string
          url_danfe: string | null
          url_xml: string | null
          valor_total: number
          venda_id: string
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao: string
          id?: string
          natureza_operacao?: string | null
          numero_nf: string
          observacoes?: string | null
          serie_nf?: string | null
          status?: Database["public"]["Enums"]["status_nota_fiscal"]
          updated_at?: string
          url_danfe?: string | null
          url_xml?: string | null
          valor_total: number
          venda_id: string
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string
          id?: string
          natureza_operacao?: string | null
          numero_nf?: string
          observacoes?: string | null
          serie_nf?: string | null
          status?: Database["public"]["Enums"]["status_nota_fiscal"]
          updated_at?: string
          url_danfe?: string | null
          url_xml?: string | null
          valor_total?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_notas_fiscais_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agente_logs: {
        Row: {
          conversa_id: string
          criado_em: string | null
          erro_mensagem: string | null
          erro_stack: string | null
          id: string
          llm_provider: string | null
          sessao_id: string | null
          tempo_execucao_ms: number | null
          tipo_evento: string
          tokens_entrada: number | null
          tokens_saida: number | null
          tool_args: Json | null
          tool_name: string | null
          tool_resultado: Json | null
        }
        Insert: {
          conversa_id: string
          criado_em?: string | null
          erro_mensagem?: string | null
          erro_stack?: string | null
          id?: string
          llm_provider?: string | null
          sessao_id?: string | null
          tempo_execucao_ms?: number | null
          tipo_evento: string
          tokens_entrada?: number | null
          tokens_saida?: number | null
          tool_args?: Json | null
          tool_name?: string | null
          tool_resultado?: Json | null
        }
        Update: {
          conversa_id?: string
          criado_em?: string | null
          erro_mensagem?: string | null
          erro_stack?: string | null
          id?: string
          llm_provider?: string | null
          sessao_id?: string | null
          tempo_execucao_ms?: number | null
          tipo_evento?: string
          tokens_entrada?: number | null
          tokens_saida?: number | null
          tool_args?: Json | null
          tool_name?: string | null
          tool_resultado?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agente_logs_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agente_logs_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agente_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agente_sessoes: {
        Row: {
          atualizado_em: string | null
          carrinho_itens: Json | null
          cliente_identificado_id: string | null
          contexto_resumido: string | null
          conversa_id: string
          criado_em: string | null
          estado_atual: string | null
          expira_em: string | null
          id: string
          oportunidade_spot_id: string | null
          sugestoes_busca: Json | null
          total_mensagens: number | null
          total_tools_executadas: number | null
        }
        Insert: {
          atualizado_em?: string | null
          carrinho_itens?: Json | null
          cliente_identificado_id?: string | null
          contexto_resumido?: string | null
          conversa_id: string
          criado_em?: string | null
          estado_atual?: string | null
          expira_em?: string | null
          id?: string
          oportunidade_spot_id?: string | null
          sugestoes_busca?: Json | null
          total_mensagens?: number | null
          total_tools_executadas?: number | null
        }
        Update: {
          atualizado_em?: string | null
          carrinho_itens?: Json | null
          cliente_identificado_id?: string | null
          contexto_resumido?: string | null
          conversa_id?: string
          criado_em?: string | null
          estado_atual?: string | null
          expira_em?: string | null
          id?: string
          oportunidade_spot_id?: string | null
          sugestoes_busca?: Json | null
          total_mensagens?: number | null
          total_tools_executadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agente_sessoes_cliente_identificado_id_fkey"
            columns: ["cliente_identificado_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agente_sessoes_cliente_identificado_id_fkey"
            columns: ["cliente_identificado_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "whatsapp_agente_sessoes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agente_sessoes_oportunidade_spot_id_fkey"
            columns: ["oportunidade_spot_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_aprovacoes_diretoria: {
        Row: {
          aprovado_em: string | null
          aprovado_por_id: string | null
          atualizado_em: string | null
          expira_em: string | null
          id: string
          motivo_aprovacao: string | null
          motivo_decisao: string | null
          proposta_id: string
          solicitado_em: string | null
          solicitado_por_id: string | null
          status: Database["public"]["Enums"]["status_aprovacao"] | null
          valor_proposta: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          atualizado_em?: string | null
          expira_em?: string | null
          id?: string
          motivo_aprovacao?: string | null
          motivo_decisao?: string | null
          proposta_id: string
          solicitado_em?: string | null
          solicitado_por_id?: string | null
          status?: Database["public"]["Enums"]["status_aprovacao"] | null
          valor_proposta: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          atualizado_em?: string | null
          expira_em?: string | null
          id?: string
          motivo_aprovacao?: string | null
          motivo_decisao?: string | null
          proposta_id?: string
          solicitado_em?: string | null
          solicitado_por_id?: string | null
          status?: Database["public"]["Enums"]["status_aprovacao"] | null
          valor_proposta?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_aprovado_por_id_fkey"
            columns: ["aprovado_por_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_aprovado_por_id_fkey"
            columns: ["aprovado_por_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_aprovado_por_id_fkey"
            columns: ["aprovado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_aprovado_por_id_fkey"
            columns: ["aprovado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_propostas_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_solicitado_por_id_fkey"
            columns: ["solicitado_por_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_solicitado_por_id_fkey"
            columns: ["solicitado_por_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_solicitado_por_id_fkey"
            columns: ["solicitado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_aprovacoes_diretoria_solicitado_por_id_fkey"
            columns: ["solicitado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_auditoria: {
        Row: {
          acao: string
          alerta_enviado: boolean | null
          alerta_enviado_em: string | null
          alerta_para: string[] | null
          categoria: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          dispositivo: string | null
          entidade_id: string | null
          entidade_nome: string | null
          entidade_tipo: string | null
          id: string
          ip_address: unknown
          localizacao_aproximada: string | null
          nivel_risco:
            | Database["public"]["Enums"]["nivel_risco_auditoria"]
            | null
          ocorrido_em: string | null
          user_agent: string | null
          usuario_id: string | null
          usuario_nome: string | null
          usuario_role: string | null
        }
        Insert: {
          acao: string
          alerta_enviado?: boolean | null
          alerta_enviado_em?: string | null
          alerta_para?: string[] | null
          categoria: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          dispositivo?: string | null
          entidade_id?: string | null
          entidade_nome?: string | null
          entidade_tipo?: string | null
          id?: string
          ip_address?: unknown
          localizacao_aproximada?: string | null
          nivel_risco?:
            | Database["public"]["Enums"]["nivel_risco_auditoria"]
            | null
          ocorrido_em?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
          usuario_role?: string | null
        }
        Update: {
          acao?: string
          alerta_enviado?: boolean | null
          alerta_enviado_em?: string | null
          alerta_para?: string[] | null
          categoria?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          dispositivo?: string | null
          entidade_id?: string | null
          entidade_nome?: string | null
          entidade_tipo?: string | null
          id?: string
          ip_address?: unknown
          localizacao_aproximada?: string | null
          nivel_risco?:
            | Database["public"]["Enums"]["nivel_risco_auditoria"]
            | null
          ocorrido_em?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
          usuario_role?: string | null
        }
        Relationships: []
      }
      whatsapp_carteiras: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          esta_ativo: boolean | null
          id: string
          motivo_transferencia: string | null
          operador_id: string
          tipo: string | null
          total_atendimentos: number | null
          transferido_de_id: string | null
          transferido_em: string | null
          ultimo_atendimento_em: string | null
          whatsapp_contato_id: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          esta_ativo?: boolean | null
          id?: string
          motivo_transferencia?: string | null
          operador_id: string
          tipo?: string | null
          total_atendimentos?: number | null
          transferido_de_id?: string | null
          transferido_em?: string | null
          ultimo_atendimento_em?: string | null
          whatsapp_contato_id: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          esta_ativo?: boolean | null
          id?: string
          motivo_transferencia?: string | null
          operador_id?: string
          tipo?: string | null
          total_atendimentos?: number | null
          transferido_de_id?: string | null
          transferido_em?: string | null
          ultimo_atendimento_em?: string | null
          whatsapp_contato_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_carteiras_whatsapp_contato_id_fkey"
            columns: ["whatsapp_contato_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_carteiras_contatos: {
        Row: {
          carteira_id: string
          id: string
          motivo_vinculo: string | null
          vinculado_em: string | null
          vinculado_por: string | null
          whatsapp_contato_id: string
        }
        Insert: {
          carteira_id: string
          id?: string
          motivo_vinculo?: string | null
          vinculado_em?: string | null
          vinculado_por?: string | null
          whatsapp_contato_id: string
        }
        Update: {
          carteira_id?: string
          id?: string
          motivo_vinculo?: string | null
          vinculado_em?: string | null
          vinculado_por?: string | null
          whatsapp_contato_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_carteiras_contatos_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_carteiras_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_contatos_vinculado_por_fkey"
            columns: ["vinculado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_contatos_vinculado_por_fkey"
            columns: ["vinculado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_contatos_vinculado_por_fkey"
            columns: ["vinculado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_contatos_vinculado_por_fkey"
            columns: ["vinculado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_contatos_whatsapp_contato_id_fkey"
            columns: ["whatsapp_contato_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_carteiras_v2: {
        Row: {
          atualizado_em: string | null
          cor: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          esta_ativa: boolean | null
          id: string
          max_contatos: number | null
          nome: string
          operador_id: string
          recebe_novos_contatos: boolean | null
          total_atendimentos: number | null
          total_contatos: number | null
          ultimo_atendimento_em: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          esta_ativa?: boolean | null
          id?: string
          max_contatos?: number | null
          nome: string
          operador_id: string
          recebe_novos_contatos?: boolean | null
          total_atendimentos?: number | null
          total_contatos?: number | null
          ultimo_atendimento_em?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          esta_ativa?: boolean | null
          id?: string
          max_contatos?: number | null
          nome?: string
          operador_id?: string
          recebe_novos_contatos?: boolean | null
          total_atendimentos?: number | null
          total_contatos?: number | null
          ultimo_atendimento_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_carteiras_v2_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_v2_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_v2_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_v2_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_v2_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_v2_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_v2_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_carteiras_v2_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_configuracao_global: {
        Row: {
          configurado_em: string | null
          configurado_por: string
          esta_ativo: boolean | null
          id: string
          modo_api: string
          observacoes: string | null
          provedor_ativo: string
        }
        Insert: {
          configurado_em?: string | null
          configurado_por: string
          esta_ativo?: boolean | null
          id?: string
          modo_api: string
          observacoes?: string | null
          provedor_ativo: string
        }
        Update: {
          configurado_em?: string | null
          configurado_por?: string
          esta_ativo?: boolean | null
          id?: string
          modo_api?: string
          observacoes?: string | null
          provedor_ativo?: string
        }
        Relationships: []
      }
      whatsapp_configuracoes_atendimento: {
        Row: {
          apenas_operadores_online: boolean | null
          atualizado_em: string | null
          bloquear_ao_atingir_limite: boolean | null
          carteirizacao_ativa: boolean | null
          criado_em: string | null
          criado_por: string | null
          distribuicao_automatica_ativa: boolean | null
          entidade_id: string | null
          exibir_nome_operador: boolean | null
          formato_nome: string | null
          id: string
          max_atendimentos_simultaneos: number | null
          mensagem_encerramento_inatividade: string | null
          modo_carteirizacao: string | null
          nivel: string | null
          notificar_antes_encerramento_minutos: number | null
          sla_inatividade_horas: number | null
          tabulacao_padrao_inatividade: string | null
          tempo_max_aceite_segundos: number | null
          tipo_distribuicao: string | null
        }
        Insert: {
          apenas_operadores_online?: boolean | null
          atualizado_em?: string | null
          bloquear_ao_atingir_limite?: boolean | null
          carteirizacao_ativa?: boolean | null
          criado_em?: string | null
          criado_por?: string | null
          distribuicao_automatica_ativa?: boolean | null
          entidade_id?: string | null
          exibir_nome_operador?: boolean | null
          formato_nome?: string | null
          id?: string
          max_atendimentos_simultaneos?: number | null
          mensagem_encerramento_inatividade?: string | null
          modo_carteirizacao?: string | null
          nivel?: string | null
          notificar_antes_encerramento_minutos?: number | null
          sla_inatividade_horas?: number | null
          tabulacao_padrao_inatividade?: string | null
          tempo_max_aceite_segundos?: number | null
          tipo_distribuicao?: string | null
        }
        Update: {
          apenas_operadores_online?: boolean | null
          atualizado_em?: string | null
          bloquear_ao_atingir_limite?: boolean | null
          carteirizacao_ativa?: boolean | null
          criado_em?: string | null
          criado_por?: string | null
          distribuicao_automatica_ativa?: boolean | null
          entidade_id?: string | null
          exibir_nome_operador?: boolean | null
          formato_nome?: string | null
          id?: string
          max_atendimentos_simultaneos?: number | null
          mensagem_encerramento_inatividade?: string | null
          modo_carteirizacao?: string | null
          nivel?: string | null
          notificar_antes_encerramento_minutos?: number | null
          sla_inatividade_horas?: number | null
          tabulacao_padrao_inatividade?: string | null
          tempo_max_aceite_segundos?: number | null
          tipo_distribuicao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_configuracoes_atendi_tabulacao_padrao_inatividade_fkey"
            columns: ["tabulacao_padrao_inatividade"]
            isOneToOne: false
            referencedRelation: "codigos_disposicao"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contas: {
        Row: {
          account_sid: string | null
          agente_ia_config: Json | null
          agente_vendas_ativo: boolean | null
          api_key_gupshup: string | null
          api_version: string | null
          app_id_gupshup: string | null
          atualizado_em: string | null
          business_account_id: string | null
          business_id: string | null
          categoria_negocio: string | null
          conectada_em: string | null
          criado_em: string | null
          criado_por: string
          desconectada_em: string | null
          descricao_negocio: string | null
          email_contato: string | null
          endereco: string | null
          excluido_em: string | null
          expediente_id: string | null
          foto_perfil_url: string | null
          horario_atendimento: Json | null
          id: string
          instance_id_wapi: string | null
          limite_mensagens_dia: number | null
          mensagem_fora_horario: string | null
          menu_setores_config: Json | null
          meta_access_token: string | null
          meta_app_id: string | null
          meta_phone_number_id: string | null
          meta_waba_id: string | null
          nome_conta: string
          nome_exibicao: string | null
          numero_whatsapp: string
          phone_number_id: string | null
          phone_number_id_gupshup: string | null
          phone_numbers_sincronizados_em: string | null
          provedor: string
          provider: string
          qualidade_conta: string | null
          resposta_automatica_ativa: boolean | null
          signature_validation_enabled: boolean | null
          site: string | null
          status: string | null
          subscribed_fields: string[] | null
          subscription_status: string | null
          subscription_verificado_em: string | null
          token_alertado_em: string | null
          token_expira_em: string | null
          token_renovacao_tentativas: number | null
          token_renovado_em: string | null
          token_wapi: string | null
          total_conversas: number | null
          total_mensagens_enviadas: number | null
          total_mensagens_recebidas: number | null
          ultima_sincronizacao_em: string | null
          unidade_padrao_id: string | null
          verificada: boolean | null
          waba_id: string | null
          webhook_connected_url: string | null
          webhook_delivery_url: string | null
          webhook_disconnected_url: string | null
          webhook_received_url: string | null
          webhook_status_url: string | null
          webhook_url: string | null
          webhook_verificado: boolean | null
        }
        Insert: {
          account_sid?: string | null
          agente_ia_config?: Json | null
          agente_vendas_ativo?: boolean | null
          api_key_gupshup?: string | null
          api_version?: string | null
          app_id_gupshup?: string | null
          atualizado_em?: string | null
          business_account_id?: string | null
          business_id?: string | null
          categoria_negocio?: string | null
          conectada_em?: string | null
          criado_em?: string | null
          criado_por: string
          desconectada_em?: string | null
          descricao_negocio?: string | null
          email_contato?: string | null
          endereco?: string | null
          excluido_em?: string | null
          expediente_id?: string | null
          foto_perfil_url?: string | null
          horario_atendimento?: Json | null
          id?: string
          instance_id_wapi?: string | null
          limite_mensagens_dia?: number | null
          mensagem_fora_horario?: string | null
          menu_setores_config?: Json | null
          meta_access_token?: string | null
          meta_app_id?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          nome_conta: string
          nome_exibicao?: string | null
          numero_whatsapp: string
          phone_number_id?: string | null
          phone_number_id_gupshup?: string | null
          phone_numbers_sincronizados_em?: string | null
          provedor: string
          provider: string
          qualidade_conta?: string | null
          resposta_automatica_ativa?: boolean | null
          signature_validation_enabled?: boolean | null
          site?: string | null
          status?: string | null
          subscribed_fields?: string[] | null
          subscription_status?: string | null
          subscription_verificado_em?: string | null
          token_alertado_em?: string | null
          token_expira_em?: string | null
          token_renovacao_tentativas?: number | null
          token_renovado_em?: string | null
          token_wapi?: string | null
          total_conversas?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          ultima_sincronizacao_em?: string | null
          unidade_padrao_id?: string | null
          verificada?: boolean | null
          waba_id?: string | null
          webhook_connected_url?: string | null
          webhook_delivery_url?: string | null
          webhook_disconnected_url?: string | null
          webhook_received_url?: string | null
          webhook_status_url?: string | null
          webhook_url?: string | null
          webhook_verificado?: boolean | null
        }
        Update: {
          account_sid?: string | null
          agente_ia_config?: Json | null
          agente_vendas_ativo?: boolean | null
          api_key_gupshup?: string | null
          api_version?: string | null
          app_id_gupshup?: string | null
          atualizado_em?: string | null
          business_account_id?: string | null
          business_id?: string | null
          categoria_negocio?: string | null
          conectada_em?: string | null
          criado_em?: string | null
          criado_por?: string
          desconectada_em?: string | null
          descricao_negocio?: string | null
          email_contato?: string | null
          endereco?: string | null
          excluido_em?: string | null
          expediente_id?: string | null
          foto_perfil_url?: string | null
          horario_atendimento?: Json | null
          id?: string
          instance_id_wapi?: string | null
          limite_mensagens_dia?: number | null
          mensagem_fora_horario?: string | null
          menu_setores_config?: Json | null
          meta_access_token?: string | null
          meta_app_id?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          nome_conta?: string
          nome_exibicao?: string | null
          numero_whatsapp?: string
          phone_number_id?: string | null
          phone_number_id_gupshup?: string | null
          phone_numbers_sincronizados_em?: string | null
          provedor?: string
          provider?: string
          qualidade_conta?: string | null
          resposta_automatica_ativa?: boolean | null
          signature_validation_enabled?: boolean | null
          site?: string | null
          status?: string | null
          subscribed_fields?: string[] | null
          subscription_status?: string | null
          subscription_verificado_em?: string | null
          token_alertado_em?: string | null
          token_expira_em?: string | null
          token_renovacao_tentativas?: number | null
          token_renovado_em?: string | null
          token_wapi?: string | null
          total_conversas?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          ultima_sincronizacao_em?: string | null
          unidade_padrao_id?: string | null
          verificada?: boolean | null
          waba_id?: string | null
          webhook_connected_url?: string | null
          webhook_delivery_url?: string | null
          webhook_disconnected_url?: string | null
          webhook_received_url?: string | null
          webhook_status_url?: string | null
          webhook_url?: string | null
          webhook_verificado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contas_unidade_padrao_id_fkey"
            columns: ["unidade_padrao_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contatos: {
        Row: {
          atualizado_em: string | null
          bloqueado: boolean | null
          bloqueado_em: string | null
          categoria_cliente: string | null
          contato_id: string | null
          criado_em: string | null
          foto_perfil_url: string | null
          id: string
          motivo_bloqueio: string | null
          motivo_opt_out: string | null
          nome_whatsapp: string | null
          numero_valido: boolean | null
          numero_whatsapp: string
          opt_in: boolean | null
          opt_in_data: string | null
          opt_out: boolean | null
          opt_out_data: string | null
          sobre: string | null
          status_whatsapp: string | null
          tags: string[] | null
          taxa_resposta: number | null
          tem_whatsapp: boolean | null
          tempo_medio_resposta_minutos: number | null
          total_conversas: number | null
          total_mensagens_enviadas: number | null
          total_mensagens_recebidas: number | null
          ultima_mensagem_em: string | null
          ultima_mensagem_enviada_em: string | null
          ultima_mensagem_recebida_em: string | null
          ultima_verificacao_em: string | null
          ultima_visualizacao_em: string | null
          whatsapp_conta_id: string
          whatsapp_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bloqueado?: boolean | null
          bloqueado_em?: string | null
          categoria_cliente?: string | null
          contato_id?: string | null
          criado_em?: string | null
          foto_perfil_url?: string | null
          id?: string
          motivo_bloqueio?: string | null
          motivo_opt_out?: string | null
          nome_whatsapp?: string | null
          numero_valido?: boolean | null
          numero_whatsapp: string
          opt_in?: boolean | null
          opt_in_data?: string | null
          opt_out?: boolean | null
          opt_out_data?: string | null
          sobre?: string | null
          status_whatsapp?: string | null
          tags?: string[] | null
          taxa_resposta?: number | null
          tem_whatsapp?: boolean | null
          tempo_medio_resposta_minutos?: number | null
          total_conversas?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          ultima_mensagem_em?: string | null
          ultima_mensagem_enviada_em?: string | null
          ultima_mensagem_recebida_em?: string | null
          ultima_verificacao_em?: string | null
          ultima_visualizacao_em?: string | null
          whatsapp_conta_id: string
          whatsapp_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bloqueado?: boolean | null
          bloqueado_em?: string | null
          categoria_cliente?: string | null
          contato_id?: string | null
          criado_em?: string | null
          foto_perfil_url?: string | null
          id?: string
          motivo_bloqueio?: string | null
          motivo_opt_out?: string | null
          nome_whatsapp?: string | null
          numero_valido?: boolean | null
          numero_whatsapp?: string
          opt_in?: boolean | null
          opt_in_data?: string | null
          opt_out?: boolean | null
          opt_out_data?: string | null
          sobre?: string | null
          status_whatsapp?: string | null
          tags?: string[] | null
          taxa_resposta?: number | null
          tem_whatsapp?: boolean | null
          tempo_medio_resposta_minutos?: number | null
          total_conversas?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          ultima_mensagem_em?: string | null
          ultima_mensagem_enviada_em?: string | null
          ultima_mensagem_recebida_em?: string | null
          ultima_verificacao_em?: string | null
          ultima_visualizacao_em?: string | null
          whatsapp_conta_id?: string
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contatos_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contatos_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversas: {
        Row: {
          agente_ia_ativo: boolean | null
          atribuicao_automatica: boolean | null
          atribuida_em: string | null
          atribuida_para_id: string | null
          atualizado_em: string | null
          avaliacao_satisfacao: number | null
          avaliada_em: string | null
          campanha_origem: string | null
          categoria: string | null
          comentario_avaliacao: string | null
          conta_id: string | null
          contato_id: string | null
          conversa_externa_id: string | null
          criado_em: string | null
          csat_score: number | null
          distribuicao_iniciada_em: string | null
          em_distribuicao: boolean | null
          emoji_sentimento: string | null
          estagio_agente: string | null
          fechada_em: string | null
          fila_id: string | null
          gerenciada_por_bot: boolean | null
          id: string
          iniciada_em: string | null
          janela_24h_ativa: boolean | null
          janela_aberta_em: string | null
          janela_fecha_em: string | null
          mensagens_analisadas: number | null
          nps_score: number | null
          numero_protocolo: string | null
          oportunidade_id: string | null
          oportunidade_spot_id: string | null
          origem: string | null
          origem_atendimento: string | null
          prioridade: string | null
          produtos_carrinho: Json | null
          proposta_ativa_id: string | null
          resolvida_em: string | null
          sentimento_cliente: string | null
          status: string | null
          tags: string[] | null
          tempo_primeira_resposta_minutos: number | null
          tempo_total_resposta_minutos: number | null
          tentativas_distribuicao: number | null
          tipo_conversa: string | null
          titulo: string | null
          total_mensagens: number | null
          total_mensagens_enviadas: number | null
          total_mensagens_recebidas: number | null
          transferida_em: string | null
          transferida_para_humano: boolean | null
          triagem_motivo: string | null
          triagem_status: string | null
          ultima_analise_sentimento_em: string | null
          ultima_intencao_detectada: string | null
          ultima_interacao_agente_em: string | null
          ultima_interacao_cliente_em: string | null
          ultima_mensagem_em: string | null
          unidade_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
          whatsapp_fila_id: string | null
        }
        Insert: {
          agente_ia_ativo?: boolean | null
          atribuicao_automatica?: boolean | null
          atribuida_em?: string | null
          atribuida_para_id?: string | null
          atualizado_em?: string | null
          avaliacao_satisfacao?: number | null
          avaliada_em?: string | null
          campanha_origem?: string | null
          categoria?: string | null
          comentario_avaliacao?: string | null
          conta_id?: string | null
          contato_id?: string | null
          conversa_externa_id?: string | null
          criado_em?: string | null
          csat_score?: number | null
          distribuicao_iniciada_em?: string | null
          em_distribuicao?: boolean | null
          emoji_sentimento?: string | null
          estagio_agente?: string | null
          fechada_em?: string | null
          fila_id?: string | null
          gerenciada_por_bot?: boolean | null
          id?: string
          iniciada_em?: string | null
          janela_24h_ativa?: boolean | null
          janela_aberta_em?: string | null
          janela_fecha_em?: string | null
          mensagens_analisadas?: number | null
          nps_score?: number | null
          numero_protocolo?: string | null
          oportunidade_id?: string | null
          oportunidade_spot_id?: string | null
          origem?: string | null
          origem_atendimento?: string | null
          prioridade?: string | null
          produtos_carrinho?: Json | null
          proposta_ativa_id?: string | null
          resolvida_em?: string | null
          sentimento_cliente?: string | null
          status?: string | null
          tags?: string[] | null
          tempo_primeira_resposta_minutos?: number | null
          tempo_total_resposta_minutos?: number | null
          tentativas_distribuicao?: number | null
          tipo_conversa?: string | null
          titulo?: string | null
          total_mensagens?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          transferida_em?: string | null
          transferida_para_humano?: boolean | null
          triagem_motivo?: string | null
          triagem_status?: string | null
          ultima_analise_sentimento_em?: string | null
          ultima_intencao_detectada?: string | null
          ultima_interacao_agente_em?: string | null
          ultima_interacao_cliente_em?: string | null
          ultima_mensagem_em?: string | null
          unidade_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
          whatsapp_fila_id?: string | null
        }
        Update: {
          agente_ia_ativo?: boolean | null
          atribuicao_automatica?: boolean | null
          atribuida_em?: string | null
          atribuida_para_id?: string | null
          atualizado_em?: string | null
          avaliacao_satisfacao?: number | null
          avaliada_em?: string | null
          campanha_origem?: string | null
          categoria?: string | null
          comentario_avaliacao?: string | null
          conta_id?: string | null
          contato_id?: string | null
          conversa_externa_id?: string | null
          criado_em?: string | null
          csat_score?: number | null
          distribuicao_iniciada_em?: string | null
          em_distribuicao?: boolean | null
          emoji_sentimento?: string | null
          estagio_agente?: string | null
          fechada_em?: string | null
          fila_id?: string | null
          gerenciada_por_bot?: boolean | null
          id?: string
          iniciada_em?: string | null
          janela_24h_ativa?: boolean | null
          janela_aberta_em?: string | null
          janela_fecha_em?: string | null
          mensagens_analisadas?: number | null
          nps_score?: number | null
          numero_protocolo?: string | null
          oportunidade_id?: string | null
          oportunidade_spot_id?: string | null
          origem?: string | null
          origem_atendimento?: string | null
          prioridade?: string | null
          produtos_carrinho?: Json | null
          proposta_ativa_id?: string | null
          resolvida_em?: string | null
          sentimento_cliente?: string | null
          status?: string | null
          tags?: string[] | null
          tempo_primeira_resposta_minutos?: number | null
          tempo_total_resposta_minutos?: number | null
          tentativas_distribuicao?: number | null
          tipo_conversa?: string | null
          titulo?: string | null
          total_mensagens?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          transferida_em?: string | null
          transferida_para_humano?: boolean | null
          triagem_motivo?: string | null
          triagem_status?: string | null
          ultima_analise_sentimento_em?: string | null
          ultima_intencao_detectada?: string | null
          ultima_interacao_agente_em?: string | null
          ultima_interacao_cliente_em?: string | null
          ultima_mensagem_em?: string | null
          unidade_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_conta_id?: string
          whatsapp_contato_id?: string
          whatsapp_fila_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_oportunidade_spot_id_fkey"
            columns: ["oportunidade_spot_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_proposta_ativa_id_fkey"
            columns: ["proposta_ativa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_propostas_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_whatsapp_contato_id_fkey"
            columns: ["whatsapp_contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_whatsapp_fila_id_fkey"
            columns: ["whatsapp_fila_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_filas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversas_memoria: {
        Row: {
          conteudo_resumido: string
          conversa_id: string
          criado_em: string | null
          embedding: string | null
          expira_em: string | null
          id: string
          intencao_detectada: string | null
          mensagem_id: string | null
          produtos_mencionados: string[] | null
          relevancia_score: number | null
          sentimento: string | null
          tipo_interacao: string
        }
        Insert: {
          conteudo_resumido: string
          conversa_id: string
          criado_em?: string | null
          embedding?: string | null
          expira_em?: string | null
          id?: string
          intencao_detectada?: string | null
          mensagem_id?: string | null
          produtos_mencionados?: string[] | null
          relevancia_score?: number | null
          sentimento?: string | null
          tipo_interacao: string
        }
        Update: {
          conteudo_resumido?: string
          conversa_id?: string
          criado_em?: string | null
          embedding?: string | null
          expira_em?: string | null
          id?: string
          intencao_detectada?: string | null
          mensagem_id?: string | null
          produtos_mencionados?: string[] | null
          relevancia_score?: number | null
          sentimento?: string | null
          tipo_interacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_memoria_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_memoria_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_etiquetas_ia: {
        Row: {
          categoria: string | null
          confianca: number
          conversa_id: string | null
          criado_em: string | null
          etiqueta: string
          etiqueta_corrigida: string | null
          foi_corrigida: boolean | null
          id: string
          mensagem_id: string | null
          modelo_ia: string | null
          validada_em: string | null
          validada_por: string | null
          validada_por_humano: boolean | null
        }
        Insert: {
          categoria?: string | null
          confianca: number
          conversa_id?: string | null
          criado_em?: string | null
          etiqueta: string
          etiqueta_corrigida?: string | null
          foi_corrigida?: boolean | null
          id?: string
          mensagem_id?: string | null
          modelo_ia?: string | null
          validada_em?: string | null
          validada_por?: string | null
          validada_por_humano?: boolean | null
        }
        Update: {
          categoria?: string | null
          confianca?: number
          conversa_id?: string | null
          criado_em?: string | null
          etiqueta?: string
          etiqueta_corrigida?: string | null
          foi_corrigida?: boolean | null
          id?: string
          mensagem_id?: string | null
          modelo_ia?: string | null
          validada_em?: string | null
          validada_por?: string | null
          validada_por_humano?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_etiquetas_ia_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_etiquetas_ia_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_expedientes: {
        Row: {
          atualizado_em: string | null
          comportamento_fora_expediente: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          entidade_id: string | null
          esta_ativo: boolean | null
          horarios_semana: Json
          id: string
          mensagem_feriado: string | null
          mensagem_fora_expediente: string | null
          nome: string
          prioridade: number | null
          timezone: string | null
          tipo_entidade: string
        }
        Insert: {
          atualizado_em?: string | null
          comportamento_fora_expediente?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          entidade_id?: string | null
          esta_ativo?: boolean | null
          horarios_semana?: Json
          id?: string
          mensagem_feriado?: string | null
          mensagem_fora_expediente?: string | null
          nome: string
          prioridade?: number | null
          timezone?: string | null
          tipo_entidade: string
        }
        Update: {
          atualizado_em?: string | null
          comportamento_fora_expediente?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          entidade_id?: string | null
          esta_ativo?: boolean | null
          horarios_semana?: Json
          id?: string
          mensagem_feriado?: string | null
          mensagem_fora_expediente?: string | null
          nome?: string
          prioridade?: number | null
          timezone?: string | null
          tipo_entidade?: string
        }
        Relationships: []
      }
      whatsapp_feedback_produtos: {
        Row: {
          comentario_cliente: string | null
          conversa_id: string
          criado_em: string | null
          foi_comprado: boolean | null
          foi_sugerido: boolean | null
          id: string
          motivo_rejeicao: string | null
          produto_id: string
          proposta_id: string | null
          query_busca: string | null
          score_ajuste: number | null
          tipo: Database["public"]["Enums"]["tipo_feedback"]
        }
        Insert: {
          comentario_cliente?: string | null
          conversa_id: string
          criado_em?: string | null
          foi_comprado?: boolean | null
          foi_sugerido?: boolean | null
          id?: string
          motivo_rejeicao?: string | null
          produto_id: string
          proposta_id?: string | null
          query_busca?: string | null
          score_ajuste?: number | null
          tipo: Database["public"]["Enums"]["tipo_feedback"]
        }
        Update: {
          comentario_cliente?: string | null
          conversa_id?: string
          criado_em?: string | null
          foi_comprado?: boolean | null
          foi_sugerido?: boolean | null
          id?: string
          motivo_rejeicao?: string | null
          produto_id?: string
          proposta_id?: string | null
          query_busca?: string | null
          score_ajuste?: number | null
          tipo?: Database["public"]["Enums"]["tipo_feedback"]
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_feedback_produtos_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_feedback_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_feedback_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_feedback_produtos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_propostas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_feriados: {
        Row: {
          abrangencia: string | null
          atualizado_em: string | null
          cidade: string | null
          criado_em: string | null
          criado_por: string | null
          data: string
          descricao: string | null
          eh_recorrente: boolean | null
          esta_ativo: boolean | null
          estado: string | null
          horario_especial: Json | null
          id: string
          mensagem_feriado: string | null
          nome: string
          tipo_fechamento: string | null
          unidades_ids: string[] | null
        }
        Insert: {
          abrangencia?: string | null
          atualizado_em?: string | null
          cidade?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data: string
          descricao?: string | null
          eh_recorrente?: boolean | null
          esta_ativo?: boolean | null
          estado?: string | null
          horario_especial?: Json | null
          id?: string
          mensagem_feriado?: string | null
          nome: string
          tipo_fechamento?: string | null
          unidades_ids?: string[] | null
        }
        Update: {
          abrangencia?: string | null
          atualizado_em?: string | null
          cidade?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data?: string
          descricao?: string | null
          eh_recorrente?: boolean | null
          esta_ativo?: boolean | null
          estado?: string | null
          horario_especial?: Json | null
          id?: string
          mensagem_feriado?: string | null
          nome?: string
          tipo_fechamento?: string | null
          unidades_ids?: string[] | null
        }
        Relationships: []
      }
      whatsapp_fila_espera: {
        Row: {
          atendido_em: string | null
          atendido_por_id: string | null
          atualizado_em: string | null
          conversa_id: string
          criado_em: string | null
          entrou_fila_em: string | null
          fila_destino_id: string | null
          id: string
          operador_preferencial_id: string | null
          operadores_rejeitaram: string[] | null
          posicao: number
          prioridade: string | null
          status: string | null
          tempo_estimado_segundos: number | null
          tentativas_distribuicao: number | null
          ultima_tentativa_em: string | null
          unidade_id: string | null
          whatsapp_fila_id: string | null
        }
        Insert: {
          atendido_em?: string | null
          atendido_por_id?: string | null
          atualizado_em?: string | null
          conversa_id: string
          criado_em?: string | null
          entrou_fila_em?: string | null
          fila_destino_id?: string | null
          id?: string
          operador_preferencial_id?: string | null
          operadores_rejeitaram?: string[] | null
          posicao: number
          prioridade?: string | null
          status?: string | null
          tempo_estimado_segundos?: number | null
          tentativas_distribuicao?: number | null
          ultima_tentativa_em?: string | null
          unidade_id?: string | null
          whatsapp_fila_id?: string | null
        }
        Update: {
          atendido_em?: string | null
          atendido_por_id?: string | null
          atualizado_em?: string | null
          conversa_id?: string
          criado_em?: string | null
          entrou_fila_em?: string | null
          fila_destino_id?: string | null
          id?: string
          operador_preferencial_id?: string | null
          operadores_rejeitaram?: string[] | null
          posicao?: number
          prioridade?: string | null
          status?: string | null
          tempo_estimado_segundos?: number | null
          tentativas_distribuicao?: number | null
          ultima_tentativa_em?: string | null
          unidade_id?: string | null
          whatsapp_fila_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_fila_espera_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_fila_espera_fila_destino_id_fkey"
            columns: ["fila_destino_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_fila_espera_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_fila_espera_whatsapp_fila_id_fkey"
            columns: ["whatsapp_fila_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_filas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_filas: {
        Row: {
          atualizado_em: string | null
          cor: string | null
          criado_em: string | null
          descricao: string | null
          dias_semana: number[] | null
          esta_ativa: boolean | null
          horario_fim: string | null
          horario_inicio: string | null
          icone: string | null
          id: string
          max_conversas_simultaneas: number | null
          modo_distribuicao: string | null
          nome: string
          ordem: number | null
          palavras_chave: string[] | null
          prioridade_triagem: number | null
          regras_triagem: string | null
          sla_primeira_resposta_minutos: number | null
          sla_resolucao_minutos: number | null
          tipo_fila: string | null
          unidade_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          dias_semana?: number[] | null
          esta_ativa?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          icone?: string | null
          id?: string
          max_conversas_simultaneas?: number | null
          modo_distribuicao?: string | null
          nome: string
          ordem?: number | null
          palavras_chave?: string[] | null
          prioridade_triagem?: number | null
          regras_triagem?: string | null
          sla_primeira_resposta_minutos?: number | null
          sla_resolucao_minutos?: number | null
          tipo_fila?: string | null
          unidade_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          dias_semana?: number[] | null
          esta_ativa?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          icone?: string | null
          id?: string
          max_conversas_simultaneas?: number | null
          modo_distribuicao?: string | null
          nome?: string
          ordem?: number | null
          palavras_chave?: string[] | null
          prioridade_triagem?: number | null
          regras_triagem?: string | null
          sla_primeira_resposta_minutos?: number | null
          sla_resolucao_minutos?: number | null
          tipo_fila?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_filas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_interacoes: {
        Row: {
          conversa_id: string
          criado_em: string | null
          descricao: string | null
          executado_por_bot: boolean | null
          executado_por_id: string | null
          id: string
          mensagem_id: string | null
          metadata: Json | null
          proposta_id: string | null
          tipo_evento: string
        }
        Insert: {
          conversa_id: string
          criado_em?: string | null
          descricao?: string | null
          executado_por_bot?: boolean | null
          executado_por_id?: string | null
          id?: string
          mensagem_id?: string | null
          metadata?: Json | null
          proposta_id?: string | null
          tipo_evento: string
        }
        Update: {
          conversa_id?: string
          criado_em?: string | null
          descricao?: string | null
          executado_por_bot?: boolean | null
          executado_por_id?: string | null
          id?: string
          mensagem_id?: string | null
          metadata?: Json | null
          proposta_id?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_interacoes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_executado_por_id_fkey"
            columns: ["executado_por_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_executado_por_id_fkey"
            columns: ["executado_por_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_executado_por_id_fkey"
            columns: ["executado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_executado_por_id_fkey"
            columns: ["executado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_propostas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_jobs_queue: {
        Row: {
          conversa_id: string
          criado_em: string
          erro_mensagem: string | null
          id: string
          max_tentativas: number
          payload: Json
          processado_em: string | null
          proximo_retry_em: string | null
          status: string
          tentativas: number
          tipo: string
        }
        Insert: {
          conversa_id: string
          criado_em?: string
          erro_mensagem?: string | null
          id?: string
          max_tentativas?: number
          payload?: Json
          processado_em?: string | null
          proximo_retry_em?: string | null
          status?: string
          tentativas?: number
          tipo: string
        }
        Update: {
          conversa_id?: string
          criado_em?: string
          erro_mensagem?: string | null
          id?: string
          max_tentativas?: number
          payload?: Json
          processado_em?: string | null
          proximo_retry_em?: string | null
          status?: string
          tentativas?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_jobs_queue_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_log_atribuicoes: {
        Row: {
          conversa_id: string
          criado_em: string | null
          criado_por: string | null
          foi_automatico: boolean | null
          id: string
          motivo: string
          vendedor_anterior_id: string | null
          vendedor_novo_id: string | null
        }
        Insert: {
          conversa_id: string
          criado_em?: string | null
          criado_por?: string | null
          foi_automatico?: boolean | null
          id?: string
          motivo: string
          vendedor_anterior_id?: string | null
          vendedor_novo_id?: string | null
        }
        Update: {
          conversa_id?: string
          criado_em?: string | null
          criado_por?: string | null
          foi_automatico?: boolean | null
          id?: string
          motivo?: string
          vendedor_anterior_id?: string | null
          vendedor_novo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_log_atribuicoes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_mensagens: {
        Row: {
          agendada_para: string | null
          botoes: Json | null
          botoes_interativos: Json | null
          confianca_analise: number | null
          contexto: Json | null
          conversa_id: string
          corpo: string | null
          corpo_original: string | null
          criado_em: string | null
          custo_envio: number | null
          deletada: boolean | null
          deletada_em: string | null
          direcao: string
          duracao_midia_segundos: number | null
          editada: boolean | null
          editada_em: string | null
          eh_lista: boolean | null
          eh_template: boolean | null
          endereco_localizacao: string | null
          enviada_automaticamente: boolean | null
          enviada_em: string | null
          enviada_por_bot: boolean | null
          enviada_por_usuario_id: string | null
          erro_codigo: string | null
          erro_mensagem: string | null
          foi_analisada: boolean | null
          id: string
          idioma_detectado: string | null
          intencao: string | null
          latitude: number | null
          lida_confirmada_em: string | null
          lista_opcoes: Json | null
          longitude: number | null
          mensagem_externa_id: string | null
          mensagem_original: string | null
          mensagem_referencia_id: string | null
          metadata: Json | null
          mime_type: string | null
          nome_arquivo: string | null
          nome_remetente: string | null
          numero_de: string | null
          numero_para: string | null
          palavras_chave: string[] | null
          reacoes: Json | null
          recebida_em: string | null
          resposta_botao: string | null
          resposta_lista: string | null
          resposta_para_id: string | null
          sentimento: string | null
          status: string | null
          status_entregue_em: string | null
          status_enviada_em: string | null
          status_falhou_em: string | null
          status_lida_em: string | null
          tamanho_midia: number | null
          tem_botoes: boolean | null
          tem_midia: boolean | null
          template_id: string | null
          template_nome: string | null
          template_parametros: Json | null
          tentativas_envio: number | null
          tipo_botao: string | null
          tipo_mensagem: string
          tipo_midia: string | null
          transcricao_audio: string | null
          transcricao_processada_em: string | null
          url_midia: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
        }
        Insert: {
          agendada_para?: string | null
          botoes?: Json | null
          botoes_interativos?: Json | null
          confianca_analise?: number | null
          contexto?: Json | null
          conversa_id: string
          corpo?: string | null
          corpo_original?: string | null
          criado_em?: string | null
          custo_envio?: number | null
          deletada?: boolean | null
          deletada_em?: string | null
          direcao: string
          duracao_midia_segundos?: number | null
          editada?: boolean | null
          editada_em?: string | null
          eh_lista?: boolean | null
          eh_template?: boolean | null
          endereco_localizacao?: string | null
          enviada_automaticamente?: boolean | null
          enviada_em?: string | null
          enviada_por_bot?: boolean | null
          enviada_por_usuario_id?: string | null
          erro_codigo?: string | null
          erro_mensagem?: string | null
          foi_analisada?: boolean | null
          id?: string
          idioma_detectado?: string | null
          intencao?: string | null
          latitude?: number | null
          lida_confirmada_em?: string | null
          lista_opcoes?: Json | null
          longitude?: number | null
          mensagem_externa_id?: string | null
          mensagem_original?: string | null
          mensagem_referencia_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          nome_arquivo?: string | null
          nome_remetente?: string | null
          numero_de?: string | null
          numero_para?: string | null
          palavras_chave?: string[] | null
          reacoes?: Json | null
          recebida_em?: string | null
          resposta_botao?: string | null
          resposta_lista?: string | null
          resposta_para_id?: string | null
          sentimento?: string | null
          status?: string | null
          status_entregue_em?: string | null
          status_enviada_em?: string | null
          status_falhou_em?: string | null
          status_lida_em?: string | null
          tamanho_midia?: number | null
          tem_botoes?: boolean | null
          tem_midia?: boolean | null
          template_id?: string | null
          template_nome?: string | null
          template_parametros?: Json | null
          tentativas_envio?: number | null
          tipo_botao?: string | null
          tipo_mensagem?: string
          tipo_midia?: string | null
          transcricao_audio?: string | null
          transcricao_processada_em?: string | null
          url_midia?: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
        }
        Update: {
          agendada_para?: string | null
          botoes?: Json | null
          botoes_interativos?: Json | null
          confianca_analise?: number | null
          contexto?: Json | null
          conversa_id?: string
          corpo?: string | null
          corpo_original?: string | null
          criado_em?: string | null
          custo_envio?: number | null
          deletada?: boolean | null
          deletada_em?: string | null
          direcao?: string
          duracao_midia_segundos?: number | null
          editada?: boolean | null
          editada_em?: string | null
          eh_lista?: boolean | null
          eh_template?: boolean | null
          endereco_localizacao?: string | null
          enviada_automaticamente?: boolean | null
          enviada_em?: string | null
          enviada_por_bot?: boolean | null
          enviada_por_usuario_id?: string | null
          erro_codigo?: string | null
          erro_mensagem?: string | null
          foi_analisada?: boolean | null
          id?: string
          idioma_detectado?: string | null
          intencao?: string | null
          latitude?: number | null
          lida_confirmada_em?: string | null
          lista_opcoes?: Json | null
          longitude?: number | null
          mensagem_externa_id?: string | null
          mensagem_original?: string | null
          mensagem_referencia_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          nome_arquivo?: string | null
          nome_remetente?: string | null
          numero_de?: string | null
          numero_para?: string | null
          palavras_chave?: string[] | null
          reacoes?: Json | null
          recebida_em?: string | null
          resposta_botao?: string | null
          resposta_lista?: string | null
          resposta_para_id?: string | null
          sentimento?: string | null
          status?: string | null
          status_entregue_em?: string | null
          status_enviada_em?: string | null
          status_falhou_em?: string | null
          status_lida_em?: string | null
          tamanho_midia?: number | null
          tem_botoes?: boolean | null
          tem_midia?: boolean | null
          template_id?: string | null
          template_nome?: string | null
          template_parametros?: Json | null
          tentativas_envio?: number | null
          tipo_botao?: string | null
          tipo_mensagem?: string
          tipo_midia?: string | null
          transcricao_audio?: string | null
          transcricao_processada_em?: string | null
          url_midia?: string | null
          whatsapp_conta_id?: string
          whatsapp_contato_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_resposta_para_id_fkey"
            columns: ["resposta_para_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_whatsapp_contato_id_fkey"
            columns: ["whatsapp_contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_metricas_agente: {
        Row: {
          criado_em: string | null
          data: string
          id: string
          taxa_conversao_proposta: number | null
          tempo_medio_resposta_segundos: number | null
          total_conversas_fechadas: number | null
          total_conversas_iniciadas: number | null
          total_mensagens_enviadas_bot: number | null
          total_mensagens_recebidas: number | null
          total_propostas_aceitas: number | null
          total_propostas_geradas: number | null
          total_propostas_rejeitadas: number | null
          whatsapp_conta_id: string | null
        }
        Insert: {
          criado_em?: string | null
          data: string
          id?: string
          taxa_conversao_proposta?: number | null
          tempo_medio_resposta_segundos?: number | null
          total_conversas_fechadas?: number | null
          total_conversas_iniciadas?: number | null
          total_mensagens_enviadas_bot?: number | null
          total_mensagens_recebidas?: number | null
          total_propostas_aceitas?: number | null
          total_propostas_geradas?: number | null
          total_propostas_rejeitadas?: number | null
          whatsapp_conta_id?: string | null
        }
        Update: {
          criado_em?: string | null
          data?: string
          id?: string
          taxa_conversao_proposta?: number | null
          tempo_medio_resposta_segundos?: number | null
          total_conversas_fechadas?: number | null
          total_conversas_iniciadas?: number | null
          total_mensagens_enviadas_bot?: number | null
          total_mensagens_recebidas?: number | null
          total_propostas_aceitas?: number | null
          total_propostas_geradas?: number | null
          total_propostas_rejeitadas?: number | null
          whatsapp_conta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_metricas_agente_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metricas_agente_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_phone_numbers: {
        Row: {
          atualizado_em: string | null
          code_verification_status: string | null
          conta_id: string
          criado_em: string | null
          display_phone_number: string
          id: string
          is_principal: boolean | null
          is_registered: boolean | null
          name_status: string | null
          phone_number_id: string
          platform_type: string | null
          quality_rating: string | null
          throughput_level: string | null
          ultima_sincronizacao_em: string | null
          verified_name: string | null
        }
        Insert: {
          atualizado_em?: string | null
          code_verification_status?: string | null
          conta_id: string
          criado_em?: string | null
          display_phone_number: string
          id?: string
          is_principal?: boolean | null
          is_registered?: boolean | null
          name_status?: string | null
          phone_number_id: string
          platform_type?: string | null
          quality_rating?: string | null
          throughput_level?: string | null
          ultima_sincronizacao_em?: string | null
          verified_name?: string | null
        }
        Update: {
          atualizado_em?: string | null
          code_verification_status?: string | null
          conta_id?: string
          criado_em?: string | null
          display_phone_number?: string
          id?: string
          is_principal?: boolean | null
          is_registered?: boolean | null
          name_status?: string | null
          phone_number_id?: string
          platform_type?: string | null
          quality_rating?: string | null
          throughput_level?: string | null
          ultima_sincronizacao_em?: string | null
          verified_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_phone_numbers_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_phone_numbers_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_propostas_comerciais: {
        Row: {
          aceito_em: string | null
          aprovada_por_diretoria_em: string | null
          aprovada_por_id: string | null
          atualizado_em: string | null
          condicao_pagamento: string | null
          conversa_id: string
          criado_em: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          enviado_em: string | null
          expira_em: string | null
          id: string
          impostos_percentual: number | null
          impostos_valor: number | null
          mensagem_negociacao: string | null
          mensagem_proposta_id: string | null
          motivo_rejeicao_diretoria: string | null
          numero_proposta: string
          observacoes: string | null
          oportunidade_id: string | null
          prazo_entrega_dias: number | null
          requer_aprovacao_diretoria: boolean | null
          status: Database["public"]["Enums"]["status_proposta"] | null
          subtotal: number
          total_contraproposta: number | null
          validade_dias: number | null
          valor_frete: number | null
          valor_total: number
          venda_id: string | null
        }
        Insert: {
          aceito_em?: string | null
          aprovada_por_diretoria_em?: string | null
          aprovada_por_id?: string | null
          atualizado_em?: string | null
          condicao_pagamento?: string | null
          conversa_id: string
          criado_em?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          enviado_em?: string | null
          expira_em?: string | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          mensagem_negociacao?: string | null
          mensagem_proposta_id?: string | null
          motivo_rejeicao_diretoria?: string | null
          numero_proposta: string
          observacoes?: string | null
          oportunidade_id?: string | null
          prazo_entrega_dias?: number | null
          requer_aprovacao_diretoria?: boolean | null
          status?: Database["public"]["Enums"]["status_proposta"] | null
          subtotal?: number
          total_contraproposta?: number | null
          validade_dias?: number | null
          valor_frete?: number | null
          valor_total: number
          venda_id?: string | null
        }
        Update: {
          aceito_em?: string | null
          aprovada_por_diretoria_em?: string | null
          aprovada_por_id?: string | null
          atualizado_em?: string | null
          condicao_pagamento?: string | null
          conversa_id?: string
          criado_em?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          enviado_em?: string | null
          expira_em?: string | null
          id?: string
          impostos_percentual?: number | null
          impostos_valor?: number | null
          mensagem_negociacao?: string | null
          mensagem_proposta_id?: string | null
          motivo_rejeicao_diretoria?: string | null
          numero_proposta?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          prazo_entrega_dias?: number | null
          requer_aprovacao_diretoria?: boolean | null
          status?: Database["public"]["Enums"]["status_proposta"] | null
          subtotal?: number
          total_contraproposta?: number | null
          validade_dias?: number | null
          valor_frete?: number | null
          valor_total?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_propostas_comerciais_aprovada_por_id_fkey"
            columns: ["aprovada_por_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_comerciais_aprovada_por_id_fkey"
            columns: ["aprovada_por_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_comerciais_aprovada_por_id_fkey"
            columns: ["aprovada_por_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_comerciais_aprovada_por_id_fkey"
            columns: ["aprovada_por_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_comerciais_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_comerciais_mensagem_proposta_id_fkey"
            columns: ["mensagem_proposta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_comerciais_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_comerciais_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_propostas_itens: {
        Row: {
          criado_em: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          id: string
          nome_produto: string
          observacoes: string | null
          ordem: number | null
          preco_unitario: number
          produto_id: string
          proposta_id: string
          quantidade: number
          referencia_interna: string | null
          subtotal: number
        }
        Insert: {
          criado_em?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          nome_produto: string
          observacoes?: string | null
          ordem?: number | null
          preco_unitario: number
          produto_id: string
          proposta_id: string
          quantidade: number
          referencia_interna?: string | null
          subtotal: number
        }
        Update: {
          criado_em?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          nome_produto?: string
          observacoes?: string | null
          ordem?: number | null
          preco_unitario?: number
          produto_id?: string
          proposta_id?: string
          quantidade?: number
          referencia_interna?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_propostas_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_mais_sugeridos_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_propostas_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_propostas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_reacoes: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          emoji: string
          id: string
          mensagem_externa_id: string | null
          mensagem_id: string
          reagido_por_contato_id: string | null
          reagido_por_tipo: string
          reagido_por_usuario_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          emoji: string
          id?: string
          mensagem_externa_id?: string | null
          mensagem_id: string
          reagido_por_contato_id?: string | null
          reagido_por_tipo: string
          reagido_por_usuario_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          emoji?: string
          id?: string
          mensagem_externa_id?: string | null
          mensagem_id?: string
          reagido_por_contato_id?: string | null
          reagido_por_tipo?: string
          reagido_por_usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_reacoes_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_reacoes_reagido_por_contato_id_fkey"
            columns: ["reagido_por_contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_reacoes_reagido_por_usuario_id_fkey"
            columns: ["reagido_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_reacoes_reagido_por_usuario_id_fkey"
            columns: ["reagido_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_reacoes_reagido_por_usuario_id_fkey"
            columns: ["reagido_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_reacoes_reagido_por_usuario_id_fkey"
            columns: ["reagido_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_respostas_rapidas: {
        Row: {
          atalho: string
          ativa: boolean | null
          atualizado_em: string | null
          categoria: string | null
          compartilhada_equipe: boolean | null
          criado_em: string | null
          criado_por: string
          excluido_em: string | null
          id: string
          mensagem: string
          privada: boolean | null
          tags: string[] | null
          tem_midia: boolean | null
          tipo_midia: string | null
          titulo: string
          total_usos: number | null
          ultima_utilizacao_em: string | null
          url_midia: string | null
          whatsapp_conta_id: string | null
        }
        Insert: {
          atalho: string
          ativa?: boolean | null
          atualizado_em?: string | null
          categoria?: string | null
          compartilhada_equipe?: boolean | null
          criado_em?: string | null
          criado_por: string
          excluido_em?: string | null
          id?: string
          mensagem: string
          privada?: boolean | null
          tags?: string[] | null
          tem_midia?: boolean | null
          tipo_midia?: string | null
          titulo: string
          total_usos?: number | null
          ultima_utilizacao_em?: string | null
          url_midia?: string | null
          whatsapp_conta_id?: string | null
        }
        Update: {
          atalho?: string
          ativa?: boolean | null
          atualizado_em?: string | null
          categoria?: string | null
          compartilhada_equipe?: boolean | null
          criado_em?: string | null
          criado_por?: string
          excluido_em?: string | null
          id?: string
          mensagem?: string
          privada?: boolean | null
          tags?: string[] | null
          tem_midia?: boolean | null
          tipo_midia?: string | null
          titulo?: string
          total_usos?: number | null
          ultima_utilizacao_em?: string | null
          url_midia?: string | null
          whatsapp_conta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_respostas_rapidas_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_respostas_rapidas_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_tabulacoes: {
        Row: {
          codigo_disposicao_id: string
          conversa_id: string
          criado_em: string | null
          id: string
          observacoes: string | null
          proximo_contato_em: string | null
          proximo_passo: string | null
          subcategoria: string | null
          tabulado_em: string | null
          tabulado_por: string
        }
        Insert: {
          codigo_disposicao_id: string
          conversa_id: string
          criado_em?: string | null
          id?: string
          observacoes?: string | null
          proximo_contato_em?: string | null
          proximo_passo?: string | null
          subcategoria?: string | null
          tabulado_em?: string | null
          tabulado_por: string
        }
        Update: {
          codigo_disposicao_id?: string
          conversa_id?: string
          criado_em?: string | null
          id?: string
          observacoes?: string | null
          proximo_contato_em?: string | null
          proximo_passo?: string | null
          subcategoria?: string | null
          tabulado_em?: string | null
          tabulado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tabulacoes_codigo_disposicao_id_fkey"
            columns: ["codigo_disposicao_id"]
            isOneToOne: false
            referencedRelation: "codigos_disposicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_tabulacoes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          aprovado_em: string | null
          ativo: boolean | null
          atualizado_em: string | null
          botoes: Json | null
          categoria: string
          components_meta: Json | null
          corpo: string
          criado_em: string | null
          criado_por: string | null
          excluido_em: string | null
          id: string
          idioma: string | null
          meta_template_id: string | null
          motivo_rejeicao: string | null
          nome_template: string
          numero_parametros: number | null
          parametros: Json | null
          permite_personalizar: boolean | null
          quality_score: Json | null
          quality_score_date: string | null
          rejeitado_em: string | null
          requer_aprovacao_envio: boolean | null
          rodape: string | null
          sincronizado_com_meta: boolean | null
          status_aprovacao: string | null
          subcategoria: string | null
          tags: string[] | null
          taxa_conversao: number | null
          tem_botoes: boolean | null
          template_externo_id: string | null
          tipo_midia_header: string | null
          titulo: string | null
          total_entregues: number | null
          total_enviados: number | null
          total_lidos: number | null
          total_respondidos: number | null
          ultima_sincronizacao_em: string | null
          ultimo_envio_em: string | null
          url_midia_exemplo: string | null
          whatsapp_conta_id: string
        }
        Insert: {
          aprovado_em?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          botoes?: Json | null
          categoria: string
          components_meta?: Json | null
          corpo: string
          criado_em?: string | null
          criado_por?: string | null
          excluido_em?: string | null
          id?: string
          idioma?: string | null
          meta_template_id?: string | null
          motivo_rejeicao?: string | null
          nome_template: string
          numero_parametros?: number | null
          parametros?: Json | null
          permite_personalizar?: boolean | null
          quality_score?: Json | null
          quality_score_date?: string | null
          rejeitado_em?: string | null
          requer_aprovacao_envio?: boolean | null
          rodape?: string | null
          sincronizado_com_meta?: boolean | null
          status_aprovacao?: string | null
          subcategoria?: string | null
          tags?: string[] | null
          taxa_conversao?: number | null
          tem_botoes?: boolean | null
          template_externo_id?: string | null
          tipo_midia_header?: string | null
          titulo?: string | null
          total_entregues?: number | null
          total_enviados?: number | null
          total_lidos?: number | null
          total_respondidos?: number | null
          ultima_sincronizacao_em?: string | null
          ultimo_envio_em?: string | null
          url_midia_exemplo?: string | null
          whatsapp_conta_id: string
        }
        Update: {
          aprovado_em?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          botoes?: Json | null
          categoria?: string
          components_meta?: Json | null
          corpo?: string
          criado_em?: string | null
          criado_por?: string | null
          excluido_em?: string | null
          id?: string
          idioma?: string | null
          meta_template_id?: string | null
          motivo_rejeicao?: string | null
          nome_template?: string
          numero_parametros?: number | null
          parametros?: Json | null
          permite_personalizar?: boolean | null
          quality_score?: Json | null
          quality_score_date?: string | null
          rejeitado_em?: string | null
          requer_aprovacao_envio?: boolean | null
          rodape?: string | null
          sincronizado_com_meta?: boolean | null
          status_aprovacao?: string | null
          subcategoria?: string | null
          tags?: string[] | null
          taxa_conversao?: number | null
          tem_botoes?: boolean | null
          template_externo_id?: string | null
          tipo_midia_header?: string | null
          titulo?: string | null
          total_entregues?: number | null
          total_enviados?: number | null
          total_lidos?: number | null
          total_respondidos?: number | null
          ultima_sincronizacao_em?: string | null
          ultimo_envio_em?: string | null
          url_midia_exemplo?: string | null
          whatsapp_conta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates_historico: {
        Row: {
          criado_em: string | null
          dados_meta: Json | null
          id: string
          motivo_rejeicao: string | null
          quality_score: Json | null
          sincronizado_em: string | null
          status_anterior: string | null
          status_novo: string
          template_id: string
        }
        Insert: {
          criado_em?: string | null
          dados_meta?: Json | null
          id?: string
          motivo_rejeicao?: string | null
          quality_score?: Json | null
          sincronizado_em?: string | null
          status_anterior?: string | null
          status_novo: string
          template_id: string
        }
        Update: {
          criado_em?: string | null
          dados_meta?: Json | null
          id?: string
          motivo_rejeicao?: string | null
          quality_score?: Json | null
          sincronizado_em?: string | null
          status_anterior?: string | null
          status_novo?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_historico_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates_sistema: {
        Row: {
          atualizado_em: string | null
          codigo: string
          conteudo: string
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          esta_ativo: boolean | null
          id: string
          nome: string
          setor_id: string | null
          tipo: string
          unidade_id: string | null
          variaveis_disponiveis: string[] | null
        }
        Insert: {
          atualizado_em?: string | null
          codigo: string
          conteudo: string
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          esta_ativo?: boolean | null
          id?: string
          nome: string
          setor_id?: string | null
          tipo: string
          unidade_id?: string | null
          variaveis_disponiveis?: string[] | null
        }
        Update: {
          atualizado_em?: string | null
          codigo?: string
          conteudo?: string
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          esta_ativo?: boolean | null
          id?: string
          nome?: string
          setor_id?: string | null
          tipo?: string
          unidade_id?: string | null
          variaveis_disponiveis?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_sistema_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_sistema_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_tokens_log: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          detalhes: string | null
          id: string
          tipo_evento: string
          token_anterior_hash: string | null
          whatsapp_conta_id: string
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          detalhes?: string | null
          id?: string
          tipo_evento: string
          token_anterior_hash?: string | null
          whatsapp_conta_id: string
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          detalhes?: string | null
          id?: string
          tipo_evento?: string
          token_anterior_hash?: string | null
          whatsapp_conta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tokens_log_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_tokens_log_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_triagem_pendente: {
        Row: {
          aguardar_ate: string
          cliente_encontrado_id: string | null
          cnpj_informado: string | null
          cnpj_solicitado: boolean | null
          cnpj_solicitado_em: string | null
          cnpj_validado: boolean | null
          cnpj_validado_em: string | null
          conta_id: string | null
          contato_id: string | null
          conversa_id: string
          criado_em: string
          erro_mensagem: string | null
          fila_definida_id: string | null
          id: string
          max_tentativas: number | null
          motivo_atribuicao: string | null
          operador_atribuido_id: string | null
          processado_em: string | null
          resultado_triagem: Json | null
          status: string
          tentativas: number | null
          vendedor_encontrado_id: string | null
        }
        Insert: {
          aguardar_ate?: string
          cliente_encontrado_id?: string | null
          cnpj_informado?: string | null
          cnpj_solicitado?: boolean | null
          cnpj_solicitado_em?: string | null
          cnpj_validado?: boolean | null
          cnpj_validado_em?: string | null
          conta_id?: string | null
          contato_id?: string | null
          conversa_id: string
          criado_em?: string
          erro_mensagem?: string | null
          fila_definida_id?: string | null
          id?: string
          max_tentativas?: number | null
          motivo_atribuicao?: string | null
          operador_atribuido_id?: string | null
          processado_em?: string | null
          resultado_triagem?: Json | null
          status?: string
          tentativas?: number | null
          vendedor_encontrado_id?: string | null
        }
        Update: {
          aguardar_ate?: string
          cliente_encontrado_id?: string | null
          cnpj_informado?: string | null
          cnpj_solicitado?: boolean | null
          cnpj_solicitado_em?: string | null
          cnpj_validado?: boolean | null
          cnpj_validado_em?: string | null
          conta_id?: string | null
          contato_id?: string | null
          conversa_id?: string
          criado_em?: string
          erro_mensagem?: string | null
          fila_definida_id?: string | null
          id?: string
          max_tentativas?: number | null
          motivo_atribuicao?: string | null
          operador_atribuido_id?: string | null
          processado_em?: string | null
          resultado_triagem?: Json | null
          status?: string
          tentativas?: number | null
          vendedor_encontrado_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_triagem_pendente_cliente_encontrado_id_fkey"
            columns: ["cliente_encontrado_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_cliente_encontrado_id_fkey"
            columns: ["cliente_encontrado_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_fila_definida_id_fkey"
            columns: ["fila_definida_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_operador_atribuido_id_fkey"
            columns: ["operador_atribuido_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_operador_atribuido_id_fkey"
            columns: ["operador_atribuido_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_operador_atribuido_id_fkey"
            columns: ["operador_atribuido_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_operador_atribuido_id_fkey"
            columns: ["operador_atribuido_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_vendedor_encontrado_id_fkey"
            columns: ["vendedor_encontrado_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_vendedor_encontrado_id_fkey"
            columns: ["vendedor_encontrado_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_vendedor_encontrado_id_fkey"
            columns: ["vendedor_encontrado_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "whatsapp_triagem_pendente_vendedor_encontrado_id_fkey"
            columns: ["vendedor_encontrado_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_unidades: {
        Row: {
          aceita_atendimento_remoto: boolean | null
          atualizado_em: string | null
          bairro: string | null
          cep: string | null
          cidade: string
          cnpj: string | null
          codigo: string | null
          complemento: string | null
          criado_em: string | null
          criado_por: string | null
          email: string | null
          estado: string
          excluido_em: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          nome: string
          numero: string | null
          pais: string | null
          prioridade_roteamento: number | null
          raio_cobertura_km: number | null
          status: string | null
          telefone_principal: string | null
          telefone_whatsapp: string | null
          whatsapp_conta_id: string | null
        }
        Insert: {
          aceita_atendimento_remoto?: boolean | null
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade: string
          cnpj?: string | null
          codigo?: string | null
          complemento?: string | null
          criado_em?: string | null
          criado_por?: string | null
          email?: string | null
          estado: string
          excluido_em?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome: string
          numero?: string | null
          pais?: string | null
          prioridade_roteamento?: number | null
          raio_cobertura_km?: number | null
          status?: string | null
          telefone_principal?: string | null
          telefone_whatsapp?: string | null
          whatsapp_conta_id?: string | null
        }
        Update: {
          aceita_atendimento_remoto?: boolean | null
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string
          cnpj?: string | null
          codigo?: string | null
          complemento?: string | null
          criado_em?: string | null
          criado_por?: string | null
          email?: string | null
          estado?: string
          excluido_em?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome?: string
          numero?: string | null
          pais?: string | null
          prioridade_roteamento?: number | null
          raio_cobertura_km?: number | null
          status?: string | null
          telefone_principal?: string | null
          telefone_whatsapp?: string | null
          whatsapp_conta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_unidades_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_unidades_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhooks_log: {
        Row: {
          conversa_id: string | null
          erro_processamento: string | null
          evento_externo_id: string | null
          headers: Json | null
          id: string
          mensagem_id: string | null
          payload: Json
          processado: boolean | null
          processado_em: string | null
          provedor: string
          recebido_em: string | null
          tentativas_processamento: number | null
          tipo_evento: string
          whatsapp_conta_id: string | null
        }
        Insert: {
          conversa_id?: string | null
          erro_processamento?: string | null
          evento_externo_id?: string | null
          headers?: Json | null
          id?: string
          mensagem_id?: string | null
          payload: Json
          processado?: boolean | null
          processado_em?: string | null
          provedor: string
          recebido_em?: string | null
          tentativas_processamento?: number | null
          tipo_evento: string
          whatsapp_conta_id?: string | null
        }
        Update: {
          conversa_id?: string | null
          erro_processamento?: string | null
          evento_externo_id?: string | null
          headers?: Json | null
          id?: string
          mensagem_id?: string | null
          payload?: Json
          processado?: boolean | null
          processado_em?: string | null
          provedor?: string
          recebido_em?: string | null
          tentativas_processamento?: number | null
          tipo_evento?: string
          whatsapp_conta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhooks_log_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhooks_log_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhooks_log_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_whatsapp_tokens_expirando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhooks_log_whatsapp_conta_id_fkey"
            columns: ["whatsapp_conta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_agente_ia_resumo: {
        Row: {
          oportunidades_criadas: number | null
          sessoes_ativas: number | null
          tempo_medio_tools_ms: number | null
          total_erros: number | null
          total_sessoes: number | null
          total_tokens_entrada: number | null
          total_tokens_saida: number | null
          total_tools_executadas: number | null
          ultima_atualizacao: string | null
        }
        Relationships: []
      }
      mv_agente_por_dia: {
        Row: {
          data: string | null
          erros: number | null
          oportunidades: number | null
          sessoes: number | null
          tokens_total: number | null
          tools_executadas: number | null
        }
        Relationships: []
      }
      mv_agente_providers_uso: {
        Row: {
          provider: string | null
          tempo_medio_ms: number | null
          tokens_entrada: number | null
          tokens_saida: number | null
          total_chamadas: number | null
        }
        Relationships: []
      }
      mv_agente_sessoes_por_estado: {
        Row: {
          estado_atual: string | null
          media_mensagens: number | null
          media_tools: number | null
          primeira_sessao: string | null
          quantidade: number | null
          ultima_sessao: string | null
        }
        Relationships: []
      }
      mv_agente_tools_performance: {
        Row: {
          max_ms: number | null
          p95_ms: number | null
          taxa_erro_percent: number | null
          tempo_medio_ms: number | null
          tool_name: string | null
          total_chamadas: number | null
          total_erros: number | null
        }
        Relationships: []
      }
      mv_atividades_prioridade: {
        Row: {
          calculado_em: string | null
          cliente_id: string | null
          cliente_nome: string | null
          data_vencimento: string | null
          equipe_id: string | null
          id: string | null
          numero_atividade: string | null
          prioridade: Database["public"]["Enums"]["prioridade_atividade"] | null
          responsavel_id: string | null
          responsavel_nome: string | null
          score_calculado: number | null
          score_decaimento_calculado: number | null
          score_engajamento: number | null
          score_lead_fit: number | null
          score_urgencia_calculado: number | null
          status: Database["public"]["Enums"]["status_atividade"] | null
          tipo: Database["public"]["Enums"]["tipo_atividade"] | null
          titulo: string | null
          venda_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_completo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "atividades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "atividades_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "atividades_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_clientes_por_estado: {
        Row: {
          estado: string | null
          quantidade: number | null
        }
        Relationships: []
      }
      mv_clientes_por_mes: {
        Row: {
          mes: string | null
          ordem_mes: number | null
          quantidade: number | null
        }
        Relationships: []
      }
      mv_clientes_por_natureza: {
        Row: {
          natureza: string | null
          quantidade: number | null
        }
        Relationships: []
      }
      mv_clientes_resumo: {
        Row: {
          atualizado_em: string | null
          clientes_pf: number | null
          clientes_pj: number | null
          limite_total: number | null
          novos_mes: number | null
          total_clientes: number | null
          total_contatos: number | null
        }
        Relationships: []
      }
      mv_conversas_por_status: {
        Row: {
          quantidade: number | null
          status: string | null
        }
        Relationships: []
      }
      mv_cotacoes_por_status: {
        Row: {
          quantidade: number | null
          status: string | null
        }
        Relationships: []
      }
      mv_dashboard_kpis: {
        Row: {
          atualizado_em: string | null
          taxa_conversao: number | null
          tickets_abertos: number | null
          total_clientes: number | null
          total_produtos: number | null
          total_vendas: number | null
          valor_pipeline_ativo: number | null
        }
        Relationships: []
      }
      mv_ged_por_tipo: {
        Row: {
          cor: string | null
          icone: string | null
          tipo_id: string | null
          tipo_nome: string | null
          total: number | null
          vencendo: number | null
          vencidos: number | null
        }
        Relationships: []
      }
      mv_ged_resumo: {
        Row: {
          docs_sem_validade: number | null
          docs_validos: number | null
          docs_vencendo: number | null
          docs_vencidos: number | null
          total_bytes: number | null
          total_documentos: number | null
          total_tipos: number | null
        }
        Relationships: []
      }
      mv_pipeline_por_etapa: {
        Row: {
          atualizado_em: string | null
          etapa: string | null
          etapa_label: string | null
          quantidade: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      mv_plataformas_resumo: {
        Row: {
          atualizado_em: string | null
          cotacoes_pendentes: number | null
          cotacoes_respondidas: number | null
          taxa_resposta: number | null
          total_cotacoes: number | null
          total_itens: number | null
          total_plataformas: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      mv_produtos_por_estoque: {
        Row: {
          quantidade: number | null
          status: string | null
        }
        Relationships: []
      }
      mv_produtos_resumo: {
        Row: {
          atualizado_em: string | null
          com_embedding: number | null
          com_estoque: number | null
          produtos_ativos: number | null
          sem_estoque: number | null
          taxa_embedding: number | null
          total_produtos: number | null
          valor_estoque: number | null
        }
        Relationships: []
      }
      mv_propostas_por_status: {
        Row: {
          quantidade: number | null
          status: string | null
        }
        Relationships: []
      }
      mv_tickets_por_prioridade: {
        Row: {
          prioridade: string | null
          quantidade: number | null
        }
        Relationships: []
      }
      mv_tickets_por_status: {
        Row: {
          quantidade: number | null
          status: string | null
        }
        Relationships: []
      }
      mv_tickets_resumo: {
        Row: {
          atualizado_em: string | null
          taxa_resolucao: number | null
          tickets_abertos: number | null
          tickets_em_andamento: number | null
          tickets_resolvidos: number | null
          tickets_urgentes: number | null
          total_tickets: number | null
        }
        Relationships: []
      }
      mv_top_vendedores: {
        Row: {
          atualizado_em: string | null
          meta: number | null
          nome: string | null
          percentual: number | null
          realizado: number | null
          vendedor_id: string | null
        }
        Relationships: []
      }
      mv_vendas_por_etapa: {
        Row: {
          etapa: string | null
          quantidade: number | null
          valor: number | null
        }
        Relationships: []
      }
      mv_vendas_por_mes: {
        Row: {
          atualizado_em: string | null
          mes: string | null
          mes_abrev: string | null
          ordem_mes: number | null
          quantidade: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      mv_vendas_resumo: {
        Row: {
          atualizado_em: string | null
          taxa_conversao: number | null
          ticket_medio: number | null
          total_vendas: number | null
          valor_mes: number | null
          valor_total: number | null
          vendas_ganhas: number | null
        }
        Relationships: []
      }
      mv_whatsapp_bam_dashboard: {
        Row: {
          atendimentos_em_andamento: number | null
          atualizado_em: string | null
          conversas_ativas: number | null
          conversas_detratores: number | null
          conversas_hoje: number | null
          conversas_na_fila: number | null
          operadores_ocupados: number | null
          operadores_offline: number | null
          operadores_online: number | null
          operadores_pausa: number | null
          tempo_max_espera_segundos: number | null
          tempo_medio_espera_segundos: number | null
          tma_medio_segundos: number | null
          total_fila_espera: number | null
        }
        Relationships: []
      }
      mv_whatsapp_resumo: {
        Row: {
          atualizado_em: string | null
          contas_ativas: number | null
          conversas_ativas: number | null
          mensagens_bot: number | null
          propostas_aceitas: number | null
          taxa_conversao: number | null
          total_conversas: number | null
          total_mensagens: number | null
          total_propostas: number | null
          valor_propostas: number | null
        }
        Relationships: []
      }
      vw_analise_ia_dashboard: {
        Row: {
          analises_com_erro: number | null
          analises_concluidas: number | null
          analises_ultimas_24h: number | null
          analises_ultimos_7_dias: number | null
          em_analise_agora: number | null
          modelo_mais_usado: string | null
          taxa_automacao_percent: number | null
          taxa_erro_percent: number | null
          taxa_sugestoes_percent: number | null
          tempo_medio_analise_seg: number | null
          total_analisadas: number | null
          total_cotacoes: number | null
          total_itens_analisados: number | null
          total_itens_cotacoes: number | null
          total_sugestoes_geradas: number | null
        }
        Relationships: []
      }
      vw_analise_ia_por_dia: {
        Row: {
          analises_com_erro: number | null
          analises_concluidas: number | null
          data: string | null
          tempo_medio_seg: number | null
          total_analises: number | null
          total_sugestoes: number | null
        }
        Relationships: []
      }
      vw_clientes_completo: {
        Row: {
          cgc: string | null
          classificacao: string | null
          cliente_id: string | null
          conta_id: string | null
          contatos: Json | null
          e_mail: string | null
          estagio_ciclo_vida: string | null
          ins_estadual: string | null
          lim_credito: number | null
          limite_disponivel: number | null
          nome_abrev: string | null
          nome_conta: string | null
          nome_emit: string | null
          numero_funcionarios: number | null
          origem_lead: string | null
          proprietario_id: string | null
          receita_anual: number | null
          setor: string | null
          site: string | null
          telefone1: string | null
          tipo_conta: string | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_estatisticas_metas_equipe: {
        Row: {
          equipe_id: string | null
          equipe_nome: string | null
          media_conclusao: number | null
          metas_atingidas: number | null
          metas_ativas: number | null
          metas_concluidas: number | null
          metas_vencidas: number | null
          total_metas: number | null
        }
        Relationships: []
      }
      vw_metas_com_progresso: {
        Row: {
          alerta_percentual: number | null
          alertas_nao_lidos: number | null
          atualizado_em: string | null
          cancelado_em: string | null
          concluido_em: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          dias_decorridos: number | null
          dias_restantes: number | null
          equipe_id: string | null
          equipe_nome: string | null
          id: string | null
          lider_equipe_id: string | null
          meta_atingida: boolean | null
          metrica: string | null
          motivo_cancelamento: string | null
          nome: string | null
          percentual_conclusao: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          prioridade: string | null
          situacao_prazo: string | null
          status: string | null
          tipo_meta: string | null
          total_dias: number | null
          unidade_medida: string | null
          valor_atual: number | null
          valor_objetivo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "mv_top_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_performance_vendedor"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "metas_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "vw_vendedores_disponiveis"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "metas_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "metas_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      vw_performance_vendedor: {
        Row: {
          equipe_id: string | null
          equipe_nome: string | null
          margem_media: number | null
          meta_valor: number | null
          nome_vendedor: string | null
          percentual_atingimento: number | null
          probabilidade_media: number | null
          realizado_valor: number | null
          taxa_conversao: number | null
          ticket_medio: number | null
          total_vendas: number | null
          valor_vendido: number | null
          vendas_ganhas: number | null
          vendas_perdidas: number | null
          vendedor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "membros_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      vw_produtos_mais_sugeridos_ia: {
        Row: {
          id: string | null
          nome: string | null
          referencia_interna: string | null
          score_medio: number | null
          taxa_aceitacao_percent: number | null
          vezes_aceito: number | null
          vezes_sugerido: number | null
        }
        Relationships: []
      }
      vw_soma_metas_vendedores_equipe: {
        Row: {
          conversao_atual_media: number | null
          equipe_id: string | null
          margem_atual_media: number | null
          meta_conversao_media: number | null
          meta_margem_media: number | null
          percentual_atingimento: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          status_geral: string | null
          total_meta_unidades: number | null
          total_meta_valor: number | null
          total_realizado_unidades: number | null
          total_realizado_valor: number | null
          total_vendedores: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_vendedor_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_estatisticas_metas_equipe"
            referencedColumns: ["equipe_id"]
          },
          {
            foreignKeyName: "metas_vendedor_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "vw_turnover_equipes"
            referencedColumns: ["equipe_id"]
          },
        ]
      }
      vw_turnover_equipes: {
        Row: {
          equipe_id: string | null
          equipe_nome: string | null
          membros_ativos: number | null
          membros_saidos: number | null
          taxa_turnover_percent: number | null
          tempo_medio_permanencia_dias: number | null
          total_membros_historico: number | null
        }
        Relationships: []
      }
      vw_vendedores_disponiveis: {
        Row: {
          conversas_ativas: number | null
          conversas_disponiveis: number | null
          esta_disponivel: boolean | null
          horario_trabalho_fim: string | null
          horario_trabalho_inicio: string | null
          max_conversas_simultaneas: number | null
          nome_completo: string | null
          pode_receber_conversa: boolean | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_whatsapp_tokens_expirando: {
        Row: {
          dias_restantes: number | null
          id: string | null
          nome_conta: string | null
          provedor: string | null
          status_token: string | null
          token_alertado_em: string | null
          token_expira_em: string | null
        }
        Insert: {
          dias_restantes?: never
          id?: string | null
          nome_conta?: string | null
          provedor?: string | null
          status_token?: never
          token_alertado_em?: string | null
          token_expira_em?: string | null
        }
        Update: {
          dias_restantes?: never
          id?: string | null
          nome_conta?: string | null
          provedor?: string | null
          status_token?: never
          token_alertado_em?: string | null
          token_expira_em?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adicionar_item_carrinho:
        | {
            Args: {
              p_conversa_id: string
              p_preco_unitario?: number
              p_produto_id: string
              p_produto_nome: string
              p_produto_referencia?: string
              p_quantidade: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_conversa_id: string
              p_preco_unitario?: number
              p_produto_id: string
              p_produto_nome?: string
              p_produto_referencia?: string
              p_quantidade: number
            }
            Returns: Json
          }
      ajustar_score_aprendizado: {
        Args: {
          p_feedback_tipo: string
          p_produto_id: string
          p_score_original: number
        }
        Returns: undefined
      }
      alterar_quantidade_item_carrinho: {
        Args: {
          p_conversa_id: string
          p_nova_quantidade?: number
          p_numero_item?: number
          p_produto_id?: string
        }
        Returns: Json
      }
      atribuir_conversas_em_fila: { Args: never; Returns: number }
      atualizar_cron_job: {
        Args: { p_command: string; p_jobid: number; p_schedule: string }
        Returns: boolean
      }
      atualizar_itens_oportunidade_batch: {
        Args: { p_itens: Json; p_oportunidade_id: string }
        Returns: Json
      }
      atualizar_progresso_meta: {
        Args: {
          _meta_id: string
          _novo_valor: number
          _observacao?: string
          _origem?: string
          _referencia_id?: string
        }
        Returns: Json
      }
      atualizar_sequencia_itens_venda: {
        Args: { p_updates: Json }
        Returns: undefined
      }
      auth_check_any_role: { Args: { _roles: string[] }; Returns: boolean }
      auth_check_high_hierarchy: { Args: never; Returns: boolean }
      auth_check_vendas_access: {
        Args: { _cliente_id: string; _user_id: string; _vendedor_id: string }
        Returns: boolean
      }
      auth_has_role: { Args: { _role: string }; Returns: boolean }
      auth_is_admin: { Args: never; Returns: boolean }
      auth_is_manager: { Args: never; Returns: boolean }
      batch_insert_vendas_itens: { Args: { p_items: Json }; Returns: number }
      batch_update_itens_oportunidade: {
        Args: { p_items: Json; p_oportunidade_id: string }
        Returns: number
      }
      batch_update_vendas_itens: {
        Args: { p_items: Json; p_venda_id: string }
        Returns: number
      }
      buscar_contato_crm_por_telefone: {
        Args: { numero_whatsapp: string }
        Returns: string
      }
      buscar_operador_carteira: {
        Args: { p_contato_id: string }
        Returns: string
      }
      buscar_produtos_hibrido: {
        Args: { p_descricao: string; p_limite?: number; p_numeros?: string[] }
        Returns: {
          id: string
          narrativa: string
          nome: string
          preco_venda: number
          quantidade_em_maos: number
          referencia_interna: string
          score_numeros: number
          score_texto: number
          score_total: number
          unidade_medida: string
        }[]
      }
      buscar_produtos_similares: {
        Args: {
          p_descricao: string
          p_limite?: number
          p_similaridade_minima?: number
        }
        Returns: {
          id: string
          narrativa: string
          nome: string
          preco_venda: number
          quantidade_em_maos: number
          referencia_interna: string
          score_similaridade: number
          unidade_medida: string
        }[]
      }
      buscar_triagens_pendentes: {
        Args: { p_limit?: number }
        Returns: {
          cliente_encontrado_id: string
          cnpj_informado: string
          cnpj_solicitado: boolean
          conta_id: string
          contato_id: string
          conversa_id: string
          id: string
          tentativas: number
        }[]
      }
      calcular_score_prioridade: {
        Args: { p_atividade_id: string }
        Returns: number
      }
      calcular_tempo_efetivo_ticket: {
        Args: { ticket_id: string }
        Returns: Json
      }
      can_access_cliente: {
        Args: { _cliente_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_cliente_por_cgc: {
        Args: { _cgc: string; _user_id: string }
        Returns: boolean
      }
      can_access_menu_tecnico: { Args: { _user_id: string }; Returns: boolean }
      desabilitar_cron_job: { Args: { p_jobid: number }; Returns: boolean }
      distribuir_conversa_whatsapp: {
        Args: {
          p_conversa_id: string
          p_fila_id?: string
          p_unidade_id?: string
        }
        Returns: Json
      }
      executar_cron_job_manual: {
        Args: { p_jobid: number }
        Returns: undefined
      }
      fn_whatsapp_contadores_usuario: {
        Args: { p_user_id: string }
        Returns: Json
      }
      gerar_numero_ticket: { Args: never; Returns: string }
      gerar_token_proposta: { Args: never; Returns: string }
      get_clientes_acessiveis: {
        Args: { _user_id: string }
        Returns: {
          cliente_id: string
        }[]
      }
      get_connection_statistics: {
        Args: never
        Returns: {
          application_name: string
          count: number
          state: string
        }[]
      }
      get_equipes_gerenciadas: {
        Args: { _user_id: string }
        Returns: {
          equipe_id: string
        }[]
      }
      get_funil_vendas: {
        Args: { p_periodo_fim: string; p_periodo_inicio: string }
        Returns: {
          etapa: string
          quantidade: number
          valor_total: number
        }[]
      }
      get_kpis_gerais_periodo: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          numero_equipes: number
          pacing: number
          percentual_atingimento: number
          total_meta: number
          total_realizado: number
        }[]
      }
      get_linked_seller: {
        Args: { _backoffice_user_id: string }
        Returns: string
      }
      get_nivel_hierarquico: { Args: { _user_id: string }; Returns: number }
      get_oportunidades_pipeline_paginado: {
        Args: {
          p_limite_default?: number
          p_limites_por_estagio?: Json
          p_pipeline_id: string
        }
        Returns: {
          campos_customizados: Json
          codigo: string
          conta_nome: string
          contato_nome: string
          data_fechamento: string
          dias_no_estagio: number
          estagio_id: string
          id: string
          nome_oportunidade: string
          origem_lead: string
          percentual_probabilidade: number
          row_num: number
          total_estagio: number
          valor: number
          valor_total_estagio: number
        }[]
      }
      get_pacing_semanal: {
        Args: { p_periodo_fim: string; p_periodo_inicio: string }
        Returns: {
          data_semana: string
          meta: number
          projecao: number
          realizado: number
          semana: string
        }[]
      }
      get_pending_items: {
        Args: never
        Returns: {
          cnpj_cliente: string
          codigo_produto_cliente: string
          cotacao_id: string
          descricao_produto_cliente: string
          id_item_externo: string
          item_id: string
          numero_item: number
          plataforma_id: string
          quantidade_solicitada: number
          unidade_medida: string
        }[]
      }
      get_pipeline_fields: {
        Args: { p_estagio_id?: string; p_pipeline_id: string }
        Returns: {
          grupo: string
          id: string
          label: string
          largura: string
          nome_campo: string
          obrigatorio: boolean
          opcoes: Json
          ordem: number
          tipo_campo: Database["public"]["Enums"]["custom_field_tipo"]
          validacao: Json
          visivel_kanban: boolean
        }[]
      }
      get_table_statistics: {
        Args: never
        Returns: {
          idx_scan: number
          last_analyze: string
          last_vacuum: string
          n_dead_tup: number
          n_live_tup: number
          row_count: number
          seq_scan: number
          table_name: string
        }[]
      }
      get_user_claims: { Args: { _user_id: string }; Returns: Json }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          email: string
          is_admin: boolean
          is_manager: boolean
          is_sales: boolean
          is_support: boolean
          is_warehouse: boolean
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      get_user_team: { Args: { _user_id: string }; Returns: string }
      get_usuarios_subordinados: {
        Args: { _user_id: string }
        Returns: {
          nivel_distancia: number
          subordinado_id: string
        }[]
      }
      get_vendas_acessiveis: {
        Args: { _user_id: string }
        Returns: {
          venda_id: string
        }[]
      }
      get_vendas_pipeline_paginado:
        | {
            Args: {
              p_data_fim?: string
              p_data_inicio?: string
              p_limites_por_etapa?: Json
            }
            Returns: {
              cliente_cgc: string
              cliente_id: string
              cliente_nome: string
              created_at: string
              data_previsao_fechamento: string
              etapa_pipeline: Database["public"]["Enums"]["etapa_pipeline"]
              id: string
              numero_venda: string
              probabilidade: number
              total_por_etapa: number
              valor_estimado: number
            }[]
          }
        | {
            Args: { p_dias_atras?: number; p_limites_por_etapa?: Json }
            Returns: {
              cliente_id: string
              cliente_nome: string
              created_at: string
              data_fechamento_prevista: string
              etapa_pipeline: string
              id: string
              numero_venda: string
              probabilidade: number
              total_etapa: number
              total_itens: number
              valor_estimado: number
              valor_potencial_etapa: number
              valor_total_etapa: number
              vendedor_nome: string
            }[]
          }
      habilitar_cron_job: { Args: { p_jobid: number }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      historico_cron_job: {
        Args: { p_jobid: number; p_limit?: number }
        Returns: {
          command: string
          database: string
          end_time: string
          job_pid: number
          return_message: string
          runid: number
          start_time: string
          status: string
          username: string
        }[]
      }
      increment_sessao_tools: {
        Args: { sessao_id: string }
        Returns: undefined
      }
      inserir_itens_oportunidade_bulk: {
        Args: { p_itens: Json; p_oportunidade_id: string }
        Returns: undefined
      }
      inserir_itens_venda_bulk: {
        Args: { p_itens: Json; p_venda_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_leader: {
        Args: { _equipe_id: string; _user_id: string }
        Returns: boolean
      }
      limpar_notificacoes_antigas: { Args: never; Returns: undefined }
      list_users_with_roles: {
        Args: never
        Returns: {
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      listar_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      match_produtos: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          narrativa: string
          nome: string
          preco_venda: number
          quantidade_em_maos: number
          referencia_interna: string
          similarity: number
        }[]
      }
      match_produtos_hibrido: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
        }
        Returns: {
          id: string
          match_type: string
          narrativa: string
          nome: string
          preco_venda: number
          quantidade_em_maos: number
          referencia_interna: string
          similarity: number
        }[]
      }
      normalizar_telefone: { Args: { telefone: string }; Returns: string }
      obter_carrinho_completo: {
        Args: { p_conversa_id: string }
        Returns: Json
      }
      pode_acessar_cliente: {
        Args: { _cliente_id: string; _user_id: string }
        Returns: boolean
      }
      pode_acessar_venda: {
        Args: { _user_id: string; _venda_id: string }
        Returns: boolean
      }
      processar_jobs_recalculo_oportunidade: {
        Args: { p_limite?: number }
        Returns: {
          jobs_com_erro: number
          jobs_processados: number
        }[]
      }
      recalcular_metas_correcao: {
        Args: never
        Returns: {
          metas_concluidas: number
          metas_recalculadas: number
        }[]
      }
      recalcular_todas_metas: { Args: never; Returns: Json }
      recalcular_todas_metas_vendas: { Args: never; Returns: number }
      recalcular_valor_meta_vendas: {
        Args: { _meta_id: string }
        Returns: undefined
      }
      recalcular_valor_meta_vendedor: {
        Args: { _meta_id: string }
        Returns: undefined
      }
      recuperar_contexto_relevante: {
        Args: {
          p_conversa_id: string
          p_limite?: number
          p_query_embedding: string
        }
        Returns: {
          conteudo: string
          criado_em: string
          memoria_id: string
          produtos: string[]
          relevancia: number
          tipo_interacao: string
        }[]
      }
      refresh_all_dashboard_mvs: { Args: never; Returns: undefined }
      refresh_dashboard_views: { Args: never; Returns: undefined }
      refresh_ged_mvs: { Args: never; Returns: undefined }
      refresh_mv_agente_ia: { Args: never; Returns: undefined }
      refresh_mv_atividades_prioridade: { Args: never; Returns: undefined }
      refresh_whatsapp_bam_dashboard: { Args: never; Returns: undefined }
      registrar_feedback_ia: {
        Args: {
          p_feedback_tipo: string
          p_item_id: string
          p_produto_escolhido_id: string
          p_produto_sugerido_id: string
          p_score_ia: number
        }
        Returns: undefined
      }
      remover_item_carrinho: {
        Args: {
          p_conversa_id: string
          p_numero_item?: number
          p_produto_id?: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transferir_lideranca_equipe: {
        Args: { _equipe_id: string; _motivo?: string; _novo_lider_id: string }
        Returns: Json
      }
      transferir_membro_equipe: {
        Args: {
          _equipe_destino_id: string
          _equipe_origem_id: string
          _manter_papel?: boolean
          _motivo?: string
          _novo_papel?: string
          _usuario_id: string
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      verificar_alertas_metas: { Args: never; Returns: undefined }
      verificar_dentro_expediente: {
        Args: {
          p_setor_id?: string
          p_timestamp?: string
          p_unidade_id?: string
        }
        Returns: Json
      }
      verificar_tokens_whatsapp_expirando: {
        Args: never
        Returns: {
          conta_id_out: string
          dias_restantes: number
          nome_conta_out: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "sales"
        | "warehouse"
        | "support"
        | "lider"
        | "backoffice"
        | "diretor_comercial"
        | "gerente_comercial"
        | "coordenador_comercial"
        | "gestor_equipe"
        | "representante_comercial"
        | "executivo_contas"
        | "consultor_vendas"
      custom_field_tipo:
        | "text"
        | "textarea"
        | "number"
        | "decimal"
        | "currency"
        | "percentage"
        | "date"
        | "datetime"
        | "select"
        | "multiselect"
        | "checkbox"
        | "radio"
        | "email"
        | "phone"
        | "url"
        | "cnpj"
        | "cpf"
        | "cep"
        | "file"
        | "user"
        | "client"
        | "product"
        | "select_tipo_pedido"
        | "select_condicao_pagamento"
        | "select_tipo_frete"
      etapa_pipeline:
        | "prospeccao"
        | "qualificacao"
        | "proposta"
        | "negociacao"
        | "fechamento"
        | "ganho"
        | "perdido"
        | "followup_cliente"
      identificacao_tipo: "Cliente" | "Fornecedor" | "Ambos"
      metodo_vinculacao: "ia_automatico" | "ia_manual" | "manual" | "importado"
      natureza_tipo: "Juridica" | "Fisica"
      nivel_risco_auditoria: "baixo" | "medio" | "alto" | "critico"
      prioridade_atividade: "critica" | "alta" | "media" | "baixa"
      prioridade_ticket: "baixa" | "normal" | "alta" | "urgente"
      sentimento_tipo:
        | "muito_positivo"
        | "positivo"
        | "neutro"
        | "negativo"
        | "muito_negativo"
      status_analise_ia:
        | "pendente"
        | "em_analise"
        | "concluida"
        | "erro"
        | "cancelada"
      status_aprovacao: "pendente" | "aprovada" | "rejeitada" | "expirada"
      status_atividade:
        | "pendente"
        | "em_andamento"
        | "concluida"
        | "cancelada"
        | "reagendada"
        | "aguardando_resposta"
      status_entrega:
        | "pendente"
        | "em_transito"
        | "entregue"
        | "devolvido"
        | "cancelado"
      status_nota_fiscal: "emitida" | "cancelada" | "denegada" | "inutilizada"
      status_proposta:
        | "rascunho"
        | "enviada"
        | "aceita"
        | "rejeitada"
        | "negociacao"
        | "aprovacao_pendente"
        | "aprovada_diretoria"
        | "rejeitada_diretoria"
      status_solicitacao_cadastro:
        | "rascunho"
        | "em_analise"
        | "aprovado"
        | "rejeitado"
      status_ticket:
        | "aberto"
        | "em_andamento"
        | "aguardando_cliente"
        | "resolvido"
        | "fechado"
        | "cancelado"
      tipo_atividade:
        | "tarefa"
        | "chamada"
        | "reuniao"
        | "email"
        | "whatsapp"
        | "visita"
        | "follow_up"
        | "proposta"
        | "negociacao"
        | "outro"
      tipo_endereco: "principal" | "entrega" | "cobranca"
      tipo_feedback: "positivo" | "negativo" | "neutro"
      tipo_ticket:
        | "reclamacao"
        | "duvida"
        | "sugestao"
        | "elogio"
        | "garantia"
        | "troca"
        | "devolucao"
      what_tipo: "venda" | "oportunidade" | "conta" | "ticket" | "proposta"
      who_tipo: "lead" | "contato" | "cliente"
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
      app_role: [
        "admin",
        "manager",
        "sales",
        "warehouse",
        "support",
        "lider",
        "backoffice",
        "diretor_comercial",
        "gerente_comercial",
        "coordenador_comercial",
        "gestor_equipe",
        "representante_comercial",
        "executivo_contas",
        "consultor_vendas",
      ],
      custom_field_tipo: [
        "text",
        "textarea",
        "number",
        "decimal",
        "currency",
        "percentage",
        "date",
        "datetime",
        "select",
        "multiselect",
        "checkbox",
        "radio",
        "email",
        "phone",
        "url",
        "cnpj",
        "cpf",
        "cep",
        "file",
        "user",
        "client",
        "product",
        "select_tipo_pedido",
        "select_condicao_pagamento",
        "select_tipo_frete",
      ],
      etapa_pipeline: [
        "prospeccao",
        "qualificacao",
        "proposta",
        "negociacao",
        "fechamento",
        "ganho",
        "perdido",
        "followup_cliente",
      ],
      identificacao_tipo: ["Cliente", "Fornecedor", "Ambos"],
      metodo_vinculacao: ["ia_automatico", "ia_manual", "manual", "importado"],
      natureza_tipo: ["Juridica", "Fisica"],
      nivel_risco_auditoria: ["baixo", "medio", "alto", "critico"],
      prioridade_atividade: ["critica", "alta", "media", "baixa"],
      prioridade_ticket: ["baixa", "normal", "alta", "urgente"],
      sentimento_tipo: [
        "muito_positivo",
        "positivo",
        "neutro",
        "negativo",
        "muito_negativo",
      ],
      status_analise_ia: [
        "pendente",
        "em_analise",
        "concluida",
        "erro",
        "cancelada",
      ],
      status_aprovacao: ["pendente", "aprovada", "rejeitada", "expirada"],
      status_atividade: [
        "pendente",
        "em_andamento",
        "concluida",
        "cancelada",
        "reagendada",
        "aguardando_resposta",
      ],
      status_entrega: [
        "pendente",
        "em_transito",
        "entregue",
        "devolvido",
        "cancelado",
      ],
      status_nota_fiscal: ["emitida", "cancelada", "denegada", "inutilizada"],
      status_proposta: [
        "rascunho",
        "enviada",
        "aceita",
        "rejeitada",
        "negociacao",
        "aprovacao_pendente",
        "aprovada_diretoria",
        "rejeitada_diretoria",
      ],
      status_solicitacao_cadastro: [
        "rascunho",
        "em_analise",
        "aprovado",
        "rejeitado",
      ],
      status_ticket: [
        "aberto",
        "em_andamento",
        "aguardando_cliente",
        "resolvido",
        "fechado",
        "cancelado",
      ],
      tipo_atividade: [
        "tarefa",
        "chamada",
        "reuniao",
        "email",
        "whatsapp",
        "visita",
        "follow_up",
        "proposta",
        "negociacao",
        "outro",
      ],
      tipo_endereco: ["principal", "entrega", "cobranca"],
      tipo_feedback: ["positivo", "negativo", "neutro"],
      tipo_ticket: [
        "reclamacao",
        "duvida",
        "sugestao",
        "elogio",
        "garantia",
        "troca",
        "devolucao",
      ],
      what_tipo: ["venda", "oportunidade", "conta", "ticket", "proposta"],
      who_tipo: ["lead", "contato", "cliente"],
      yes_no: ["YES", "NO"],
    },
  },
} as const
