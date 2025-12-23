import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Suporte a vendaId OU oportunidadeId (validado com Zod)
    const BodySchema = z.object({
      tokenId: z.string().min(1),
      vendaId: z.string().uuid().optional(),
      oportunidadeId: z.string().uuid().optional(),
      tipoResposta: z.enum(['aceita', 'recusada']),
      nome: z.string().min(1).optional(),
      email: z.string().email().optional(),
      cargo: z.string().min(1).optional(),
      telefone: z.string().min(1).optional(),
      comentario: z.string().min(1).optional(),
      motivoRecusa: z.string().min(1).optional(),
      analyticsId: z.string().min(1).optional(),
    });

    const rawBody = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload inválido', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const {
      tokenId,
      vendaId,
      oportunidadeId,
      tipoResposta,
      nome,
      email,
      cargo,
      telefone,
      comentario,
      motivoRecusa,
      analyticsId,
    } = parsed.data;

    // Deve ter vendaId OU oportunidadeId
    if (!vendaId && !oportunidadeId) {
      return new Response(
        JSON.stringify({ error: 'vendaId ou oportunidadeId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Montar dados de inserção
    const insertData: Record<string, unknown> = {
      proposta_token_id: tokenId,
      analytics_id: analyticsId || null,
      tipo_resposta: tipoResposta,
      nome_respondente: nome || null,
      email_respondente: email || null,
      cargo_respondente: cargo || null,
      telefone_respondente: telefone || null,
      comentario: comentario || null,
      motivo_recusa: motivoRecusa || null,
      ip_assinatura: clientIP,
      user_agent_assinatura: userAgent
    };

    // Adicionar venda_id OU oportunidade_id
    if (vendaId) {
      insertData.venda_id = vendaId;
    } else {
      insertData.oportunidade_id = oportunidadeId;
    }

    const { data: resposta, error: insertError } = await supabase
      .from('propostas_respostas')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir resposta:', insertError);
      throw insertError;
    }

    // Atualizar entidade conforme tipo de resposta
    if (vendaId) {
      // Lógica para vendas (existente)
      if (tipoResposta === 'aceita') {
        await supabase.from('vendas').update({ 
          etapa_pipeline: 'fechamento', 
          status: 'aprovada' 
        }).eq('id', vendaId);
        console.log('✅ Venda atualizada para aprovada:', vendaId);
      }
    } else if (oportunidadeId) {
      // Lógica para oportunidades
      if (tipoResposta === 'aceita') {
        // Regra: aceite do cliente move a oportunidade para o estágio "Fechamento"
        // Se não existir, tenta Negociação/Contrato/último antes de ganho-perdido
        const { data: opp, error: oppError } = await supabase
          .from('oportunidades')
          .select('pipeline_id, estagio_id')
          .eq('id', oportunidadeId)
          .single();

        if (oppError) {
          console.error('Erro ao carregar oportunidade:', oppError);
          throw oppError;
        }

        console.log('[proposta-responder] Oportunidade carregada:', {
          oportunidadeId,
          pipeline_id: opp.pipeline_id,
          estagio_atual: opp.estagio_id,
        });

        // Buscar todos os estágios do pipeline ordenados
        const { data: estagios, error: estagiosError } = await supabase
          .from('estagios_pipeline')
          .select('id, nome_estagio, percentual_probabilidade, ordem_estagio, eh_ganho_fechado, eh_perdido_fechado')
          .eq('pipeline_id', opp.pipeline_id)
          .order('ordem_estagio', { ascending: true });

        if (estagiosError) {
          console.error('Erro ao buscar estágios:', estagiosError);
          throw estagiosError;
        }

        console.log('[proposta-responder] Estágios do pipeline:', estagios?.map(e => ({
          id: e.id,
          nome: e.nome_estagio,
          ordem: e.ordem_estagio,
          eh_ganho: e.eh_ganho_fechado,
          eh_perdido: e.eh_perdido_fechado,
        })));

        // Filtrar estágios que não são finais (ganho/perdido)
        const estagiosFiltrados = estagios?.filter(e => !e.eh_ganho_fechado && !e.eh_perdido_fechado) || [];
        
        // PRIORIDADE 1: Procurar estágio com nome contendo "fechamento" (case-insensitive)
        let estagioDestino = estagiosFiltrados.find(e => 
          e.nome_estagio.toLowerCase().includes('fechamento')
        );
        
        // PRIORIDADE 2: Negociação
        if (!estagioDestino) {
          estagioDestino = estagiosFiltrados.find(e => 
            e.nome_estagio.toLowerCase().includes('negociação') || 
            e.nome_estagio.toLowerCase().includes('negociacao')
          );
        }
        
        // PRIORIDADE 3: Contrato
        if (!estagioDestino) {
          estagioDestino = estagiosFiltrados.find(e => 
            e.nome_estagio.toLowerCase().includes('contrato')
          );
        }
        
        // FALLBACK: último estágio não-final
        if (!estagioDestino && estagiosFiltrados.length > 0) {
          estagioDestino = estagiosFiltrados[estagiosFiltrados.length - 1];
        }

        console.log('[proposta-responder] Estágio destino escolhido:', estagioDestino ? {
          id: estagioDestino.id,
          nome: estagioDestino.nome_estagio,
          ordem: estagioDestino.ordem_estagio,
        } : null);

        // Verificar se já está no estágio destino
        if (estagioDestino && opp.estagio_id === estagioDestino.id) {
          console.log('[proposta-responder] Oportunidade já está no estágio destino, não movendo');
        } else if (!estagioDestino) {
          console.warn('[proposta-responder] Nenhum estágio adequado encontrado, mantendo estágio atual');
        } else {
          const nowIso = new Date().toISOString();
          const { error: updateOppError } = await supabase
            .from('oportunidades')
            .update({
              estagio_id: estagioDestino.id,
              percentual_probabilidade: estagioDestino.percentual_probabilidade ?? null,
              esta_fechada: false,
              foi_ganha: false,
              fechada_em: null,
              ultima_mudanca_estagio_em: nowIso,
              data_entrada_estagio: nowIso,
            })
            .eq('id', oportunidadeId);

          if (updateOppError) {
            console.error('[proposta-responder] Erro ao mover oportunidade:', updateOppError);
            throw updateOppError;
          }

          console.log('[proposta-responder] ✅ Oportunidade movida com sucesso:', {
            oportunidadeId,
            de: opp.estagio_id,
            para: estagioDestino.id,
            nomeEstagioDestino: estagioDestino.nome_estagio,
          });
        }

        // Criar notificação para o vendedor
        const { data: oportunidade } = await supabase
          .from('oportunidades')
          .select('codigo, nome_oportunidade, proprietario_id, vendedor_id')
          .eq('id', oportunidadeId)
          .single();

        if (oportunidade) {
          const vendedorId = oportunidade.proprietario_id || oportunidade.vendedor_id;
          if (vendedorId) {
            await supabase.from('notificacoes').insert({
              usuario_id: vendedorId,
              titulo: '🎉 Proposta aceita!',
              descricao: `O cliente aceitou a proposta da oportunidade "${oportunidade.codigo || oportunidade.nome_oportunidade}"`,
              tipo: 'proposta_aceita',
              entidade_id: oportunidadeId,
              entidade_tipo: 'oportunidade',
              metadata: {
                nome_respondente: nome,
                email_respondente: email,
                tipo_resposta: tipoResposta
              }
            });
          }
        }
      } else if (tipoResposta === 'recusada') {
        await supabase.from('oportunidades').update({ 
          foi_ganha: false,
          esta_fechada: true,
          fechada_em: new Date().toISOString(),
          motivo_perda: motivoRecusa || 'Proposta recusada pelo cliente'
        }).eq('id', oportunidadeId);
        console.log('❌ Oportunidade marcada como perdida:', oportunidadeId);

        // Criar notificação para o vendedor
        const { data: oportunidade } = await supabase
          .from('oportunidades')
          .select('codigo, nome_oportunidade, proprietario_id, vendedor_id')
          .eq('id', oportunidadeId)
          .single();

        if (oportunidade) {
          const vendedorId = oportunidade.proprietario_id || oportunidade.vendedor_id;
          if (vendedorId) {
            await supabase.from('notificacoes').insert({
              usuario_id: vendedorId,
              titulo: '😔 Proposta recusada',
              descricao: `O cliente recusou a proposta da oportunidade "${oportunidade.codigo || oportunidade.nome_oportunidade}"`,
              tipo: 'proposta_recusada',
              entidade_id: oportunidadeId,
              entidade_tipo: 'oportunidade',
              metadata: {
                nome_respondente: nome,
                motivo_recusa: motivoRecusa,
                tipo_resposta: tipoResposta
              }
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, resposta: { id: resposta.id, tipo: tipoResposta } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro';
    console.error('Erro em proposta-responder:', message);
    return new Response(JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
