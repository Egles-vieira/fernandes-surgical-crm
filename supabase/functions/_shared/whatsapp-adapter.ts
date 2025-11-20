import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export async function enviarMensagemWhatsApp(mensagemId: string, supabase: any) {
  console.log('📤 Enviando mensagem via adapter:', mensagemId);

  // Buscar configuração global
  const { data: config } = await supabase
    .from('whatsapp_config_global')
    .select('provedor_ativo')
    .single();

  const provedor = config?.provedor_ativo || 'w_api';

  // Buscar mensagem e conta
  const { data: mensagem } = await supabase
    .from('whatsapp_mensagens')
    .select(`
      *,
      whatsapp_contas (id, w_api_token, w_api_instancia)
    `)
    .eq('id', mensagemId)
    .single();

  if (!mensagem) {
    throw new Error('Mensagem não encontrada');
  }

  const conta = mensagem.whatsapp_contas;

  if (provedor === 'w_api') {
    // Enviar via W-API
    const response = await fetch(`https://api.w-api.app/instances/${conta.w_api_instancia}/client/action/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${conta.w_api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: mensagem.whatsapp_contatos?.numero_whatsapp + '@c.us',
        contentType: 'string',
        content: mensagem.corpo
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao enviar via W-API');
    }

    const result = await response.json();
    
    // Atualizar status
    await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        status_enviada_em: new Date().toISOString(),
        webhook_id_externo: result.messageId
      })
      .eq('id', mensagemId);

    return result;
  } else {
    // Gupshup - implementar se necessário
    throw new Error('Provedor Gupshup não implementado neste adapter');
  }
}
