import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH_URL = "https://graph.facebook.com";
const META_API_VERSION = "v21.0";

interface TokenDebugResponse {
  data?: {
    app_id?: string;
    type?: string;
    application?: string;
    data_access_expires_at?: number;
    expires_at?: number;
    is_valid?: boolean;
    scopes?: string[];
    error?: {
      code: number;
      message: string;
    };
  };
  error?: {
    message: string;
    code: number;
  };
}

interface VerificationResult {
  contaId: string;
  nomeConta: string;
  diasRestantes: number | null;
  valido: boolean;
  alertaCriado: boolean;
  erro?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[verificar-tokens-cron] Iniciando verificação automática de tokens");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todas as contas Meta Cloud API ativas
    const { data: contas, error: contasError } = await supabase
      .from("whatsapp_contas")
      .select("id, nome_conta, meta_access_token, token_expira_em, token_alertado_em")
      .is("excluido_em", null)
      .eq("provedor", "meta_cloud_api")
      .not("meta_access_token", "is", null);

    if (contasError) {
      console.error("[verificar-tokens-cron] Erro ao buscar contas:", contasError);
      throw new Error(`Erro ao buscar contas: ${contasError.message}`);
    }

    if (!contas || contas.length === 0) {
      console.log("[verificar-tokens-cron] Nenhuma conta Meta Cloud API encontrada");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhuma conta Meta Cloud API para verificar",
          verificadas: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verificar-tokens-cron] Encontradas ${contas.length} contas para verificar`);

    const resultados: VerificationResult[] = [];

    // 2. Verificar cada conta
    for (const conta of contas) {
      const resultado: VerificationResult = {
        contaId: conta.id,
        nomeConta: conta.nome_conta || "Sem nome",
        diasRestantes: null,
        valido: false,
        alertaCriado: false,
      };

      try {
        // Chamar Meta debug_token API
        const debugUrl = `${META_GRAPH_URL}/${META_API_VERSION}/debug_token?input_token=${conta.meta_access_token}&access_token=${conta.meta_access_token}`;
        
        console.log(`[verificar-tokens-cron] Verificando token da conta: ${conta.nome_conta}`);
        
        const debugResponse = await fetch(debugUrl);
        const tokenData: TokenDebugResponse = await debugResponse.json();

        if (tokenData.error) {
          console.error(`[verificar-tokens-cron] Erro Meta API para ${conta.nome_conta}:`, tokenData.error);
          resultado.erro = tokenData.error.message;
          
          // Registrar log de erro
          await supabase.from("whatsapp_tokens_log").insert({
            conta_id: conta.id,
            evento: "verificacao_erro",
            detalhes: { error: tokenData.error },
          });
          
          resultados.push(resultado);
          continue;
        }

        const data = tokenData.data;
        resultado.valido = data?.is_valid ?? false;

        // Calcular data de expiração e dias restantes
        let expiresAt: Date | null = null;
        if (data?.expires_at && data.expires_at > 0) {
          expiresAt = new Date(data.expires_at * 1000);
          resultado.diasRestantes = Math.floor(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
        } else if (data?.data_access_expires_at && data.data_access_expires_at > 0) {
          expiresAt = new Date(data.data_access_expires_at * 1000);
          resultado.diasRestantes = Math.floor(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
        }

        console.log(`[verificar-tokens-cron] Token ${conta.nome_conta}: válido=${resultado.valido}, diasRestantes=${resultado.diasRestantes}`);

        // 3. Atualizar banco de dados
        const updateData: Record<string, unknown> = {
          token_renovacao_tentativas: 0,
        };
        
        if (expiresAt) {
          updateData.token_expira_em = expiresAt.toISOString();
        }

        await supabase
          .from("whatsapp_contas")
          .update(updateData)
          .eq("id", conta.id);

        // 4. Criar notificação se expira em < 7 dias e não foi alertado ainda
        const precisaAlerta = 
          resultado.diasRestantes !== null && 
          resultado.diasRestantes < 7 && 
          !conta.token_alertado_em;

        if (precisaAlerta) {
          console.log(`[verificar-tokens-cron] Criando alerta para ${conta.nome_conta} - expira em ${resultado.diasRestantes} dias`);

          // Buscar admins para notificar
          const { data: admins } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (admins && admins.length > 0) {
            const notificacoes = admins.map((admin) => ({
              usuario_id: admin.user_id,
              tipo: "alerta_sistema",
              titulo: "⚠️ Token WhatsApp Expirando",
              descricao: `O token da conta "${conta.nome_conta}" expira em ${resultado.diasRestantes} dia(s). Acesse as configurações para renovar.`,
              link: "/whatsapp/configuracoes",
              prioridade: "alta",
            }));

            await supabase.from("notificacoes").insert(notificacoes);
          }

          // Marcar como alertado
          await supabase
            .from("whatsapp_contas")
            .update({ token_alertado_em: new Date().toISOString() })
            .eq("id", conta.id);

          resultado.alertaCriado = true;
        }

        // 5. Registrar log de verificação
        await supabase.from("whatsapp_tokens_log").insert({
          conta_id: conta.id,
          evento: "verificacao_automatica",
          detalhes: {
            valido: resultado.valido,
            diasRestantes: resultado.diasRestantes,
            scopes: data?.scopes,
            alertaCriado: resultado.alertaCriado,
          },
        });

      } catch (err) {
        console.error(`[verificar-tokens-cron] Erro ao verificar conta ${conta.nome_conta}:`, err);
        resultado.erro = err instanceof Error ? err.message : "Erro desconhecido";
      }

      resultados.push(resultado);
    }

    // Resumo
    const tokensProblemáticos = resultados.filter(
      (r) => !r.valido || (r.diasRestantes !== null && r.diasRestantes < 7)
    );

    console.log(`[verificar-tokens-cron] Verificação concluída. Total: ${resultados.length}, Problemáticos: ${tokensProblemáticos.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        verificadas: resultados.length,
        problematicos: tokensProblemáticos.length,
        resultados,
        executadoEm: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[verificar-tokens-cron] Erro geral:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
