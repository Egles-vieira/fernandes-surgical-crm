import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para converter base64 para ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Função para gerar chaves de descriptografia usando HKDF
async function deriveMediaKeys(mediaKeyBuffer: ArrayBuffer, mediaType: string): Promise<{ iv: ArrayBuffer, cipherKey: ArrayBuffer }> {
  const info = mediaType === 'image' ? 'WhatsApp Image Keys'
    : mediaType === 'video' ? 'WhatsApp Video Keys'
    : mediaType === 'audio' ? 'WhatsApp Audio Keys'
    : 'WhatsApp Document Keys';
  
  // Importar a mediaKey como CryptoKey
  const importedKey = await crypto.subtle.importKey(
    'raw',
    mediaKeyBuffer,
    'HKDF',
    false,
    ['deriveBits']
  );
  
  // Derivar 112 bytes usando HKDF
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(info)
    },
    importedKey,
    112 * 8 // 112 bytes em bits
  );
  
  // Os primeiros 16 bytes são o IV, os próximos 32 são a chave de cifra
  const derivedArray = new Uint8Array(derivedBits);
  const iv = derivedArray.slice(0, 16).buffer;
  const cipherKey = derivedArray.slice(16, 48).buffer;
  
  return { iv, cipherKey };
}

// Função para descriptografar mídia do WhatsApp
async function decryptWhatsAppMedia(
  encryptedBuffer: ArrayBuffer,
  mediaKeyBase64: string,
  mediaType: string
): Promise<ArrayBuffer> {
  // Converter mediaKey de base64 para ArrayBuffer
  const mediaKeyBuffer = base64ToArrayBuffer(mediaKeyBase64);
  
  // Derivar as chaves
  const { iv, cipherKey } = await deriveMediaKeys(mediaKeyBuffer, mediaType);
  
  // Remover os últimos 10 bytes (MAC) do arquivo criptografado
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedArray.slice(0, -10).buffer;
  
  // Importar a chave de cifra para descriptografia
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    cipherKey,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  
  // Descriptografar
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv },
    cryptoKey,
    ciphertext
  );
  
  return decryptedBuffer;
}

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

    // 1. Buscar mensagem com metadata
    const { data: mensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('id', mensagemId)
      .single();

    if (msgError || !mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    const urlMidiaOriginal = mensagem.url_midia;
    const metadata = mensagem.metadata || {};

    if (!urlMidiaOriginal) {
      throw new Error('Mensagem não possui mídia');
    }

    // 2. Se for URL do WhatsApp criptografada, descriptografar
    if (urlMidiaOriginal.includes('mmg.whatsapp.net') && urlMidiaOriginal.includes('.enc')) {
      console.log('🔓 Descriptografando mídia do WhatsApp:', urlMidiaOriginal);

      // Verificar se temos a mediaKey no metadata
      const mediaKey = metadata.mediaKey;
      if (!mediaKey) {
        throw new Error('mediaKey não encontrado no metadata da mensagem. Não é possível descriptografar.');
      }

      // Baixar arquivo criptografado
      console.log('⬇️ Baixando arquivo criptografado...');
      const encryptedResponse = await fetch(urlMidiaOriginal);
      
      if (!encryptedResponse.ok) {
        throw new Error(`Falha ao baixar arquivo: ${encryptedResponse.status}`);
      }

      const encryptedBuffer = await encryptedResponse.arrayBuffer();
      console.log('✅ Arquivo criptografado baixado:', encryptedBuffer.byteLength, 'bytes');

      // Descriptografar
      console.log('🔐 Descriptografando com mediaKey...');
      const mediaType = mensagem.tipo_mensagem || 'audio';
      const decryptedBuffer = await decryptWhatsAppMedia(encryptedBuffer, mediaKey, mediaType);
      console.log('✅ Arquivo descriptografado:', decryptedBuffer.byteLength, 'bytes');

      // Determinar mime type e extensão
      const mimeType = mensagem.mime_type || 'audio/ogg; codecs=opus';
      const fileExtension = mimeType.includes('ogg') ? 'ogg' : mimeType.split('/')[1]?.split(';')[0] || 'ogg';
      
      // Criar Blob com mime type correto
      const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType });
      const fileSize = decryptedBlob.size;
      
      // 3. Fazer upload para Supabase Storage
      const fileName = `whatsapp-audio/${mensagemId}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-midias')
        .upload(fileName, decryptedBlob, {
          contentType: mimeType,
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
      console.log('✅ Mídia descriptografada e salva em:', novaUrl);

      // 5. Atualizar mensagem com nova URL
      await supabase
        .from('whatsapp_mensagens')
        .update({
          url_midia: novaUrl,
          metadata: {
            ...metadata,
            url_original: urlMidiaOriginal,
            descriptografado: true,
            descriptografado_em: new Date().toISOString()
          }
        })
        .eq('id', mensagemId);

      return new Response(
        JSON.stringify({
          success: true,
          url: novaUrl,
          originalUrl: urlMidiaOriginal,
          fileSize,
          decrypted: true
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
