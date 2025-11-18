# Integração TOTVS Datasul - Cálculo de Pedido

## Visão Geral

Esta documentação descreve a integração com a API TOTVS Datasul para cálculo automático de pedidos de venda, incluindo impostos, descontos e totais.

## Endpoint da API

**URL**: `http://172.19.245.25:8080/api/rest-api/v1/CalculaPedido`  
**Método**: POST  
**Autenticação**: Basic Auth

## Edge Function

### Chamando a Edge Function

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('calcular-pedido-datasul', {
  body: {
    venda_id: 'uuid-da-venda'
  }
});
```

### Resposta de Sucesso

```json
{
  "success": true,
  "venda_id": "uuid-da-venda",
  "numero_venda": "V12345",
  "resumo": {
    "total_itens": 5,
    "tempo_resposta_ms": 1234
  },
  "datasul_response": {
    // JSON completo retornado pelo Datasul
  }
}
```

### Resposta de Erro

```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": "Detalhes adicionais"
}
```

## Mapeamento de Dados

### Cabeçalho do Pedido

| Campo Datasul | Tabela | Campo Banco | Observações |
|---------------|--------|-------------|-------------|
| cod-emitente | vendas | cod_emitente | Código do emitente |
| tipo-pedido | tipos_pedido | nome | Nome do tipo de pedido |
| cotacao | vendas | numero_venda | Número da venda como cotação |
| cod-estabel | empresas | codigo_estabelecimento | Código do estabelecimento |
| nat-operacao | empresas | natureza_operacao | Natureza da operação |
| cod-cond-pag | condicoes_pagamento | codigo_integracao | Código da condição de pagamento |
| cod-transp | - | - | Fixo: 24249 |
| vl-frete-inf | - | - | Fixo: 0.0 |
| cod-rep | perfis_usuario | codigo_vendedor | Código do vendedor/representante |
| nr-tabpre | - | - | Fixo: "SE-CFI" |
| perc-desco1 | - | - | Fixo: 0.0 |
| fat-parcial | vendas | faturamento_parcial | Mapeado: YES → "S", NO → "N" |

### Itens do Pedido

| Campo Datasul | Tabela | Campo Banco | Observações |
|---------------|--------|-------------|-------------|
| nr-sequencia | vendas_itens | sequencia_item | Sequência do item |
| it-codigo | produtos | referencia_interna | Código/referência interna do produto |
| cod-refer | - | - | Vazio: "" |
| nat-operacao | - | - | Fixo: "610809" |
| qt-pedida | vendas_itens | quantidade | Quantidade solicitada |
| vl-preuni | vendas_itens | preco_tabela | Preço unitário |
| vl-pretab | vendas_itens | preco_tabela | Preço de tabela |
| vl-preori | vendas_itens | preco_tabela | Preço original |
| vl-preco-base | vendas_itens | preco_tabela | Preço base |
| per-des-item | vendas_itens | desconto | Percentual de desconto |

## Formato de Envio (Request)

```json
{
  "pedido": [
    {
      "cod-emitente": 0,
      "tipo-pedido": "VENDA",
      "cotacao": "V12345",
      "cod-estabel": "01",
      "nat-operacao": "5101",
      "cod-cond-pag": 1,
      "cod-transp": 24249,
      "vl-frete-inf": 0.0,
      "cod-rep": 100,
      "nr-tabpre": "SE-CFI",
      "perc-desco1": 0.0,
      "fat-parcial": "N",
      "item": [
        {
          "nr-sequencia": 1,
          "it-codigo": "PROD001",
          "cod-refer": "",
          "nat-operacao": "610809",
          "qt-pedida": 10,
          "vl-preuni": 50.00,
          "vl-pretab": 50.00,
          "vl-preori": 50.00,
          "vl-preco-base": 50.00,
          "per-des-item": 5.0
        }
      ]
    }
  ]
}
```

## Log de Integrações

Todas as chamadas à API Datasul são registradas na tabela `integracoes_totvs_calcula_pedido`:

### Estrutura da Tabela

- **id**: UUID (chave primária)
- **venda_id**: UUID (referência para vendas)
- **numero_venda**: TEXT (número da venda)
- **request_payload**: JSONB (payload enviado)
- **response_payload**: JSONB (resposta recebida)
- **status**: TEXT ('sucesso' ou 'erro')
- **error_message**: TEXT (mensagem de erro, se houver)
- **tempo_resposta_ms**: INTEGER (tempo de resposta em milissegundos)
- **created_at**: TIMESTAMPTZ (data/hora da integração)

### Consultando Logs

```sql
-- Logs da última semana
SELECT 
  numero_venda,
  status,
  tempo_resposta_ms,
  error_message,
  created_at
FROM integracoes_totvs_calcula_pedido
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Taxa de sucesso
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM integracoes_totvs_calcula_pedido
GROUP BY status;

-- Tempo médio de resposta
SELECT 
  AVG(tempo_resposta_ms) as tempo_medio_ms,
  MIN(tempo_resposta_ms) as tempo_minimo_ms,
  MAX(tempo_resposta_ms) as tempo_maximo_ms
FROM integracoes_totvs_calcula_pedido
WHERE status = 'sucesso'
  AND created_at >= NOW() - INTERVAL '7 days';
```

## Validações

Antes de enviar para o Datasul, a Edge Function valida:

1. ✅ Venda existe no banco
2. ✅ Empresa possui código de estabelecimento e natureza de operação
3. ✅ Tipo de pedido existe e está vinculado à venda
4. ✅ Condição de pagamento existe e possui código de integração
5. ✅ Vendedor existe e possui código de vendedor
6. ✅ Venda possui pelo menos um item
7. ✅ Todos os produtos dos itens possuem referência interna

Se alguma validação falhar, a integração retorna erro antes de chamar o Datasul.

## Tratamento de Erros

### Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| "venda_id é obrigatório" | Parâmetro não enviado | Enviar venda_id no body |
| "Venda não encontrada" | ID inválido ou venda não existe | Verificar se a venda existe |
| "Dados da empresa não encontrados" | Nenhuma empresa cadastrada | Cadastrar empresa no sistema |
| "Tipo de pedido não encontrado" | Venda sem tipo_pedido_id | Associar tipo de pedido à venda |
| "Condição de pagamento não encontrada" | Venda sem condicao_pagamento_id | Associar condição de pagamento |
| "Vendedor não encontrado" | Venda sem vendedor_id | Associar vendedor à venda |
| "Nenhum item encontrado na venda" | Venda sem itens | Adicionar itens à venda |
| "Campos obrigatórios faltando" | Dados incompletos | Preencher todos os campos obrigatórios |
| "Erro Datasul: HTTP XXX" | Erro na API Datasul | Verificar logs do Datasul |

### Timeout

A Edge Function possui timeout de **30 segundos**. Se o Datasul não responder neste período, a integração falhará com erro de timeout.

## Segurança

- ✅ Autenticação via JWT (apenas usuários autenticados)
- ✅ Credenciais Datasul em variáveis de ambiente (não expostas)
- ✅ RLS habilitado na tabela de logs
- ✅ Apenas usuários com roles 'admin', 'manager' ou 'sales' podem visualizar logs

## Variáveis de Ambiente

As seguintes secrets devem estar configuradas:

- `DATASUL_USER`: Usuário da API Datasul
- `DATASUL_PASS`: Senha da API Datasul

## Configuração

A Edge Function está configurada no `supabase/config.toml`:

```toml
[functions.calcular-pedido-datasul]
verify_jwt = true
```

## Próximos Passos

### Melhorias Futuras

1. **Hook React**: Criar `useDatasulCalculaPedido` para facilitar chamadas do frontend
2. **Retry Automático**: Implementar retry em caso de falha temporária
3. **Processamento em Lote**: Calcular múltiplos pedidos de uma vez
4. **Dashboard**: Interface para visualizar logs e métricas
5. **Notificações**: Alertas em caso de erro nas integrações
6. **Cache**: Cachear resultados de cálculos idênticos

### Integrações Adicionais

- Consulta de estoque
- Envio de pedidos
- Consulta de preços
- Rastreamento de pedidos
