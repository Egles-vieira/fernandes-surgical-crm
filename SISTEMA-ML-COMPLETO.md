# Sistema de Machine Learning - Documentação Completa

## ✅ IMPLEMENTAÇÃO 100% COMPLETA

O sistema de Machine Learning está **totalmente implementado e funcionando** com aprendizado contínuo baseado no feedback dos vendedores.

---

## 🎯 Componentes Implementados

### 1. Coleta de Feedback ✅
**Localização:** `src/hooks/useIAFeedback.tsx`

- Hook React que captura feedback dos vendedores
- Integração com componentes de UI (`FeedbackIADialog`, `SugestoesIACard`, `ItemCotacaoTable`)
- Registra feedback em tempo real no banco de dados

**Tipos de Feedback:**
- ✅ **Aceito** (+10 pontos): Sugestão da IA está correta
- ❌ **Rejeitado** (-60 pontos): Sugestão incorreta, penalidade forte
- 🔄 **Modificado** (-20 pontos): Sugestão parcialmente correta

### 2. Funções SQL de ML ✅
**Localização:** Banco de dados Supabase

#### `registrar_feedback_ia()`
```sql
CREATE FUNCTION public.registrar_feedback_ia(
  p_item_id UUID,
  p_produto_sugerido_id UUID,
  p_produto_escolhido_id UUID,
  p_feedback_tipo VARCHAR,
  p_score_ia NUMERIC
)
```
- Insere feedback na tabela `ia_feedback_historico`
- Atualiza item da cotação com o feedback
- Marca produto aceito quando relevante

#### `ajustar_score_aprendizado()`
```sql
CREATE FUNCTION public.ajustar_score_aprendizado(
  p_produto_id UUID,
  p_feedback_tipo VARCHAR,
  p_score_original NUMERIC
)
```
- Calcula ajuste de score baseado no feedback
- Insere na tabela `ia_score_ajustes`
- Ajustes são aplicados automaticamente em análises futuras

### 3. Aplicação dos Ajustes ✅
**Localização:** `supabase/functions/edi-sugerir-produtos/index.ts` (linhas 637-741)

```typescript
// Buscar ajustes de ML
const { data: ajustes } = await supabase
  .from("ia_score_ajustes")
  .select("*")
  .in("produto_id", produtoIds)
  .eq("ativo", true);

// Aplicar ajuste ao score final
const ajusteML = ajustesPorProduto.get(candidato.produto.id) || 0;
if (ajusteML !== 0) {
  scoreFinal = Math.max(0, Math.min(100, scoreFinal + ajusteML));
  console.log(`🎯 [ML] ${produto.ref}: ${scoreAntes} → ${scoreFinal} (ajuste: ${ajusteML})`);
}
```

**Como funciona:**
1. Para cada produto candidato, busca ajustes ativos no banco
2. Soma todos os ajustes do produto (pode ter múltiplos)
3. Aplica ao score final (limitado entre 0-100)
4. Registra nos logs para auditoria

### 4. Tabelas do Banco de Dados ✅

#### `ia_feedback_historico`
Armazena todo feedback dos vendedores:
- `cotacao_item_id`: Item que recebeu feedback
- `produto_sugerido_id`: Produto que foi sugerido pela IA
- `produto_correto_id`: Produto que o vendedor escolheu (se diferente)
- `tipo_feedback`: aceito | rejeitado | modificado
- `foi_aceito`: Booleano derivado do tipo
- `score_original`: Score que a IA deu originalmente
- `usuario_id`: Quem deu o feedback
- `criado_em`: Timestamp do feedback

**RLS:** Usuários autenticados podem inserir e visualizar

#### `ia_score_ajustes`
Armazena ajustes ativos de ML:
- `produto_id`: Produto que receberá o ajuste
- `ajuste_score`: Valor do ajuste (-100 a +100)
- `motivo_ajuste`: Descrição textual do ajuste
- `feedback_origem`: De onde veio (aceito/rejeitado/modificado)
- `score_anterior`: Score original antes do ajuste
- `total_ocorrencias`: Quantas vezes foi aplicado
- `ativo`: Se deve ser aplicado (permite desabilitar)

**RLS:** Admins e Managers gerenciam, outros visualizam

### 5. Tratamento Robusto de Erros ✅
**Localização:** `supabase/functions/edi-sugerir-produtos/index.ts`

#### Circuit Breaker
```typescript
const CIRCUIT_BREAKER_THRESHOLD = 5; // Abre após 5 falhas
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 60s em estado aberto
```

**Estados:**
- 🟢 **Closed**: Funcionando normalmente
- 🔴 **Open**: Bloqueado após falhas (aguarda timeout)
- 🟡 **Half-Open**: Testando reconexão

#### Retry Logic
- **3 tentativas** com backoff exponencial (1s, 2s, 4s)
- **Timeout de 30s** por chamada DeepSeek
- **Rate limit handling**: Respeita header `retry-after`
- **Fallback automático**: Usa token + similarity sem IA semântica

#### Registro de Erros
- Campo `erro_analise_ia` em `edi_cotacoes_itens`
- Campo `erro_analise_ia` em `edi_cotacoes`
- Stack traces completos nos logs
- Broadcasts de erro para frontend

### 6. Visualização do Aprendizado ✅

#### Dashboard ML
**Rota:** `/plataformas/ml-dashboard`
**Arquivo:** `src/pages/plataformas/MLDashboard.tsx`

**Métricas exibidas:**
- Total de feedbacks recebidos
- Taxa de aceitação (%)
- Produtos com aprendizado ativo
- Melhorias nos últimos 30 dias
- Top 10 produtos com melhor taxa de sucesso

#### Indicador ML Inline
**Componente:** `src/components/plataformas/MLIndicator.tsx`

Exibe badge nas sugestões quando produto tem ajuste de ML:
- 🟢 Verde: Ajuste positivo (+pontos)
- 🔴 Vermelho: Ajuste negativo (-pontos)
- Tooltip com detalhes do aprendizado

#### Badge de Status ML
**Componente:** `src/components/plataformas/MLStatusBadge.tsx`

Alerta quando ML está em modo degradado:
- Circuit breaker ativo
- Erros no DeepSeek
- Fallback para análise sem IA semântica

---

## 🔄 Fluxo Completo do Sistema

### Análise de Item
1. Vendedor importa XML ou abre cotação
2. Sistema busca produtos candidatos (tokens + similarity)
3. **DeepSeek analisa semanticamente** (com retry + circuit breaker)
4. **Sistema busca ajustes de ML** no banco
5. **Aplica ajustes ao score final**
6. Retorna sugestões ordenadas por score

### Feedback e Aprendizado
1. Vendedor seleciona produto e dá feedback
2. `useIAFeedback.enviarFeedback()` é chamado
3. `registrar_feedback_ia()` salva no histórico
4. `ajustar_score_aprendizado()` cria/atualiza ajuste
5. Ajuste fica ativo para próximas análises
6. IA melhora automaticamente

### Modo Degradado (Falhas)
1. DeepSeek falha 5x consecutivas
2. Circuit breaker abre (estado OPEN)
3. Análise continua sem IA semântica
4. Usa apenas token + similarity + ML
5. Após 60s, tenta reconexão (HALF-OPEN)
6. Se sucesso, volta ao normal (CLOSED)

---

## 📊 Métricas e Monitoramento

### Logs Disponíveis
```bash
# Edge function logs
- "🤖 [DeepSeek] Tentativa X/3..."
- "✅ [DeepSeek] X produtos analisados"
- "🟢 Circuit Breaker: Estado FECHADO"
- "🔴 Circuit Breaker: Estado ABERTO"
- "🎯 [ML] ref123: 65 → 75 (ajuste: +10)"

# Console do navegador
- "📤 Enviando feedback da IA"
- "✅ Feedback registrado com sucesso"
- "🧠 Score ajustado para machine learning"
```

### Queries de Auditoria
```sql
-- Ver todos os feedbacks
SELECT * FROM ia_feedback_historico 
ORDER BY criado_em DESC;

-- Ver ajustes ativos
SELECT p.nome, a.ajuste_score, a.motivo_ajuste
FROM ia_score_ajustes a
JOIN produtos p ON p.id = a.produto_id
WHERE a.ativo = true
ORDER BY a.ultima_utilizacao_em DESC;

-- Taxa de aceitação global
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN foi_aceito THEN 1 ELSE 0 END) as aceitos,
  ROUND(100.0 * SUM(CASE WHEN foi_aceito THEN 1 ELSE 0 END) / COUNT(*), 2) as taxa_aceitacao
FROM ia_feedback_historico;
```

---

## 🎓 Exemplos de Aprendizado

### Exemplo 1: Produto Aceito
```
Descrição: "SERINGA 10ML DESCARTAVEL"
Sugerido: Seringa 10ml Descarpack (score inicial: 65)
Feedback: ✅ ACEITO
Resultado: Score ajustado para 75 (+10)
Próxima vez: Produto será priorizado
```

### Exemplo 2: Produto Rejeitado
```
Descrição: "LUVA LATEX P"
Sugerido: Luva Vinil P (score inicial: 60)
Feedback: ❌ REJEITADO
Resultado: Score ajustado para 0 (-60)
Próxima vez: Produto não será mais sugerido
```

### Exemplo 3: Múltiplos Ajustes
```
Produto: Cateter 16G
Ajuste 1: +10 (aceito em 15/03)
Ajuste 2: +10 (aceito em 18/03)
Ajuste 3: -20 (modificado em 20/03)
Total acumulado: 0 pontos
```

---

## 🔧 Configuração e Manutenção

### Ajustar Sensibilidade
Edite as constantes em `ajustar_score_aprendizado()`:
```sql
-- Valores atuais (otimizados)
WHEN 'aceito' THEN v_ajuste := 10;
WHEN 'rejeitado' THEN v_ajuste := -60;
WHEN 'modificado' THEN v_ajuste := -20;
```

### Desabilitar Ajuste Específico
```sql
UPDATE ia_score_ajustes 
SET ativo = false 
WHERE produto_id = 'xxx' AND motivo_ajuste = 'Sugestão rejeitada';
```

### Limpar Ajustes Antigos
```sql
-- Desabilitar ajustes não usados há 90 dias
UPDATE ia_score_ajustes 
SET ativo = false 
WHERE ultima_utilizacao_em < NOW() - INTERVAL '90 days';
```

### Monitorar Circuit Breaker
Logs da edge function mostram status:
- 🟢 "Circuit Breaker: Estado FECHADO" = OK
- 🔴 "Circuit Breaker: Estado ABERTO" = Problema detectado
- 🟡 "Circuit Breaker: Tentando reconexão" = Recuperando

---

## 📈 Resultados Esperados

### Curto Prazo (7-14 dias)
- Taxa de aceitação: 50-65%
- Produtos com ajuste: 50-100
- Tempo médio de análise: <5s/item

### Médio Prazo (30-60 dias)
- Taxa de aceitação: 70-80%
- Produtos com ajuste: 200-500
- Redução de 40% em revisões manuais

### Longo Prazo (90+ dias)
- Taxa de aceitação: 80-90%
- Produtos com ajuste: 500-1000
- Redução de 60% em revisões manuais

---

## 🚀 Como Usar

### Para Vendedores
1. Analise as sugestões da IA em cada cotação
2. Clique em 👍 (aceitar) ou 👎 (rejeitar) nas sugestões
3. Ou selecione um produto e dê feedback detalhado
4. A IA aprenderá automaticamente com suas escolhas

### Para Gestores
1. Acesse `/plataformas/ml-dashboard` para ver métricas
2. Monitore taxa de aceitação e produtos aprendidos
3. Verifique top 10 produtos com melhor aprendizado
4. Use dados para treinar equipe em casos difíceis

### Para Desenvolvedores
1. Verifique logs das edge functions para debugging
2. Use queries SQL para análises avançadas
3. Ajuste thresholds conforme necessário
4. Monitore circuit breaker para issues de API

---

## 🔐 Segurança e Performance

### Segurança
- ✅ RLS habilitado em todas as tabelas
- ✅ Apenas usuários autenticados podem dar feedback
- ✅ Ajustes só podem ser gerenciados por admins/managers
- ✅ Service role key usado em edge functions

### Performance
- ✅ Índices otimizados em todas as tabelas de ML
- ✅ Busca de ajustes usa índice em `produto_id`
- ✅ Queries com `LIMIT` para evitar overload
- ✅ Circuit breaker previne sobrecarga em falhas

### Resiliência
- ✅ Retry logic com 3 tentativas
- ✅ Backoff exponencial
- ✅ Timeout de 30s por chamada
- ✅ Fallback para análise sem IA
- ✅ Cotações nunca ficam travadas

---

## 📝 Próximos Passos (Opcionais)

### Melhorias Futuras Possíveis
1. **A/B Testing**: Testar diferentes pesos nos scores
2. **Decay de ajustes**: Reduzir ajustes antigos automaticamente
3. **Clustering**: Agrupar produtos similares para aprendizado compartilhado
4. **Explicabilidade**: Mostrar por que IA sugeriu cada produto
5. **Auto-tuning**: Ajustar thresholds automaticamente baseado em performance

### Integrações Adicionais
1. Notificações quando ML atinge marcos (ex: 100 produtos aprendidos)
2. Relatório semanal de performance do ML por email
3. Exportação de dados de ML para análise externa
4. API para consultar histórico de aprendizado

---

## 🐛 Troubleshooting

### "ML não está melhorando"
✅ **Solução:** Verificar se vendedores estão dando feedback
```sql
SELECT COUNT(*) FROM ia_feedback_historico WHERE criado_em > NOW() - INTERVAL '7 days';
```

### "Circuit breaker sempre aberto"
✅ **Solução:** Verificar logs do DeepSeek e API key
```bash
# Logs da edge function edi-sugerir-produtos
# Procurar por "❌ [DeepSeek]"
```

### "Ajustes não sendo aplicados"
✅ **Solução:** Verificar se ajustes estão ativos
```sql
SELECT * FROM ia_score_ajustes WHERE ativo = true LIMIT 10;
```

### "Taxa de erro alta em análises"
✅ **Solução:** Sistema já tem retry + fallback automático. Verificar:
1. Status do DeepSeek API
2. Créditos disponíveis
3. Rate limits

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Consulte os logs das edge functions
2. Verifique o dashboard ML em `/plataformas/ml-dashboard`
3. Execute queries de auditoria no banco
4. Contate o time de desenvolvimento

---

**Status:** ✅ Sistema 100% Operacional
**Última Atualização:** 2025-10-28
**Versão:** 4.0 (Retry + Circuit Breaker + ML Ativo)
