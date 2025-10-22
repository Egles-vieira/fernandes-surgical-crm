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
          conta_id: string | null
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
          conta_id?: string | null
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
          conta_id?: string | null
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
        ]
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
          atualizado_em: string | null
          atualizado_por: string | null
          cancelou_inscricao_email: boolean | null
          cargo: string | null
          celular: string | null
          cliente_id: string | null
          conta_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_nascimento: string | null
          data_ultima_atividade: string | null
          departamento: string | null
          descricao: string | null
          email: string | null
          email_secundario: string | null
          endereco_correspondencia_id: string | null
          esta_ativo: boolean | null
          estagio_ciclo_vida: string | null
          excluido_em: string | null
          id: string
          nao_enviar_email: boolean | null
          nao_ligar: boolean | null
          nome_completo: string | null
          origem_lead: string | null
          pontuacao_lead: number | null
          primeiro_nome: string
          proprietario_id: string | null
          reporta_para_id: string | null
          sobrenome: string
          status_lead: string | null
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          cancelou_inscricao_email?: boolean | null
          cargo?: string | null
          celular?: string | null
          cliente_id?: string | null
          conta_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_nascimento?: string | null
          data_ultima_atividade?: string | null
          departamento?: string | null
          descricao?: string | null
          email?: string | null
          email_secundario?: string | null
          endereco_correspondencia_id?: string | null
          esta_ativo?: boolean | null
          estagio_ciclo_vida?: string | null
          excluido_em?: string | null
          id?: string
          nao_enviar_email?: boolean | null
          nao_ligar?: boolean | null
          nome_completo?: string | null
          origem_lead?: string | null
          pontuacao_lead?: number | null
          primeiro_nome: string
          proprietario_id?: string | null
          reporta_para_id?: string | null
          sobrenome: string
          status_lead?: string | null
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          cancelou_inscricao_email?: boolean | null
          cargo?: string | null
          celular?: string | null
          cliente_id?: string | null
          conta_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_nascimento?: string | null
          data_ultima_atividade?: string | null
          departamento?: string | null
          descricao?: string | null
          email?: string | null
          email_secundario?: string | null
          endereco_correspondencia_id?: string | null
          esta_ativo?: boolean | null
          estagio_ciclo_vida?: string | null
          excluido_em?: string | null
          id?: string
          nao_enviar_email?: boolean | null
          nao_ligar?: boolean | null
          nome_completo?: string | null
          origem_lead?: string | null
          pontuacao_lead?: number | null
          primeiro_nome?: string
          proprietario_id?: string | null
          reporta_para_id?: string | null
          sobrenome?: string
          status_lead?: string | null
          telefone?: string | null
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
            foreignKeyName: "contatos_reporta_para_id_fkey"
            columns: ["reporta_para_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
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
      empresas: {
        Row: {
          atualizado_em: string | null
          cnpj: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          criado_em: string | null
          esta_ativa: boolean | null
          excluido_em: string | null
          id: string
          nome: string
          razao_social: string | null
          setor: string | null
          site: string | null
          tamanho_empresa: string | null
          url_logo: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          criado_em?: string | null
          esta_ativa?: boolean | null
          excluido_em?: string | null
          id?: string
          nome: string
          razao_social?: string | null
          setor?: string | null
          site?: string | null
          tamanho_empresa?: string | null
          url_logo?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          criado_em?: string | null
          esta_ativa?: boolean | null
          excluido_em?: string | null
          id?: string
          nome?: string
          razao_social?: string | null
          setor?: string | null
          site?: string | null
          tamanho_empresa?: string | null
          url_logo?: string | null
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
          id?: string
          lider_equipe_id?: string | null
          nome?: string
          tipo_equipe?: string | null
        }
        Relationships: []
      }
      estagios_pipeline: {
        Row: {
          atualizado_em: string | null
          cor: string | null
          criado_em: string | null
          descricao: string | null
          duracao_esperada_dias: number | null
          eh_ganho_fechado: boolean | null
          eh_perdido_fechado: boolean | null
          id: string
          nome_estagio: string
          ordem_estagio: number
          percentual_probabilidade: number | null
          pipeline_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          duracao_esperada_dias?: number | null
          eh_ganho_fechado?: boolean | null
          eh_perdido_fechado?: boolean | null
          id?: string
          nome_estagio: string
          ordem_estagio: number
          percentual_probabilidade?: number | null
          pipeline_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          duracao_esperada_dias?: number | null
          eh_ganho_fechado?: boolean | null
          eh_perdido_fechado?: boolean | null
          id?: string
          nome_estagio?: string
          ordem_estagio?: number
          percentual_probabilidade?: number | null
          pipeline_id?: string | null
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
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      membros_equipe: {
        Row: {
          entrou_em: string | null
          equipe_id: string
          usuario_id: string
        }
        Insert: {
          entrou_em?: string | null
          equipe_id: string
          usuario_id: string
        }
        Update: {
          entrou_em?: string | null
          equipe_id?: string
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
        ]
      }
      oportunidades: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          concorrentes: string | null
          conta_id: string | null
          contato_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_fechamento: string | null
          descricao: string | null
          dias_no_estagio: number | null
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
          valor: number | null
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          concorrentes?: string | null
          conta_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_fechamento?: string | null
          descricao?: string | null
          dias_no_estagio?: number | null
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
          valor?: number | null
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          concorrentes?: string | null
          conta_id?: string | null
          contato_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_fechamento?: string | null
          descricao?: string | null
          dias_no_estagio?: number | null
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
          valor?: number | null
        }
        Relationships: [
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
          atualizado_em: string | null
          cargo: string | null
          celular: string | null
          criado_em: string | null
          departamento: string | null
          empresa_id: string | null
          esta_ativo: boolean | null
          fuso_horario: string | null
          gerente_id: string | null
          id: string
          idioma: string | null
          nome_completo: string | null
          perfil_id: string | null
          primeiro_nome: string | null
          sobrenome: string | null
          telefone: string | null
          ultimo_login_em: string | null
          url_avatar: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cargo?: string | null
          celular?: string | null
          criado_em?: string | null
          departamento?: string | null
          empresa_id?: string | null
          esta_ativo?: boolean | null
          fuso_horario?: string | null
          gerente_id?: string | null
          id: string
          idioma?: string | null
          nome_completo?: string | null
          perfil_id?: string | null
          primeiro_nome?: string | null
          sobrenome?: string | null
          telefone?: string | null
          ultimo_login_em?: string | null
          url_avatar?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cargo?: string | null
          celular?: string | null
          criado_em?: string | null
          departamento?: string | null
          empresa_id?: string | null
          esta_ativo?: boolean | null
          fuso_horario?: string | null
          gerente_id?: string | null
          id?: string
          idioma?: string | null
          nome_completo?: string | null
          perfil_id?: string | null
          primeiro_nome?: string | null
          sobrenome?: string | null
          telefone?: string | null
          ultimo_login_em?: string | null
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
      pipelines: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          descricao: string | null
          esta_ativo: boolean | null
          excluido_em: string | null
          id: string
          nome: string
          ordem_exibicao: number | null
          tipo_pipeline: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          esta_ativo?: boolean | null
          excluido_em?: string | null
          id?: string
          nome: string
          ordem_exibicao?: number | null
          tipo_pipeline?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          esta_ativo?: boolean | null
          excluido_em?: string | null
          id?: string
          nome?: string
          ordem_exibicao?: number | null
          tipo_pipeline?: string | null
        }
        Relationships: []
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
            foreignKeyName: "tickets_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
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
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_cnpj: string | null
          cliente_nome: string
          condicao_pagamento_id: string | null
          created_at: string
          data_fechamento_prevista: string | null
          data_venda: string
          desconto: number
          etapa_pipeline: Database["public"]["Enums"]["etapa_pipeline"] | null
          id: string
          motivo_perda: string | null
          numero_venda: string
          observacoes: string | null
          origem_lead: string | null
          probabilidade: number | null
          responsavel_id: string | null
          status: string
          tipo_frete_id: string | null
          tipo_pedido_id: string | null
          updated_at: string
          user_id: string
          valor_estimado: number | null
          valor_final: number
          valor_total: number
        }
        Insert: {
          cliente_cnpj?: string | null
          cliente_nome: string
          condicao_pagamento_id?: string | null
          created_at?: string
          data_fechamento_prevista?: string | null
          data_venda?: string
          desconto?: number
          etapa_pipeline?: Database["public"]["Enums"]["etapa_pipeline"] | null
          id?: string
          motivo_perda?: string | null
          numero_venda: string
          observacoes?: string | null
          origem_lead?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          status?: string
          tipo_frete_id?: string | null
          tipo_pedido_id?: string | null
          updated_at?: string
          user_id: string
          valor_estimado?: number | null
          valor_final?: number
          valor_total?: number
        }
        Update: {
          cliente_cnpj?: string | null
          cliente_nome?: string
          condicao_pagamento_id?: string | null
          created_at?: string
          data_fechamento_prevista?: string | null
          data_venda?: string
          desconto?: number
          etapa_pipeline?: Database["public"]["Enums"]["etapa_pipeline"] | null
          id?: string
          motivo_perda?: string | null
          numero_venda?: string
          observacoes?: string | null
          origem_lead?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          status?: string
          tipo_frete_id?: string | null
          tipo_pedido_id?: string | null
          updated_at?: string
          user_id?: string
          valor_estimado?: number | null
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
      whatsapp_contas: {
        Row: {
          account_sid: string | null
          api_key: string | null
          app_id: string | null
          atualizado_em: string | null
          business_account_id: string | null
          categoria_negocio: string | null
          conectada_em: string | null
          criado_em: string | null
          criado_por: string
          desconectada_em: string | null
          descricao_negocio: string | null
          email_contato: string | null
          endereco: string | null
          excluido_em: string | null
          foto_perfil_url: string | null
          horario_atendimento: Json | null
          id: string
          limite_mensagens_dia: number | null
          mensagem_fora_horario: string | null
          nome_conta: string
          nome_exibicao: string | null
          numero_whatsapp: string
          phone_number_id: string | null
          provider: string
          qualidade_conta: string | null
          resposta_automatica_ativa: boolean | null
          site: string | null
          status: string | null
          total_conversas: number | null
          total_mensagens_enviadas: number | null
          total_mensagens_recebidas: number | null
          ultima_sincronizacao_em: string | null
          verificada: boolean | null
          webhook_url: string | null
          webhook_verificado: boolean | null
        }
        Insert: {
          account_sid?: string | null
          api_key?: string | null
          app_id?: string | null
          atualizado_em?: string | null
          business_account_id?: string | null
          categoria_negocio?: string | null
          conectada_em?: string | null
          criado_em?: string | null
          criado_por: string
          desconectada_em?: string | null
          descricao_negocio?: string | null
          email_contato?: string | null
          endereco?: string | null
          excluido_em?: string | null
          foto_perfil_url?: string | null
          horario_atendimento?: Json | null
          id?: string
          limite_mensagens_dia?: number | null
          mensagem_fora_horario?: string | null
          nome_conta: string
          nome_exibicao?: string | null
          numero_whatsapp: string
          phone_number_id?: string | null
          provider: string
          qualidade_conta?: string | null
          resposta_automatica_ativa?: boolean | null
          site?: string | null
          status?: string | null
          total_conversas?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          ultima_sincronizacao_em?: string | null
          verificada?: boolean | null
          webhook_url?: string | null
          webhook_verificado?: boolean | null
        }
        Update: {
          account_sid?: string | null
          api_key?: string | null
          app_id?: string | null
          atualizado_em?: string | null
          business_account_id?: string | null
          categoria_negocio?: string | null
          conectada_em?: string | null
          criado_em?: string | null
          criado_por?: string
          desconectada_em?: string | null
          descricao_negocio?: string | null
          email_contato?: string | null
          endereco?: string | null
          excluido_em?: string | null
          foto_perfil_url?: string | null
          horario_atendimento?: Json | null
          id?: string
          limite_mensagens_dia?: number | null
          mensagem_fora_horario?: string | null
          nome_conta?: string
          nome_exibicao?: string | null
          numero_whatsapp?: string
          phone_number_id?: string | null
          provider?: string
          qualidade_conta?: string | null
          resposta_automatica_ativa?: boolean | null
          site?: string | null
          status?: string | null
          total_conversas?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          ultima_sincronizacao_em?: string | null
          verificada?: boolean | null
          webhook_url?: string | null
          webhook_verificado?: boolean | null
        }
        Relationships: []
      }
      whatsapp_contatos: {
        Row: {
          atualizado_em: string | null
          bloqueado: boolean | null
          bloqueado_em: string | null
          categoria_cliente: string | null
          contato_id: string
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
          contato_id: string
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
          contato_id?: string
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
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversas: {
        Row: {
          atribuicao_automatica: boolean | null
          atribuida_em: string | null
          atribuida_para_id: string | null
          atualizado_em: string | null
          avaliacao_satisfacao: number | null
          avaliada_em: string | null
          categoria: string | null
          comentario_avaliacao: string | null
          conta_id: string | null
          contato_id: string | null
          conversa_externa_id: string | null
          criado_em: string | null
          emoji_sentimento: string | null
          fechada_em: string | null
          gerenciada_por_bot: boolean | null
          id: string
          iniciada_em: string | null
          janela_24h_ativa: boolean | null
          janela_aberta_em: string | null
          janela_fecha_em: string | null
          mensagens_analisadas: number | null
          oportunidade_id: string | null
          origem: string | null
          prioridade: string | null
          resolvida_em: string | null
          sentimento_cliente: string | null
          status: string | null
          tags: string[] | null
          tempo_primeira_resposta_minutos: number | null
          tempo_total_resposta_minutos: number | null
          tipo_conversa: string | null
          titulo: string | null
          total_mensagens: number | null
          total_mensagens_enviadas: number | null
          total_mensagens_recebidas: number | null
          transferida_em: string | null
          transferida_para_humano: boolean | null
          ultima_analise_sentimento_em: string | null
          ultima_interacao_agente_em: string | null
          ultima_interacao_cliente_em: string | null
          ultima_mensagem_em: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
        }
        Insert: {
          atribuicao_automatica?: boolean | null
          atribuida_em?: string | null
          atribuida_para_id?: string | null
          atualizado_em?: string | null
          avaliacao_satisfacao?: number | null
          avaliada_em?: string | null
          categoria?: string | null
          comentario_avaliacao?: string | null
          conta_id?: string | null
          contato_id?: string | null
          conversa_externa_id?: string | null
          criado_em?: string | null
          emoji_sentimento?: string | null
          fechada_em?: string | null
          gerenciada_por_bot?: boolean | null
          id?: string
          iniciada_em?: string | null
          janela_24h_ativa?: boolean | null
          janela_aberta_em?: string | null
          janela_fecha_em?: string | null
          mensagens_analisadas?: number | null
          oportunidade_id?: string | null
          origem?: string | null
          prioridade?: string | null
          resolvida_em?: string | null
          sentimento_cliente?: string | null
          status?: string | null
          tags?: string[] | null
          tempo_primeira_resposta_minutos?: number | null
          tempo_total_resposta_minutos?: number | null
          tipo_conversa?: string | null
          titulo?: string | null
          total_mensagens?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          transferida_em?: string | null
          transferida_para_humano?: boolean | null
          ultima_analise_sentimento_em?: string | null
          ultima_interacao_agente_em?: string | null
          ultima_interacao_cliente_em?: string | null
          ultima_mensagem_em?: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
        }
        Update: {
          atribuicao_automatica?: boolean | null
          atribuida_em?: string | null
          atribuida_para_id?: string | null
          atualizado_em?: string | null
          avaliacao_satisfacao?: number | null
          avaliada_em?: string | null
          categoria?: string | null
          comentario_avaliacao?: string | null
          conta_id?: string | null
          contato_id?: string | null
          conversa_externa_id?: string | null
          criado_em?: string | null
          emoji_sentimento?: string | null
          fechada_em?: string | null
          gerenciada_por_bot?: boolean | null
          id?: string
          iniciada_em?: string | null
          janela_24h_ativa?: boolean | null
          janela_aberta_em?: string | null
          janela_fecha_em?: string | null
          mensagens_analisadas?: number | null
          oportunidade_id?: string | null
          origem?: string | null
          prioridade?: string | null
          resolvida_em?: string | null
          sentimento_cliente?: string | null
          status?: string | null
          tags?: string[] | null
          tempo_primeira_resposta_minutos?: number | null
          tempo_total_resposta_minutos?: number | null
          tipo_conversa?: string | null
          titulo?: string | null
          total_mensagens?: number | null
          total_mensagens_enviadas?: number | null
          total_mensagens_recebidas?: number | null
          transferida_em?: string | null
          transferida_para_humano?: boolean | null
          ultima_analise_sentimento_em?: string | null
          ultima_interacao_agente_em?: string | null
          ultima_interacao_cliente_em?: string | null
          ultima_mensagem_em?: string | null
          whatsapp_conta_id?: string
          whatsapp_contato_id?: string
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
            foreignKeyName: "whatsapp_conversas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
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
        ]
      }
      whatsapp_mensagens: {
        Row: {
          agendada_para: string | null
          botoes: Json | null
          confianca_analise: number | null
          contexto: Json | null
          conversa_id: string
          corpo: string | null
          corpo_original: string | null
          criado_em: string | null
          custo_envio: number | null
          direcao: string
          duracao_midia_segundos: number | null
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
          lista_opcoes: Json | null
          longitude: number | null
          mensagem_externa_id: string | null
          mensagem_referencia_id: string | null
          metadata: Json | null
          mime_type: string | null
          nome_arquivo: string | null
          nome_remetente: string | null
          numero_de: string | null
          numero_para: string | null
          palavras_chave: string[] | null
          recebida_em: string | null
          resposta_botao: string | null
          resposta_lista: string | null
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
          tipo_mensagem: string
          tipo_midia: string | null
          url_midia: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
        }
        Insert: {
          agendada_para?: string | null
          botoes?: Json | null
          confianca_analise?: number | null
          contexto?: Json | null
          conversa_id: string
          corpo?: string | null
          corpo_original?: string | null
          criado_em?: string | null
          custo_envio?: number | null
          direcao: string
          duracao_midia_segundos?: number | null
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
          lista_opcoes?: Json | null
          longitude?: number | null
          mensagem_externa_id?: string | null
          mensagem_referencia_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          nome_arquivo?: string | null
          nome_remetente?: string | null
          numero_de?: string | null
          numero_para?: string | null
          palavras_chave?: string[] | null
          recebida_em?: string | null
          resposta_botao?: string | null
          resposta_lista?: string | null
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
          tipo_mensagem?: string
          tipo_midia?: string | null
          url_midia?: string | null
          whatsapp_conta_id: string
          whatsapp_contato_id: string
        }
        Update: {
          agendada_para?: string | null
          botoes?: Json | null
          confianca_analise?: number | null
          contexto?: Json | null
          conversa_id?: string
          corpo?: string | null
          corpo_original?: string | null
          criado_em?: string | null
          custo_envio?: number | null
          direcao?: string
          duracao_midia_segundos?: number | null
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
          lista_opcoes?: Json | null
          longitude?: number | null
          mensagem_externa_id?: string | null
          mensagem_referencia_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          nome_arquivo?: string | null
          nome_remetente?: string | null
          numero_de?: string | null
          numero_para?: string | null
          palavras_chave?: string[] | null
          recebida_em?: string | null
          resposta_botao?: string | null
          resposta_lista?: string | null
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
          tipo_mensagem?: string
          tipo_midia?: string | null
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
            referencedRelation: "whatsapp_contas"
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
          corpo: string
          criado_em: string | null
          criado_por: string
          excluido_em: string | null
          id: string
          idioma: string | null
          motivo_rejeicao: string | null
          nome_template: string
          numero_parametros: number | null
          parametros: Json | null
          permite_personalizar: boolean | null
          rejeitado_em: string | null
          requer_aprovacao_envio: boolean | null
          rodape: string | null
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
          corpo: string
          criado_em?: string | null
          criado_por: string
          excluido_em?: string | null
          id?: string
          idioma?: string | null
          motivo_rejeicao?: string | null
          nome_template: string
          numero_parametros?: number | null
          parametros?: Json | null
          permite_personalizar?: boolean | null
          rejeitado_em?: string | null
          requer_aprovacao_envio?: boolean | null
          rodape?: string | null
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
          corpo?: string
          criado_em?: string | null
          criado_por?: string
          excluido_em?: string | null
          id?: string
          idioma?: string | null
          motivo_rejeicao?: string | null
          nome_template?: string
          numero_parametros?: number | null
          parametros?: Json | null
          permite_personalizar?: boolean | null
          rejeitado_em?: string | null
          requer_aprovacao_envio?: boolean | null
          rodape?: string | null
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
          ultimo_envio_em?: string | null
          url_midia_exemplo?: string | null
          whatsapp_conta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_whatsapp_conta_id_fkey"
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
          provider: string
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
          provider: string
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
          provider?: string
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
            referencedRelation: "whatsapp_contas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
    }
    Functions: {
      calcular_tempo_efetivo_ticket: {
        Args: { ticket_id: string }
        Returns: Json
      }
      gerar_numero_ticket: { Args: never; Returns: string }
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
      list_users_with_roles: {
        Args: never
        Returns: {
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "manager" | "sales" | "warehouse" | "support"
      etapa_pipeline:
        | "prospeccao"
        | "qualificacao"
        | "proposta"
        | "negociacao"
        | "fechamento"
        | "ganho"
        | "perdido"
      identificacao_tipo: "Cliente" | "Fornecedor" | "Ambos"
      natureza_tipo: "Juridica" | "Fisica"
      prioridade_ticket: "baixa" | "normal" | "alta" | "urgente"
      status_ticket:
        | "aberto"
        | "em_andamento"
        | "aguardando_cliente"
        | "resolvido"
        | "fechado"
        | "cancelado"
      tipo_endereco: "principal" | "entrega" | "cobranca"
      tipo_ticket:
        | "reclamacao"
        | "duvida"
        | "sugestao"
        | "elogio"
        | "garantia"
        | "troca"
        | "devolucao"
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
      app_role: ["admin", "manager", "sales", "warehouse", "support"],
      etapa_pipeline: [
        "prospeccao",
        "qualificacao",
        "proposta",
        "negociacao",
        "fechamento",
        "ganho",
        "perdido",
      ],
      identificacao_tipo: ["Cliente", "Fornecedor", "Ambos"],
      natureza_tipo: ["Juridica", "Fisica"],
      prioridade_ticket: ["baixa", "normal", "alta", "urgente"],
      status_ticket: [
        "aberto",
        "em_andamento",
        "aguardando_cliente",
        "resolvido",
        "fechado",
        "cancelado",
      ],
      tipo_endereco: ["principal", "entrega", "cobranca"],
      tipo_ticket: [
        "reclamacao",
        "duvida",
        "sugestao",
        "elogio",
        "garantia",
        "troca",
        "devolucao",
      ],
      yes_no: ["YES", "NO"],
    },
  },
} as const
