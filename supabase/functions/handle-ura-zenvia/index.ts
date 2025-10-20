import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zenvia-token',
};

interface URA {
  id: string;
  nome: string;
  numero_telefone: string;
  ativo: boolean;
  mensagem_boas_vindas: string;
  tipo_mensagem_boas_vindas: string;
  url_audio_boas_vindas: string | null;
  voz_tts: string;
  tempo_espera_digito: number;
  opcao_invalida_mensagem: string;
  max_tentativas_invalidas: number;
  acao_apos_max_tentativas: string;
  ramal_transferencia_padrao: string | null;
}

interface URAOpcao {
  id: string;
  ura_id: string;
  numero_opcao: number;
  titulo: string;
  tipo_acao: string;
  ura_submenu_id: string | null;
  ramal_destino: string | null;
  numero_destino: string | null;
  mensagem_antes_acao: string | null;
  url_audio: string | null;
  ativo: boolean;
  horario_disponivel: any;
}

// Inicializar cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Valida token do Zenvia no header
 */
function validarTokenZenvia(request: Request): boolean {
  const zenviaToken = request.headers.get('x-zenvia-token');
  const expectedToken = Deno.env.get('ZENVIA_WEBHOOK_TOKEN');
  
  if (!expectedToken) {
    console.warn('⚠️ ZENVIA_WEBHOOK_TOKEN não configurado');
    return true; // Permitir em desenvolvimento
  }
  
  return zenviaToken === expectedToken;
}

/**
 * Valida horário de funcionamento da URA
 */
function validarHorarioFuncionamento(ura: URA): boolean {
  // TODO: Implementar validação de horário baseado na tabela ura_horarios
  // Por enquanto, retorna true (sempre disponível)
  return true;
}

/**
 * Constrói menu no formato esperado pelo Zenvia
 */
function construirMenuZenvia(ura: URA, opcoes: URAOpcao[]) {
  const opcoesAtivas = opcoes.filter(o => o.ativo);
  
  return {
    resposta: 'menu_opcoes',
    dados_menu: {
      mensagem: ura.mensagem_boas_vindas,
      tipo_mensagem: ura.tipo_mensagem_boas_vindas,
      voz: ura.voz_tts,
      url_audio: ura.url_audio_boas_vindas,
      timeout: ura.tempo_espera_digito,
      opcoes: opcoesAtivas.map(o => ({
        digito: o.numero_opcao.toString(),
        label: o.titulo,
        tipo_acao: o.tipo_acao,
      })),
    },
  };
}

/**
 * Registra log de chamada
 */
async function registrarLog(
  supabase: any,
  chamadaId: string,
  uraId: string,
  numeroOrigem: string,
  acao: string,
  dados: any
) {
  try {
    const { error } = await supabase.from('ura_logs').upsert({
      chamada_id: chamadaId,
      ura_id: uraId,
      numero_origem: numeroOrigem,
      opcoes_selecionadas: dados.opcoes_selecionadas || [],
      duracao_total: dados.duracao_total || null,
      status_final: dados.status_final || 'em_andamento',
      transferido_para: dados.transferido_para || null,
      tentativas_invalidas: dados.tentativas_invalidas || 0,
      gravacao_url: dados.gravacao_url || null,
      metadata: { acao, timestamp: new Date().toISOString(), ...dados },
    }, {
      onConflict: 'chamada_id',
    });

    if (error) {
      console.error('❌ Erro ao registrar log:', error);
    } else {
      console.log(`✅ Log registrado: ${acao} - Chamada ${chamadaId}`);
    }
  } catch (err) {
    console.error('❌ Erro ao registrar log:', err);
  }
}

/**
 * Handler principal
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const path = url.pathname;

  console.log(`📞 Requisição recebida: ${req.method} ${path}`);

  try {
    // Validar token Zenvia (exceto para endpoint de teste)
    if (!path.includes('/test') && !validarTokenZenvia(req)) {
      console.error('❌ Token Zenvia inválido');
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. INCOMING CALL - Nova chamada chegando
    if (path.includes('/incoming-call') && req.method === 'POST') {
      const body = await req.json();
      const { chamada_id, numero_destino, numero_origem } = body;

      console.log(`📥 Chamada recebida: ${chamada_id} de ${numero_origem} para ${numero_destino}`);

      // Buscar URA pelo número de telefone
      const { data: ura, error: uraError } = await supabase
        .from('uras')
        .select('*')
        .eq('numero_telefone', numero_destino)
        .eq('ativo', true)
        .single();

      if (uraError || !ura) {
        console.error('❌ URA não encontrada ou inativa:', numero_destino);
        return new Response(
          JSON.stringify({
            resposta: 'erro',
            mensagem: 'Número não disponível para atendimento',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validar horário de funcionamento
      if (!validarHorarioFuncionamento(ura)) {
        return new Response(
          JSON.stringify({
            resposta: 'fora_horario',
            mensagem: 'Estamos fora do horário de atendimento',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar opções da URA
      const { data: opcoes, error: opcoesError } = await supabase
        .from('ura_opcoes')
        .select('*')
        .eq('ura_id', ura.id)
        .eq('ativo', true)
        .order('ordem');

      if (opcoesError) {
        console.error('❌ Erro ao buscar opções:', opcoesError);
        return new Response(
          JSON.stringify({ error: 'Erro ao carregar opções' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Registrar log inicial
      await registrarLog(supabase, chamada_id, ura.id, numero_origem, 'chamada_iniciada', {
        opcoes_selecionadas: [],
        tentativas_invalidas: 0,
      });

      // Retornar menu para Zenvia
      const menu = construirMenuZenvia(ura, opcoes || []);
      console.log(`✅ Menu construído para URA: ${ura.nome}`);

      return new Response(JSON.stringify(menu), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. OPTION SELECTED - Usuário selecionou uma opção
    if (path.includes('/option-selected') && req.method === 'POST') {
      const body = await req.json();
      const { chamada_id, ura_id, opcao_selecionada, tentativas_invalidas } = body;

      console.log(`🔢 Opção selecionada: ${opcao_selecionada} - Chamada: ${chamada_id}`);

      // Buscar URA
      const { data: ura, error: uraError } = await supabase
        .from('uras')
        .select('*')
        .eq('id', ura_id)
        .single();

      if (uraError || !ura) {
        console.error('❌ URA não encontrada');
        return new Response(
          JSON.stringify({ error: 'URA não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar opção selecionada
      const { data: opcao, error: opcaoError } = await supabase
        .from('ura_opcoes')
        .select('*')
        .eq('ura_id', ura_id)
        .eq('numero_opcao', parseInt(opcao_selecionada))
        .eq('ativo', true)
        .single();

      if (opcaoError || !opcao) {
        console.log(`⚠️ Opção inválida: ${opcao_selecionada}`);

        const novasTentativas = (tentativas_invalidas || 0) + 1;

        // Verificar se excedeu tentativas
        if (novasTentativas >= ura.max_tentativas_invalidas) {
          console.log('❌ Máximo de tentativas inválidas excedido');

          await registrarLog(supabase, chamada_id, ura_id, '', 'max_tentativas_excedido', {
            tentativas_invalidas: novasTentativas,
            status_final: 'desligada',
          });

          // Executar ação configurada
          if (ura.acao_apos_max_tentativas === 'transferir_atendente') {
            return new Response(
              JSON.stringify({
                resposta: 'transferir',
                dados_transferencia: {
                  tipo: 'ramal',
                  destino: ura.ramal_transferencia_padrao,
                  mensagem_antes: 'Transferindo para um atendente...',
                },
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else if (ura.acao_apos_max_tentativas === 'correio_voz') {
            return new Response(
              JSON.stringify({
                resposta: 'correio_voz',
                mensagem: 'Por favor, deixe sua mensagem após o sinal.',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            return new Response(
              JSON.stringify({
                resposta: 'desligar',
                mensagem: 'Obrigado por ligar. Até logo!',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Repetir menu com mensagem de erro
        const { data: opcoes } = await supabase
          .from('ura_opcoes')
          .select('*')
          .eq('ura_id', ura_id)
          .eq('ativo', true)
          .order('ordem');

        return new Response(
          JSON.stringify({
            resposta: 'opcao_invalida',
            mensagem: ura.opcao_invalida_mensagem,
            tentativas_invalidas: novasTentativas,
            menu: construirMenuZenvia(ura, opcoes || []),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Opção válida encontrada - processar ação
      console.log(`✅ Executando ação: ${opcao.tipo_acao}`);

      // Atualizar log
      await registrarLog(supabase, chamada_id, ura_id, '', 'opcao_selecionada', {
        opcao_selecionada: opcao_selecionada,
        opcao_titulo: opcao.titulo,
        tipo_acao: opcao.tipo_acao,
      });

      // Processar ação
      let resposta: any = {};

      switch (opcao.tipo_acao) {
        case 'menu_submenu':
          // Carregar submenu
          const { data: submenuOpcoes } = await supabase
            .from('ura_opcoes')
            .select('*')
            .eq('ura_id', opcao.ura_submenu_id)
            .eq('ativo', true)
            .order('ordem');

          const { data: submenu } = await supabase
            .from('uras')
            .select('*')
            .eq('id', opcao.ura_submenu_id)
            .single();

          resposta = {
            resposta: 'submenu',
            mensagem_antes: opcao.mensagem_antes_acao,
            menu: submenu ? construirMenuZenvia(submenu, submenuOpcoes || []) : null,
          };
          break;

        case 'transferir_ramal':
          resposta = {
            resposta: 'transferir',
            dados_transferencia: {
              tipo: 'ramal',
              destino: opcao.ramal_destino,
              mensagem_antes: opcao.mensagem_antes_acao || `Transferindo para ${opcao.titulo}...`,
              aguardar_atendimento: true,
            },
          };
          break;

        case 'transferir_numero':
          resposta = {
            resposta: 'transferir',
            dados_transferencia: {
              tipo: 'numero_externo',
              destino: opcao.numero_destino,
              mensagem_antes: opcao.mensagem_antes_acao || `Transferindo para ${opcao.titulo}...`,
              aguardar_atendimento: true,
            },
          };
          break;

        case 'reproduzir_audio':
          resposta = {
            resposta: 'reproduzir_audio',
            url_audio: opcao.url_audio,
            mensagem_antes: opcao.mensagem_antes_acao,
            voltar_menu: true,
          };
          break;

        case 'enviar_callback':
          // Criar registro de callback (pode ser implementado em outra tabela)
          resposta = {
            resposta: 'solicitar_callback',
            mensagem: opcao.mensagem_antes_acao || 'Por favor, diga seu número para retornarmos a ligação.',
          };
          break;

        case 'desligar':
          resposta = {
            resposta: 'desligar',
            mensagem: opcao.mensagem_antes_acao || 'Obrigado por ligar. Até logo!',
          };
          break;

        case 'correio_voz':
          resposta = {
            resposta: 'correio_voz',
            mensagem: opcao.mensagem_antes_acao || 'Por favor, deixe sua mensagem após o sinal.',
          };
          break;

        default:
          resposta = {
            resposta: 'erro',
            mensagem: 'Ação não implementada',
          };
      }

      return new Response(JSON.stringify(resposta), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. CALL ENDED - Chamada encerrada
    if (path.includes('/call-ended') && req.method === 'POST') {
      const body = await req.json();
      const { chamada_id, duracao_total, gravacao_url, status_final } = body;

      console.log(`📴 Chamada encerrada: ${chamada_id} - Duração: ${duracao_total}s`);

      // Buscar log existente
      const { data: logExistente } = await supabase
        .from('ura_logs')
        .select('*')
        .eq('chamada_id', chamada_id)
        .single();

      if (logExistente) {
        await supabase
          .from('ura_logs')
          .update({
            duracao_total,
            gravacao_url,
            status_final: status_final || 'completada',
          })
          .eq('chamada_id', chamada_id);
      }

      return new Response(
        JSON.stringify({ success: true, mensagem: 'Chamada finalizada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. TEST - Testar URA sem fazer chamada real
    if (path.includes('/test/') && req.method === 'GET') {
      const uraId = path.split('/test/')[1];

      console.log(`🧪 Testando URA: ${uraId}`);

      const { data: ura, error: uraError } = await supabase
        .from('uras')
        .select('*')
        .eq('id', uraId)
        .single();

      if (uraError || !ura) {
        return new Response(
          JSON.stringify({ error: 'URA não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: opcoes } = await supabase
        .from('ura_opcoes')
        .select('*')
        .eq('ura_id', uraId)
        .order('ordem');

      const estrutura = {
        ura: {
          id: ura.id,
          nome: ura.nome,
          ativo: ura.ativo,
          numero_telefone: ura.numero_telefone,
        },
        menu: construirMenuZenvia(ura, opcoes || []),
        opcoes: opcoes?.map(o => ({
          numero: o.numero_opcao,
          titulo: o.titulo,
          tipo_acao: o.tipo_acao,
          ativo: o.ativo,
          detalhes: {
            ramal_destino: o.ramal_destino,
            numero_destino: o.numero_destino,
            mensagem_antes: o.mensagem_antes_acao,
          },
        })),
      };

      return new Response(JSON.stringify(estrutura, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rota não encontrada
    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        detalhes: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
