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
  
  // Busca todos os contatos e normaliza os números para comparação
  const { data: contatos, error } = await supabase
    .from('contatos')
    .select('id, telefone, celular, whatsapp_numero');

  if (error) {
    console.error('❌ Erro ao buscar contatos no CRM:', error);
    return null;
  }

  // Busca contato normalizando os números
  const contatoEncontrado = contatos?.find((contato: any) => {
    const telefoneLimpo = normalizarNumeroWhatsApp(contato.telefone || '');
    const celularLimpo = normalizarNumeroWhatsApp(contato.celular || '');
    const whatsappLimpo = normalizarNumeroWhatsApp(contato.whatsapp_numero || '');
    
    // Verifica se o número limpo contém ou está contido no número procurado
    return (numeroLimpo && telefoneLimpo && (numeroLimpo.includes(telefoneLimpo) || telefoneLimpo.includes(numeroLimpo))) ||
           (numeroLimpo && celularLimpo && (numeroLimpo.includes(celularLimpo) || celularLimpo.includes(numeroLimpo))) ||
           (numeroLimpo && whatsappLimpo && (numeroLimpo.includes(whatsappLimpo) || whatsappLimpo.includes(numeroLimpo)));
  });

  if (contatoEncontrado?.id) {
    console.log('✅ Contato encontrado no CRM:', contatoEncontrado.id);
    return contatoEncontrado.id;
  }

  console.log('ℹ️ Contato não encontrado no CRM');
  return null;
}
