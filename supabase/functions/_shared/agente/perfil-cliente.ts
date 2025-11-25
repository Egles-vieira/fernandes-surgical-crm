import type { PerfilCliente } from './types.ts';

/**
 * Buscar e analisar perfil do cliente baseado em histórico de compras
 */
export async function buscarPerfilCliente(
  clienteId: string | null, 
  supabase: any
): Promise<PerfilCliente> {
  console.log('👤 Buscando perfil do cliente:', clienteId);
  
  if (!clienteId) {
    return {
      tipo: 'lead',
      marcadores: ['cliente_novo'],
      historico_compras: 0,
      ticket_medio: 0,
      ultima_compra_dias: 9999
    };
  }
  
  try {
    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome_emit, nome_fantasia, criado_em')
      .eq('id', clienteId)
      .single();
    
    // Buscar histórico de vendas
    const { data: vendas } = await supabase
      .from('vendas')
      .select('valor_total, criado_em')
      .eq('cliente_id', clienteId)
      .order('criado_em', { ascending: false });
    
    const totalCompras = vendas?.length || 0;
    const ticketMedio = vendas?.reduce((sum: number, v: any) => sum + (v.valor_total || 0), 0) / (totalCompras || 1);
    
    // Calcular dias desde última compra
    let ultimaCompraDias = 9999;
    if (vendas && vendas.length > 0) {
      const ultimaCompra = new Date(vendas[0].criado_em);
      const hoje = new Date();
      ultimaCompraDias = Math.floor((hoje.getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Determinar tipo de cliente
    let tipo: 'cliente_novo' | 'cliente_vip' | 'cliente_regular' = 'cliente_regular';
    const marcadores: string[] = [];
    
    if (totalCompras === 0) {
      tipo = 'cliente_novo';
      marcadores.push('cliente_novo');
    } else if (totalCompras > 10 && ticketMedio > 5000) {
      tipo = 'cliente_vip';
      marcadores.push('cliente_vip', 'alto_valor');
    } else {
      tipo = 'cliente_regular';
    }
    
    // Marcadores adicionais
    if (ticketMedio > 10000) marcadores.push('ticket_alto');
    if (totalCompras > 20) marcadores.push('frequente');
    if (ultimaCompraDias > 90 && totalCompras > 0) marcadores.push('inativo');
    if (ultimaCompraDias < 30 && totalCompras > 0) marcadores.push('ativo_recente');
    
    const perfil = {
      tipo,
      marcadores,
      historico_compras: totalCompras,
      ticket_medio: ticketMedio,
      ultima_compra_dias: ultimaCompraDias,
      nome: cliente?.nome_fantasia || cliente?.nome_emit
    };
    
    console.log('✅ Perfil:', perfil);
    return perfil;
    
  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    return {
      tipo: 'lead',
      marcadores: ['erro_perfil'],
      historico_compras: 0,
      ticket_medio: 0,
      ultima_compra_dias: 9999
    };
  }
}
