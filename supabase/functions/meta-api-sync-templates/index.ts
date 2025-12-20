import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

interface MetaTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  category: string;
  language: string;
  components: any[];
  quality_score?: {
    score: string;
    date: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { contaId, cronJob } = body;

    console.log('[meta-api-sync-templates] Iniciando sincronização', { contaId, cronJob });

    // Se cronJob, buscar todas as contas ativas
    let contas: any[] = [];
    
    if (cronJob) {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('id, meta_waba_id, meta_access_token')
        .eq('status', 'ativo')
        .not('meta_waba_id', 'is', null)
        .not('meta_access_token', 'is', null);

      if (error) throw error;
      contas = data || [];
    } else if (contaId) {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('id, meta_waba_id, meta_access_token')
        .eq('id', contaId)
        .single();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Conta não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      contas = [data];
    } else {
      return new Response(
        JSON.stringify({ error: 'contaId ou cronJob é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resultados: any[] = [];

    for (const conta of contas) {
      try {
        console.log(`[meta-api-sync-templates] Sincronizando conta ${conta.id}`);

        // Buscar templates da Meta API
        const url = `${META_GRAPH_URL}/${META_API_VERSION}/${conta.meta_waba_id}/message_templates?fields=id,name,status,category,language,components,quality_score&limit=100`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${conta.meta_access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`[meta-api-sync-templates] Erro Meta API:`, errorData);
          resultados.push({
            contaId: conta.id,
            sucesso: false,
            erro: errorData.error?.message || 'Erro ao buscar templates'
          });
          continue;
        }

        const data = await response.json();
        const templatesFromMeta: MetaTemplate[] = data.data || [];
        
        console.log(`[meta-api-sync-templates] ${templatesFromMeta.length} templates encontrados na Meta`);

        let atualizados = 0;
        let novos = 0;
        let mudancasStatus = 0;

        for (const metaTemplate of templatesFromMeta) {
          // Extrair conteúdo dos components
          let titulo: string | null = null;
          let corpo: string | null = null;
          let rodape: string | null = null;
          
          for (const comp of metaTemplate.components || []) {
            if (comp.type === 'HEADER' && comp.format === 'TEXT') {
              titulo = comp.text || null;
            } else if (comp.type === 'BODY') {
              corpo = comp.text || null;
            } else if (comp.type === 'FOOTER') {
              rodape = comp.text || null;
            }
          }
          
          // Garantir que corpo tenha um valor (obrigatório no DB)
          if (!corpo) {
            corpo = titulo || metaTemplate.name || 'Template sem corpo';
          }
          
          // Converter categoria para minúsculas (constraint do DB)
          const categoriaLower = metaTemplate.category?.toLowerCase() || 'utility';

          // Buscar template existente pelo nome (incluindo excluídos para restaurar)
          const { data: existingTemplate, error: searchError } = await supabase
            .from('whatsapp_templates')
            .select('id, status_aprovacao, excluido_em')
            .eq('whatsapp_conta_id', conta.id)
            .eq('nome_template', metaTemplate.name)
            .maybeSingle();

          if (searchError) {
            console.error(`[meta-api-sync-templates] Erro ao buscar template local:`, searchError);
            continue;
          }

          const statusNovo = metaTemplate.status;
          const statusAnterior = existingTemplate?.status_aprovacao;

          if (existingTemplate) {
            // Atualizar template existente (e restaurar se estava excluído)
            const { error: updateError } = await supabase
              .from('whatsapp_templates')
              .update({
                template_externo_id: metaTemplate.id,
                status_aprovacao: statusNovo,
                categoria: categoriaLower,
                idioma: metaTemplate.language,
                titulo,
                corpo,
                rodape,
                components_meta: metaTemplate.components,
                quality_score: metaTemplate.quality_score,
                quality_score_date: metaTemplate.quality_score?.date ? new Date(metaTemplate.quality_score.date * 1000) : null,
                sincronizado_com_meta: true,
                ultima_sincronizacao_em: new Date().toISOString(),
                aprovado_em: statusNovo === 'APPROVED' ? new Date().toISOString() : null,
                rejeitado_em: statusNovo === 'REJECTED' ? new Date().toISOString() : null,
                excluido_em: null, // Restaurar template se estava excluído
              })
              .eq('id', existingTemplate.id);

            if (updateError) {
              console.error(`[meta-api-sync-templates] Erro ao atualizar template:`, updateError);
              continue;
            }

            atualizados++;

            // Registrar mudança de status se houver
            if (statusAnterior && statusAnterior !== statusNovo) {
              const { error: historicoError } = await supabase
                .from('whatsapp_templates_historico')
                .insert({
                  template_id: existingTemplate.id,
                  status_anterior: statusAnterior,
                  status_novo: statusNovo,
                  quality_score: metaTemplate.quality_score,
                  dados_meta: metaTemplate,
                });

              if (!historicoError) mudancasStatus++;
            }
          } else {
            // Criar novo template
            const { data: newTemplate, error: insertError } = await supabase
              .from('whatsapp_templates')
              .insert({
                whatsapp_conta_id: conta.id,
                nome_template: metaTemplate.name,
                template_externo_id: metaTemplate.id,
                status_aprovacao: statusNovo,
                categoria: categoriaLower,
                idioma: metaTemplate.language,
                titulo,
                corpo,
                rodape,
                components_meta: metaTemplate.components,
                quality_score: metaTemplate.quality_score,
                quality_score_date: metaTemplate.quality_score?.date ? new Date(metaTemplate.quality_score.date * 1000) : null,
                sincronizado_com_meta: true,
                ultima_sincronizacao_em: new Date().toISOString(),
                aprovado_em: statusNovo === 'APPROVED' ? new Date().toISOString() : null,
                criado_por: null, // Criado via sync, sem usuário
              })
              .select('id')
              .single();

            if (insertError) {
              console.error(`[meta-api-sync-templates] Erro ao inserir template:`, insertError);
              continue;
            }

            novos++;

            // Registrar no histórico
            if (newTemplate) {
              await supabase
                .from('whatsapp_templates_historico')
                .insert({
                  template_id: newTemplate.id,
                  status_anterior: null,
                  status_novo: statusNovo,
                  quality_score: metaTemplate.quality_score,
                  dados_meta: metaTemplate,
                });
            }
          }
        }

        resultados.push({
          contaId: conta.id,
          sucesso: true,
          total: templatesFromMeta.length,
          atualizados,
          novos,
          mudancasStatus,
        });

      } catch (contaError: unknown) {
        const errorMessage = contaError instanceof Error ? contaError.message : 'Erro desconhecido';
        console.error(`[meta-api-sync-templates] Erro ao processar conta ${conta.id}:`, contaError);
        resultados.push({
          contaId: conta.id,
          sucesso: false,
          erro: errorMessage
        });
      }
    }

    console.log('[meta-api-sync-templates] Sincronização concluída', resultados);

    return new Response(
      JSON.stringify({ 
        success: true, 
        resultados,
        sincronizadoEm: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[meta-api-sync-templates] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
