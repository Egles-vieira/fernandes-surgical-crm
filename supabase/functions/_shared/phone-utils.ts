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
 * Procura nos campos: telefone, celular, whatsapp_numero
 * @param supabase - Cliente Supabase
 * @param numeroWhatsApp - Número normalizado (apenas dígitos)
 * @returns ID do contato se encontrado, null caso contrário
 */
export async function buscarContatoCRM(
  supabase: any, 
  numeroWhatsApp: string
): Promise<string | null> {
  if (!numeroWhatsApp) return null;

  const numeroLimpo = normalizarNumeroWhatsApp(numeroWhatsApp);
  
  console.log('🔍 Buscando contato no CRM pelo número:', numeroLimpo);
  
  const { data: contatoCRM, error } = await supabase
    .from('contatos')
    .select('id')
    .or(`telefone.ilike.%${numeroLimpo}%,celular.ilike.%${numeroLimpo}%,whatsapp_numero.ilike.%${numeroLimpo}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ Erro ao buscar contato no CRM:', error);
    return null;
  }

  if (contatoCRM?.id) {
    console.log('✅ Contato encontrado no CRM:', contatoCRM.id);
    return contatoCRM.id;
  }

  console.log('ℹ️ Contato não encontrado no CRM');
  return null;
}
