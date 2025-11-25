/**
 * Transcrever áudio do WhatsApp usando Whisper API
 */
export async function transcreverAudio(
  audioUrl: string, 
  openAiKey: string, 
  supabase: any, 
  conversaId: string
): Promise<string> {
  try {
    console.log('🎧 Processando áudio:', audioUrl);
    
    let urlParaBaixar = audioUrl;

    // Verificar se é áudio criptografado
    if (audioUrl.includes('mmg.whatsapp.net') && audioUrl.includes('.enc')) {
      console.log('🔓 Detectado áudio criptografado');
      
      const { data: mensagem } = await supabase
        .from('whatsapp_mensagens')
        .select('id')
        .eq('conversa_id', conversaId)
        .eq('url_midia', audioUrl)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (mensagem) {
        const { data: descriptData } = await supabase.functions.invoke('w-api-baixar-midia', {
          body: { mensagemId: mensagem.id }
        });

        if (descriptData?.url) {
          urlParaBaixar = descriptData.url;
          console.log('✅ Áudio descriptografado');
        }
      }
    }
    
    const audioResponse = await fetch(urlParaBaixar);
    if (!audioResponse.ok) return "";
    
    const audioBlob = await audioResponse.blob();
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}` },
      body: formData,
    });

    if (!response.ok) return "";
    return await response.text();
  } catch (e) {
    console.error('❌ Erro na transcrição:', e);
    return "";
  }
}

/**
 * Gerar embedding de texto usando OpenAI
 */
export async function gerarEmbedding(texto: string, openAiKey: string): Promise<number[]> {
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

/**
 * Salvar interação na memória de longo prazo com embedding
 */
export async function salvarMemoria(
  supabase: any, 
  conversaId: string, 
  conteudo: string, 
  tipo: string, 
  openAiKey: string
) {
  try {
    console.log(`💾 Salvando memória: [${tipo}] ${conteudo.substring(0, 50)}...`);
    
    const embedding = await gerarEmbedding(conteudo, openAiKey);
    
    if (!embedding || embedding.length === 0) {
      console.error('⚠️ Embedding vazio - pulando salvamento');
      return;
    }
    
    const { data, error } = await supabase.from('whatsapp_conversas_memoria').insert({
      conversa_id: conversaId,
      tipo_interacao: tipo,
      conteudo_resumido: conteudo,
      embedding,
      relevancia_score: 1.0,
      expira_em: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }).select();
    
    if (error) {
      console.error('❌ Erro ao salvar memória:', error);
    } else {
      console.log('✅ Memória salva:', data?.[0]?.id);
    }
  } catch (e) {
    console.error('❌ Erro ao salvar memória:', e);
  }
}
