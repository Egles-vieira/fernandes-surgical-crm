import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Digital Ocean Spaces Configuration
const DO_SPACES_ENDPOINT = "sfo3.digitaloceanspaces.com";
const DO_SPACES_BUCKET = "road-guard-audios";
const DO_SPACES_REGION = "sfo3";
const DO_SPACES_ACCESS_KEY = 'DO00ZML66HG76UVJG6ZG';
const DO_SPACES_SECRET_KEY = Deno.env.get('DO_SPACES_SECRET_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('Sem autorização');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ticketId = formData.get('ticket_id') as string;

    if (!file) {
      throw new Error('Nenhum arquivo enviado');
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const uniqueFileName = `tickets/${ticketId || 'temp'}/${timestamp}-${randomStr}.${extension}`;

    // Preparar dados para upload
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);

    // Configurar cliente S3
    const s3Client = new S3Client({
      endPoint: DO_SPACES_ENDPOINT,
      region: DO_SPACES_REGION,
      accessKey: DO_SPACES_ACCESS_KEY,
      secretKey: DO_SPACES_SECRET_KEY!,
      bucket: DO_SPACES_BUCKET,
      useSSL: true,
    });

    // Upload para Digital Ocean Spaces
    await s3Client.putObject(uniqueFileName, fileData, {
      metadata: {
        'Content-Type': file.type,
        'x-amz-acl': 'public-read',
      }
    });

    const publicUrl = `https://${DO_SPACES_BUCKET}.${DO_SPACES_REGION}.digitaloceanspaces.com/${uniqueFileName}`;
    
    console.log(`File uploaded successfully: ${publicUrl}`);

    // Determinar tipo de anexo
    let tipoAnexo = 'documento';
    if (file.type.startsWith('image/')) tipoAnexo = 'imagem';
    else if (file.type.startsWith('audio/')) tipoAnexo = 'audio';
    else if (file.type.startsWith('video/')) tipoAnexo = 'video';

    // Salvar registro no banco de dados
    // Se ticket_id for "temp", considerar como null
    const ticketIdToSave = ticketId && ticketId !== 'temp' ? ticketId : null;
    
    const { data: anexo, error: dbError } = await supabase
      .from('tickets_anexos_chat')
      .insert({
        ticket_id: ticketIdToSave,
        nome_arquivo: file.name,
        tipo_arquivo: file.type,
        tamanho_bytes: file.size,
        url_arquivo: publicUrl,
        tipo_anexo: tipoAnexo,
        criado_por: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        anexo,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in upload-anexo-spaces:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
