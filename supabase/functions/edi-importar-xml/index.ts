import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemCotacao {
  id_item: string;
  codigo_produto?: string;
  descricao: string;
  unidade_medida?: string;
  quantidade: number;
  marca_cliente?: string;
  dados_originais: any;
}

interface CotacaoImportada {
  id_cotacao_externa: string;
  numero_cotacao?: string;
  cnpj_cliente: string;
  nome_cliente?: string;
  cidade_cliente?: string;
  uf_cliente?: string;
  data_abertura: string;
  data_vencimento: string;
  itens: ItemCotacao[];
  dados_originais: any;
  detalhes: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { xml_conteudo, plataforma_id, tipo_plataforma = 'bionexo' } = await req.json();
    
    if (!xml_conteudo || !plataforma_id) {
      return new Response(
        JSON.stringify({ error: 'xml_conteudo e plataforma_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('📥 Iniciando importação de XML...');

    // Parse do XML baseado no tipo de plataforma
    let cotacoes: CotacaoImportada[];
    
    if (tipo_plataforma === 'bionexo') {
      cotacoes = await parseBionexoXML(xml_conteudo);
    } else {
      throw new Error(`Tipo de plataforma '${tipo_plataforma}' não suportado ainda`);
    }

    console.log(`✅ ${cotacoes.length} cotação(ões) encontrada(s) no XML`);

    // Inserir cotações no banco
    const resultados = {
      sucesso: 0,
      duplicadas: 0,
      erros: 0,
      detalhes: [] as any[],
    };

    for (const cotacao of cotacoes) {
      try {
        // Verificar se já existe
        const { data: existente } = await supabase
          .from('edi_cotacoes')
          .select('id')
          .eq('plataforma_id', plataforma_id)
          .eq('id_cotacao_externa', cotacao.id_cotacao_externa)
          .maybeSingle();

        if (existente) {
          resultados.duplicadas++;
          resultados.detalhes.push({
            id_cotacao: cotacao.id_cotacao_externa,
            status: 'duplicada',
          });
          continue;
        }

        // Inserir cotação
        const { data: cotacaoInserida, error: cotacaoError } = await supabase
          .from('edi_cotacoes')
          .insert({
            plataforma_id,
            id_cotacao_externa: cotacao.id_cotacao_externa,
            numero_cotacao: cotacao.numero_cotacao,
            cnpj_cliente: cotacao.cnpj_cliente,
            nome_cliente: cotacao.nome_cliente,
            cidade_cliente: cotacao.cidade_cliente,
            uf_cliente: cotacao.uf_cliente,
            data_abertura: cotacao.data_abertura,
            data_vencimento_original: cotacao.data_vencimento,
            data_vencimento_atual: cotacao.data_vencimento,
            step_atual: 'nova',
            resgatada: false,
            total_itens: cotacao.itens.length,
            dados_originais: cotacao.dados_originais,
            detalhes: cotacao.detalhes,
            dados_brutos: xml_conteudo,
          })
          .select()
          .single();

        if (cotacaoError) {
          console.error('Erro ao inserir cotação:', cotacaoError);
          resultados.erros++;
          resultados.detalhes.push({
            id_cotacao: cotacao.id_cotacao_externa,
            status: 'erro',
            erro: cotacaoError.message,
          });
          continue;
        }

        // Inserir itens da cotação
        const itensParaInserir = cotacao.itens.map((item, index) => ({
          cotacao_id: cotacaoInserida.id,
          id_item_externo: item.id_item,
          numero_item: index + 1,
          codigo_produto_cliente: item.codigo_produto,
          descricao_produto_cliente: item.descricao,
          unidade_medida: item.unidade_medida,
          quantidade_solicitada: item.quantidade,
          marca_cliente: item.marca_cliente,
          dados_originais: item.dados_originais,
          status: 'pendente',
        }));

        const { error: itensError } = await supabase
          .from('edi_cotacoes_itens')
          .insert(itensParaInserir);

        if (itensError) {
          console.error('Erro ao inserir itens:', itensError);
          // Deletar cotação se falhou nos itens
          await supabase
            .from('edi_cotacoes')
            .delete()
            .eq('id', cotacaoInserida.id);
          
          resultados.erros++;
          resultados.detalhes.push({
            id_cotacao: cotacao.id_cotacao_externa,
            status: 'erro',
            erro: itensError.message,
          });
          continue;
        }

        // Buscar vínculos DE-PARA para os itens
        for (const item of cotacao.itens) {
          if (item.codigo_produto) {
            const { data: vinculo } = await supabase
              .from('edi_produtos_vinculo')
              .select('produto_id')
              .eq('plataforma_id', plataforma_id)
              .eq('cnpj_cliente', cotacao.cnpj_cliente)
              .eq('codigo_produto_cliente', item.codigo_produto)
              .eq('ativo', true)
              .maybeSingle();

            if (vinculo) {
              await supabase
                .from('edi_cotacoes_itens')
                .update({ produto_id: vinculo.produto_id })
                .eq('cotacao_id', cotacaoInserida.id)
                .eq('id_item_externo', item.id_item);
            }
          }
        }

        resultados.sucesso++;
        resultados.detalhes.push({
          id_cotacao: cotacao.id_cotacao_externa,
          status: 'importada',
          total_itens: cotacao.itens.length,
        });

        console.log(`✅ Cotação ${cotacao.id_cotacao_externa} importada com sucesso`);

      } catch (error) {
        console.error('Erro ao processar cotação:', error);
        resultados.erros++;
        resultados.detalhes.push({
          id_cotacao: cotacao.id_cotacao_externa,
          status: 'erro',
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // Registrar log
    await supabase.from('edi_logs_integracao').insert({
      plataforma_id,
      operacao: 'IMPORTACAO_MANUAL',
      tipo: 'request',
      metodo: 'POST',
      parametros: { tipo_plataforma },
      payload_enviado: xml_conteudo.substring(0, 1000), // Primeiros 1000 chars
      sucesso: resultados.erros === 0,
      mensagem_retorno: `${resultados.sucesso} importadas, ${resultados.duplicadas} duplicadas, ${resultados.erros} erros`,
    });

    return new Response(
      JSON.stringify({
        mensagem: 'Importação concluída',
        resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Parser específico para XML do Bionexo
async function parseBionexoXML(xmlString: string): Promise<CotacaoImportada[]> {
  // Remover BOM e espaços
  const cleanXml = xmlString.trim().replace(/^\uFEFF/, '');
  
  // Parse XML manualmente (regex-based para simplicidade)
  const cotacoes: CotacaoImportada[] = [];
  
  // Buscar blocos <Pedido> (formato real do Bionexo)
  const pedidoRegex = /<(?:Pedido|pedido)[^>]*>([\s\S]*?)<\/(?:Pedido|pedido)>/gi;
  const pedidoMatches = cleanXml.matchAll(pedidoRegex);
  
  for (const match of pedidoMatches) {
    const pedidoXml = match[1];
    
    try {
      // Extrair bloco Cabecalho
      const cabecalhoMatch = pedidoXml.match(/<Cabecalho[^>]*>([\s\S]*?)<\/Cabecalho>/i);
      if (!cabecalhoMatch) {
        console.warn('Pedido sem Cabecalho, pulando...');
        continue;
      }
      const cabecalhoXml = cabecalhoMatch[1];
      
      // Extrair campos principais do cabeçalho
      const id_cotacao = extrairTag(cabecalhoXml, ['Id_Pdc', 'IdPDC', 'id_pdc']);
      const numero = extrairTag(cabecalhoXml, ['Titulo_Pdc', 'TituloPDC', 'titulo_pdc']);
      
      if (!id_cotacao) {
        console.warn('Pedido sem ID, pulando...');
        continue;
      }

      // Dados do hospital/comprador
      const cnpj = (extrairTag(cabecalhoXml, ['CNPJ_Hospital', 'CnpjHospital', 'CNPJ', 'cnpj']) || '').replace(/[.\-\/]/g, '');
      const nome = extrairTag(cabecalhoXml, ['Nome_Hospital', 'NomeHospital', 'nome_hospital']);
      
      // Extrair cidade e UF do endereço de entrega se disponível
      const enderecoEntrega = extrairTag(cabecalhoXml, ['Endereco_Entrega', 'EnderecoEntrega', 'endereco_entrega']);
      let cidade = '';
      let uf = '';
      if (enderecoEntrega) {
        // Formato típico: "Rua X, Numero - Bairro, CIDADE, UF"
        const enderecoMatch = enderecoEntrega.match(/,([^,]+),([A-Z]{2})\s*$/i);
        if (enderecoMatch) {
          cidade = enderecoMatch[1].trim();
          uf = enderecoMatch[2].trim().toUpperCase();
        }
      }

      // Datas - montar a partir de Data + Hora
      const dataVenc = extrairTag(cabecalhoXml, ['Data_Vencimento', 'DataVencimento', 'data_vencimento']);
      const horaVenc = extrairTag(cabecalhoXml, ['Hora_Vencimento', 'HoraVencimento', 'hora_vencimento']);
      const dataVencimento = dataVenc ? `${dataVenc} ${horaVenc || '23:59'}` : '';
      
      // Data de abertura - usar data atual se não disponível
      const dataAbertura = new Date().toISOString().split('T')[0];

      if (!cnpj || !dataVencimento) {
        console.warn(`Pedido ${id_cotacao} com dados incompletos (CNPJ ou data), pulando...`);
        continue;
      }

      // Parse dos itens
      const itensRequisicaoMatch = pedidoXml.match(/<Itens_Requisicao[^>]*>([\s\S]*?)<\/Itens_Requisicao>/i);
      if (!itensRequisicaoMatch) {
        console.warn(`Pedido ${id_cotacao} sem Itens_Requisicao, pulando...`);
        continue;
      }
      
      const itensRequisicaoXml = itensRequisicaoMatch[1];
      const itemRegex = /<Item_Requisicao[^>]*>([\s\S]*?)<\/Item_Requisicao>/gi;
      const itemMatches = itensRequisicaoXml.matchAll(itemRegex);
      const itens: ItemCotacao[] = [];

      for (const itemMatch of itemMatches) {
        const itemXml = itemMatch[1];
        
        const sequencia = extrairTag(itemXml, ['Sequencia', 'sequencia']);
        const id_artigo = extrairTag(itemXml, ['Id_Artigo', 'IdArtigo', 'id_artigo']);
        const codigo = extrairTag(itemXml, ['Codigo_Produto', 'CodigoProduto', 'codigo_produto']);
        const descricao = extrairTag(itemXml, ['Descricao_Produto', 'DescricaoProduto', 'descricao_produto']);
        const unidade = extrairTag(itemXml, ['Unidade_Medida', 'UnidadeMedida', 'unidade_medida']);
        const quantidade = extrairTag(itemXml, ['Quantidade', 'quantidade']);
        const marca = extrairTag(itemXml, ['Marca_Favorita', 'MarcaFavorita', 'marca_favorita']);

        if (!descricao || !quantidade) {
          console.warn(`Item ${id_artigo || sequencia} sem descrição ou quantidade, pulando...`);
          continue;
        }

        itens.push({
          id_item: id_artigo || `seq_${sequencia}`,
          codigo_produto: codigo,
          descricao: descricao,
          unidade_medida: unidade,
          quantidade: parseFloat(quantidade),
          marca_cliente: marca,
          dados_originais: {
            sequencia,
            xml_snippet: itemXml.substring(0, 500),
          },
        });
      }

      if (itens.length === 0) {
        console.warn(`Pedido ${id_cotacao} sem itens válidos, pulando...`);
        continue;
      }

      cotacoes.push({
        id_cotacao_externa: id_cotacao,
        numero_cotacao: numero,
        cnpj_cliente: cnpj,
        nome_cliente: nome,
        cidade_cliente: cidade,
        uf_cliente: uf,
        data_abertura: formatarDataBionexo(dataAbertura),
        data_vencimento: formatarDataBionexo(dataVencimento),
        itens,
        dados_originais: {
          xml_snippet: cabecalhoXml.substring(0, 1000),
        },
        detalhes: {
          forma_pagamento: extrairTag(cabecalhoXml, ['Forma_Pagamento', 'FormaPagamento']),
          observacao: extrairTag(cabecalhoXml, ['Observacao', 'observacao']),
          termo: extrairTag(cabecalhoXml, ['Termo', 'termo']),
          contato: extrairTag(cabecalhoXml, ['Contato', 'contato']),
          endereco_entrega: enderecoEntrega,
        },
      });

      console.log(`✅ Pedido ${id_cotacao} parseado: ${itens.length} itens`);

    } catch (error) {
      console.error('Erro ao processar Pedido:', error);
      continue;
    }
  }

  if (cotacoes.length === 0) {
    throw new Error('Nenhuma cotação válida encontrada no XML. Verifique se o arquivo está no formato Bionexo.');
  }

  console.log(`📦 Total de ${cotacoes.length} cotação(ões) parseada(s) com sucesso`);
  return cotacoes;
}

// Função auxiliar para extrair valor de tag XML
function extrairTag(xml: string, tagNames: string[]): string | undefined {
  for (const tagName of tagNames) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

// Formatar data do padrão Bionexo para ISO
function formatarDataBionexo(dataStr: string): string {
  // Formatos possíveis: "DD/MM/YYYY HH:mm:ss", "YYYY-MM-DD", "DD/MM/YYYY"
  try {
    if (dataStr.includes('T')) {
      // Já está em formato ISO
      return dataStr;
    }
    
    if (dataStr.includes('/')) {
      // DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss
      const [datePart, timePart] = dataStr.split(' ');
      const [dia, mes, ano] = datePart.split('/');
      const time = timePart || '00:00:00';
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${time}`;
    }
    
    // YYYY-MM-DD
    return `${dataStr}T00:00:00`;
  } catch {
    return new Date().toISOString();
  }
}
