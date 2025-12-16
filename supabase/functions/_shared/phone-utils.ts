/**
 * Utilitários para normalização de números de telefone WhatsApp
 * Garante formato consistente em todo o sistema
 */

/**
 * Normaliza um número de WhatsApp removendo todos os caracteres não numéricos
 * @param numero - Número de telefone em qualquer formato
 * @returns Número contendo apenas dígitos (ex: "5511999998888")
 */
export function normalizarNumeroWhatsApp(numero: string): string {
  if (!numero) return '';
  // Remove tudo exceto dígitos (0-9)
  return numero.replace(/\D/g, '');
}

/**
 * Busca um contato no CRM pelo número de WhatsApp
 * Usa a função otimizada do banco de dados com índices
 * @param supabase - Cliente Supabase
 * @param numeroWhatsApp - Número de telefone (qualquer formato)
 * @returns ID do contato se encontrado, null caso contrário
 */
export async function buscarContatoCRM(
  supabase: any, 
  numeroWhatsApp: string
): Promise<string | null> {
  if (!numeroWhatsApp) return null;

  const numeroLimpo = normalizarNumeroWhatsApp(numeroWhatsApp);
  
  console.log('🔍 Buscando contato no CRM pelo número:', numeroLimpo);
  
  // Usa a função RPC otimizada do banco de dados
  const { data: contatoId, error } = await supabase
    .rpc('buscar_contato_crm_por_telefone', { numero_whatsapp: numeroLimpo });

  if (error) {
    console.error('❌ Erro ao buscar contato no CRM:', error);
    return null;
  }

  if (contatoId) {
    console.log('✅ Contato encontrado no CRM:', contatoId);
    return contatoId;
  }

  console.log('ℹ️ Contato não encontrado no CRM');
  return null;
}
