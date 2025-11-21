import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Processar base64 em chunks para evitar problemas de memória
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mensagemId } = await req.json();
    
    if (!mensagemId) {
      throw new Error('mensagemId é obrigatório');
    }

    console.log('🎤 Iniciando transcrição para mensagem:', mensagemId);

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar a mensagem com o áudio
    const { data: mensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('id', mensagemId)
      .single();

    if (msgError || !mensagem) {
      throw new Error(`Mensagem não encontrada: ${msgError?.message}`);
    }

    if (!mensagem.url_midia) {
      throw new Error('Mensagem não possui áudio');
    }

    console.log('📥 Baixando áudio de:', mensagem.url_midia);

    // Baixar o áudio do Supabase Storage
    const audioResponse = await fetch(mensagem.url_midia);
    if (!audioResponse.ok) {
      throw new Error(`Erro ao baixar áudio: ${audioResponse.statusText}`);
    }

    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioArrayBuffer], { type: mensagem.mime_type || 'audio/ogg' });

    console.log('🔊 Áudio baixado, tamanho:', audioBlob.size, 'bytes');

    // Preparar FormData para Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Português

    console.log('🚀 Enviando para Whisper API...');

    // Enviar para OpenAI Whisper
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Erro na API Whisper: ${errorText}`);
    }

    const transcricao = await whisperResponse.json();
    const textoTranscrito = transcricao.text;

    console.log('✅ Transcrição concluída:', textoTranscrito);

    // Atualizar mensagem com transcrição
    const { error: updateError } = await supabase
      .from('whatsapp_mensagens')
      .update({ 
        transcricao_audio: textoTranscrito,
        transcricao_processada_em: new Date().toISOString()
      })
      .eq('id', mensagemId);

    if (updateError) {
      console.error('❌ Erro ao salvar transcrição:', updateError);
      throw updateError;
    }

    console.log('💾 Transcrição salva no banco de dados');

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcricao: textoTranscrito 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na transcrição:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
