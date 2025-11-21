import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface atualizada para suportar o retorno da Busca Híbrida
interface ProdutoRelevante {
  id: string;
  referencia_interna: string;
  nome: string;
  narrativa: string | null;
  preco_venda: number;
  quantidade_em_maos: number;
  similarity?: number; // Campo novo vindo da busca vetorial
}

// --- FUNÇÕES AUXILIARES ---

// 1. Transcrição de Áudio (Whisper)
async function transcreverAudio(audioUrl: string, openAiKey: string, supabase: any, conversaId: string): Promise<string> {
  try {
    console.log('🎧 Processando áudio:', audioUrl);
    
    let urlParaBaixar = audioUrl;

    // Se for URL criptografada do WhatsApp, descriptografar primeiro
    if (audioUrl.includes('mmg.whatsapp.net') && audioUrl.includes('.enc')) {
      console.log('🔓 Detectado áudio criptografado, buscando mensagem...');
      
      // Buscar mensagem pelo URL para descriptografar
      const { data: mensagem } = await supabase
        .from('whatsapp_mensagens')
        .select('id')
        .eq('conversa_id', conversaId)
        .eq('url_midia', audioUrl)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (mensagem) {
        console.log('📞 Chamando função de descriptografia...');
        
        // Chamar edge function para descriptografar
        const { data: descriptData, error: descriptError } = await supabase.functions.invoke(
          'w-api-baixar-midia',
          { body: { mensagemId: mensagem.id } }
        );

        if (descriptError || !descriptData?.url) {
          console.error('❌ Erro ao descriptografar:', descriptError);
          return "";
        }

        urlParaBaixar = descriptData.url;
        console.log('✅ Áudio descriptografado, nova URL:', urlParaBaixar);
      } else {
        console.warn('⚠️ Mensagem não encontrada para descriptografia');
      }
    }
    
    console.log('🎧 Baixando áudio de:', urlParaBaixar);
    const audioResponse = await fetch(urlParaBaixar);
    
    if (!audioResponse.ok) {
      console.error('❌ Erro ao baixar áudio:', audioResponse.status, audioResponse.statusText);
      return "";
    }
    
    const audioBlob = await audioResponse.blob();
    console.log('✅ Áudio baixado:', audioBlob.size, 'bytes');

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'text');

    console.log('🔄 Enviando para Whisper API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na Whisper API:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    const transcricao = data.text || "";
    console.log('✅ Transcrição concluída:', transcricao.length, 'caracteres');
    return transcricao;
  } catch (e) {
    console.error('❌ Erro na transcrição:', e);
    return "";
  }
}

// 2. Geração de Embedding (OpenAI)
async function gerarEmbedding(texto: string, openAiKey: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texto.replace(/\n/g, ' '),
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error('Erro ao gerar embedding:', e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Captura dados extras como tipoMensagem e urlMidia para suportar áudio
    let { mensagemTexto, conversaId, tipoMensagem, urlMidia } = await req.json();

    console.log("🤖 Agente de Vendas - Iniciando...", { conversaId, tipoMensagem });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!deepseekApiKey || !openAiApiKey) {
      throw new Error("Chaves de API (DeepSeek ou OpenAI) faltando.");
    }

    // Configuração correta para Edge Functions (sem persistência de sessão)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

  // ------------------------------------------------------------------------
  // 0️⃣ TRATAMENTO DE ÁUDIO
  // ------------------------------------------------------------------------
  if (tipoMensagem === 'audio' || tipoMensagem === 'voice') {
    if (urlMidia) {
      console.log('🎧 Tentando transcrever áudio:', urlMidia);
      try {
        const transcricao = await transcreverAudio(urlMidia, openAiApiKey, supabase, conversaId);
        if (transcricao) {
          console.log(`🗣️ Áudio transcrito com sucesso: "${transcricao}"`);
          mensagemTexto = transcricao;
        } else {
          console.error('❌ Transcrição retornou vazio');
          return new Response(
            JSON.stringify({ 
              resposta: "Recebi seu áudio mas não consegui entender. Pode enviar uma mensagem de texto?" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (erro) {
        console.error('❌ Erro ao transcrever áudio:', erro);
        return new Response(
          JSON.stringify({ 
            resposta: "Tive um problema ao processar seu áudio. Pode tentar novamente ou enviar uma mensagem de texto?" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.error('❌ URL de mídia não fornecida para áudio');
      return new Response(
        JSON.stringify({ 
          resposta: "Recebi sua mensagem de voz mas não consegui acessá-la. Pode tentar novamente?" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

    // ------------------------------------------------------------------------
    // 1️⃣ CÉREBRO LÓGICO (Analista DeepSeek)
    // ------------------------------------------------------------------------
    console.log("🧠 Analisando intenção...");
    const analiseResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Você é um extrator de dados para um CRM de vendas.
TAREFA: Identifique se o usuário busca produtos.
SAÍDA: JSON estrito.
Se o usuário pedir "agulha", "AG" ou códigos, extraia como 'palavras_chave'.

Exemplos:
- "Bom dia" -> {"tem_interesse": false}
- "Qual o preço do rolamento?" -> {"tem_interesse": true, "palavras_chave": ["rolamento"]}
- "Tem parafuso sextavado?" -> {"tem_interesse": true, "palavras_chave": ["parafuso", "sextavado"]}`
          },
          { role: "user", content: mensagemTexto },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!analiseResponse.ok) throw new Error("Erro na API DeepSeek (Análise)");

    const analiseData = await analiseResponse.json();
    let analise = { tem_interesse: false, palavras_chave: [] };
    
    try {
      analise = JSON.parse(analiseData.choices[0].message.content);
    } catch (e) {
      console.error("Erro parse JSON DeepSeek:", e);
    }

    console.log("📊 Intenção detectada:", analise);

    // ------------------------------------------------------------------------
    // 2️⃣ BUSCA HÍBRIDA (RPC Supabase + Embeddings)
    // ------------------------------------------------------------------------
    let produtos: ProdutoRelevante[] = [];
    let encontrouAlgo = false;

    if (analise.tem_interesse) {
      const termoBusca = analise.palavras_chave?.length > 0 
        ? analise.palavras_chave.join(" ") 
        : mensagemTexto;
      
      console.log("🔍 Buscando Híbrido:", termoBusca);

      // A. Gerar Embedding da pergunta
      const vetorPergunta = await gerarEmbedding(termoBusca, openAiApiKey);

      // B. Chamar a função RPC Híbrida
      if (vetorPergunta.length > 0) {
        const { data, error } = await supabase.rpc('match_produtos_hibrido', {
          query_text: termoBusca,        // Para busca exata (ilike)
          query_embedding: vetorPergunta, // Para busca semântica (vector)
          match_threshold: 0.5,           // Similaridade mínima (50%)
          match_count: 5                  // Max produtos
        });

        if (error) {
          console.error("Erro RPC Híbrida:", error);
          
          // Fallback: busca simples se RPC falhar
          console.log("⚠️ Usando fallback - busca simples");
          const termosBusca = termoBusca.split(" ")
            .filter((t: string) => t.length > 2)
            .map((p: string) => `nome.ilike.%${p}%,referencia_interna.ilike.%${p}%`)
            .join(",");

          if (termosBusca) {
            const { data: fallbackData } = await supabase
              .from("produtos")
              .select("id, referencia_interna, nome, narrativa, preco_venda, quantidade_em_maos")
              .or(termosBusca)
              .gt("quantidade_em_maos", 0)
              .limit(5);
            
            produtos = fallbackData || [];
          }
        } else {
          produtos = data || [];
        }
        
        encontrouAlgo = produtos.length > 0;
      }
    }

    // ------------------------------------------------------------------------
    // 3️⃣ PERSONALIDADE (O Vendedor "Beto")
    // ------------------------------------------------------------------------
    const contextoProdutos = encontrouAlgo
      ? produtos
          .map((p) => 
            `ITEM: ${p.nome} | CÓD: ${p.referencia_interna} | PREÇO: R$ ${p.preco_venda.toFixed(2)} | ESTOQUE: ${p.quantidade_em_maos}`
          )
          .join("\n")
      : "Nenhum produto encontrado.";

    console.log("🗣️ Gerando resposta do Beto...");

    const respostaResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `
IDENTIDADE:
Você é o "Beto", vendedor na Cirurgica Fernandes.
Você é brasileiro, simpático, usa linguagem coloquial (mas profissional).
NÃO use emojis. Respostas curtas para WhatsApp.

DIRETRIZES:
1. Comece com variações de "Opa!", "Fala aí!", "Tudo bom?".
2. Se tiver produtos: Apresente-os resumidamente com PREÇO. Pergunte se quer fechar.
3. Se NÃO tiver: Peça desculpas ("Putz, fiquei devendo essa") e peça mais detalhes.
4. Use o contexto abaixo. Se o código for exato (ex: AG-500), confirme com certeza.

CONTEXTO TÉCNICO:
${contextoProdutos}

CLIENTE DISSE:
"${mensagemTexto}"
`
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!respostaResponse.ok) throw new Error("Erro ao gerar resposta humanizada");

    const respostaJson = await respostaResponse.json();
    const respostaFinal = respostaJson.choices[0].message.content;

    return new Response(
      JSON.stringify({
        resposta: respostaFinal,
        produtos_encontrados: produtos // Debug útil
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Erro Geral:", error);
    return new Response(
      JSON.stringify({
        resposta: "Opa, deu um probleminha técnico aqui. Pode repetir?",
        error: String(error),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      },
    );
  }
});
