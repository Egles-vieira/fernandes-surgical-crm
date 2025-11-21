import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mensagemId } = await req.json();

    if (!mensagemId) {
      throw new Error('mensagemId é obrigatório');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar mensagem
    const { data: mensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('id', mensagemId)
      .single();

    if (msgError || !mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    const urlMidiaOriginal = mensagem.url_midia;

    if (!urlMidiaOriginal) {
      throw new Error('Mensagem não possui mídia');
    }

    // 2. Se for URL do WhatsApp criptografada, baixar e salvar
    if (urlMidiaOriginal.includes('mmg.whatsapp.net') && urlMidiaOriginal.includes('.enc')) {
      console.log('🔓 Processando mídia criptografada:', urlMidiaOriginal);

      // Baixar arquivo criptografado
      console.log('⬇️ Baixando arquivo...');
      const mediaResponse = await fetch(urlMidiaOriginal);
      
      if (!mediaResponse.ok) {
        console.error('❌ Erro ao baixar:', mediaResponse.status);
        throw new Error(`Falha ao baixar mídia: ${mediaResponse.status}`);
      }

      // Obter o arquivo
      const mediaBlob = await mediaResponse.blob();
      const fileSize = mediaBlob.size;
      console.log('✅ Arquivo baixado:', fileSize, 'bytes');

      // 3. Fazer upload para Supabase Storage
      const fileExtension = mensagem.mime_type?.split('/')[1] || 'ogg';
      const fileName = `whatsapp-audio/${mensagemId}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-midias')
        .upload(fileName, mediaBlob, {
          contentType: mensagem.mime_type || 'audio/ogg',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Erro ao fazer upload:', uploadError);
        throw uploadError;
      }

      // 4. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('whatsapp-midias')
        .getPublicUrl(fileName);

      const novaUrl = urlData.publicUrl;
      console.log('✅ Mídia salva em:', novaUrl);

      // 5. Atualizar mensagem com nova URL
      await supabase
        .from('whatsapp_mensagens')
        .update({
          url_midia: novaUrl,
          metadata: {
            ...mensagem.metadata,
            url_original: urlMidiaOriginal,
            processado: true,
            processado_em: new Date().toISOString()
          }
        })
        .eq('id', mensagemId);

      return new Response(
        JSON.stringify({
          success: true,
          url: novaUrl,
          originalUrl: urlMidiaOriginal,
          fileSize,
          note: 'Arquivo pode estar criptografado - pode não reproduzir'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // URL já é acessível
    return new Response(
      JSON.stringify({
        success: true,
        url: urlMidiaOriginal,
        alreadyAccessible: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
