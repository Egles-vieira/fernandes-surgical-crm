# ✅ TESTE: Trigger Automático de Análise IA

## 🎯 O QUE FOI IMPLEMENTADO

### 1. Trigger Automático na Importação XML
**Arquivo:** `supabase/functions/edi-importar-xml/index.ts`

**Comportamento:**
- Ao importar uma cotação XML, o sistema **automaticamente** dispara a análise IA
- A análise é iniciada em modo "fire-and-forget" (não bloqueia a resposta)
- Logs detalhados são gerados para debug

**Código (linhas 216-232):**
```typescript
// 🤖 TRIGGER AUTOMÁTICO: Disparar análise IA da cotação
if (cotacaoInserida.id) {
  console.log(`🚀 Disparando análise IA automática...`);
  
  supabaseClient.functions.invoke('analisar-cotacao-completa', {
    body: { cotacao_id: cotacaoInserida.id }
  }).then((response) => {
    if (response.error) {
      console.error(`❌ Erro ao iniciar análise IA: ${response.error.message}`);
    } else {
      console.log(`✅ Análise IA iniciada com sucesso`);
    }
  }).catch((err) => {
    console.error(`❌ Falha crítica ao iniciar análise IA: ${err.message}`);
  });
}
```

### 2. Atualização de Status Automática
**Arquivo:** `supabase/functions/analisar-cotacao-completa/index.ts`

**Comportamento:**
- Quando a análise inicia: `step_atual` → `'em_analise'`
- Status IA: `'pendente'` → `'em_analise'` → `'concluida'` ou `'erro'`
- Progresso atualizado em tempo real (0-100%)

**Código (linhas 68-82):**
```typescript
await supabase
  .from('edi_cotacoes')
  .update({
    step_atual: 'em_analise', // Move para aba "Análise IA"
    status_analise_ia: 'em_analise',
    analise_iniciada_em: new Date().toISOString(),
    progresso_analise_percent: 0,
    total_itens_analisados: 0,
    // ...
  })
  .eq('id', cotacao_id);
```

### 3. Componente Visual de Status
**Arquivo:** `src/components/plataformas/StatusAnaliseIABadge.tsx`

**Badges disponíveis:**
- ⏳ **Aguardando análise** (pendente)
- 🤖 **Analisando... 45%** (em_analise) - com animação pulsante
- ✅ **Análise completa** (concluida) - verde
- ❌ **Erro na análise** (erro) - vermelho

---

## 🧪 COMO TESTAR

### Teste 1: Importar XML e Observar Análise Automática

1. **Acesse:** `/plataformas/cotacoes`

2. **Clique em:** "Importar XML"

3. **Selecione:** Um arquivo XML válido do Bionexo

4. **Observe:**
   - Toast de sucesso: "Importação concluída"
   - Cotação aparece na lista com badge: **"Aguardando análise"**
   - Após 2-5 segundos, badge muda para: **"🤖 Analisando... 0%"**
   - Progresso atualiza em tempo real: **"🤖 Analisando... 15%"**, **"30%"**, etc.
   - Ao concluir: **"✅ Análise completa - 48/50 itens"**

5. **Verifique nos logs do navegador (F12):**
   ```
   🚀 Disparando análise IA automática para cotação...
   ✅ Análise IA iniciada com sucesso para cotação [uuid]
   ```

### Teste 2: Verificar Logs da Edge Function

1. **Acesse:** Logs do Supabase
2. **Filtrar por:** `analisar-cotacao-completa`
3. **Buscar por:**
   ```
   🤖 Iniciando análise IA para cotação [uuid]...
   📝 Analisando item 1/50: [descrição]
   ✅ Item 1/50 analisado - Score: 95% - 2345ms
   ✅ Análise completa: 48 sucesso, 2 erros em 123s
   ```

### Teste 3: Verificar Dados no Banco

Execute no SQL Editor do Supabase:

```sql
SELECT 
  id,
  numero_cotacao,
  step_atual,
  status_analise_ia,
  progresso_analise_percent,
  total_itens_analisados,
  total_itens,
  analise_iniciada_em,
  analise_concluida_em,
  tempo_analise_segundos
FROM edi_cotacoes
WHERE criado_em >= NOW() - INTERVAL '1 hour'
ORDER BY criado_em DESC
LIMIT 5;
```

**Resultado esperado:**
```
| step_atual  | status_analise_ia | progresso | itens_analisados | total_itens |
|-------------|-------------------|-----------|------------------|-------------|
| em_analise  | concluida         | 100       | 48               | 50          |
```

### Teste 4: Verificar Itens Analisados

```sql
SELECT 
  id,
  numero_item,
  descricao_produto_cliente,
  analisado_por_ia,
  score_confianca_ia,
  jsonb_array_length(produtos_sugeridos_ia) as total_sugestoes,
  requer_revisao_humana,
  metodo_vinculacao
FROM edi_cotacoes_itens
WHERE cotacao_id = '[ID_DA_COTACAO]'
ORDER BY numero_item;
```

**Resultado esperado:**
```
| analisado_por_ia | score_confianca_ia | total_sugestoes | requer_revisao_humana |
|------------------|--------------------|-----------------|-----------------------|
| true             | 95.5               | 3               | false                 |
| true             | 72.3               | 2               | true                  |
```

---

## 🔍 TROUBLESHOOTING

### Problema: Badge fica em "Aguardando análise" e não muda

**Causa:** Edge function não foi chamada ou falhou

**Solução:**
1. Verificar logs do navegador (F12 → Console):
   - Deve aparecer: `✅ Análise IA iniciada com sucesso`
   - Se aparecer erro: verificar mensagem

2. Verificar logs da edge function:
   - Acessar Supabase Dashboard → Edge Functions → Logs
   - Buscar por erros na função `analisar-cotacao-completa`

3. Verificar secrets configurados:
   - `DEEPSEEK_API_KEY` deve estar configurado
   - `LOVABLE_API_KEY` deve estar configurado

### Problema: Análise fica travada em X%

**Causa:** Item específico está causando timeout ou erro

**Solução:**
1. Verificar logs da edge function para identificar qual item falhou
2. Verificar se o produto tem descrição válida
3. Verificar se DeepSeek está respondendo (pode estar com rate limit)

### Problema: Análise termina com erro

**Causa:** Múltiplos itens falharam

**Solução:**
1. Verificar campo `erro_analise` na tabela `edi_cotacoes`:
   ```sql
   SELECT numero_cotacao, erro_analise 
   FROM edi_cotacoes 
   WHERE status_analise_ia = 'erro'
   ORDER BY criado_em DESC 
   LIMIT 1;
   ```

2. Verificar se há produtos cadastrados no sistema:
   ```sql
   SELECT COUNT(*) FROM produtos WHERE quantidade_em_maos > 0;
   ```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Importar XML dispara análise automaticamente (sem clique manual)
- [ ] Badge mostra "Aguardando análise" → "Analisando..." → "Concluída"
- [ ] Progresso atualiza em tempo real (0% → 100%)
- [ ] Toast de notificação aparece quando análise inicia
- [ ] Toast de notificação aparece quando análise termina
- [ ] Logs aparecem no console do navegador
- [ ] Logs aparecem na edge function
- [ ] Campo `status_analise_ia` é atualizado corretamente
- [ ] Campo `step_atual` muda para `'em_analise'`
- [ ] Itens são marcados com `analisado_por_ia = true`
- [ ] Sugestões são salvas no campo `produtos_sugeridos_ia`
- [ ] Score de confiança é calculado e salvo
- [ ] Tempo de análise é registrado

---

## 📊 MÉTRICAS ESPERADAS

**Para uma cotação de 50 itens:**
- ⏱️ Tempo total de análise: **2-5 minutos**
- 🎯 Taxa de sucesso: **≥ 95%** (47-50 itens com sugestões)
- 📈 Score médio: **≥ 75%**
- 🔄 Frequência de atualização: **A cada item** (progresso atualiza em tempo real)

---

## 🎉 SUCESSO!

Se todos os testes passaram, o **Trigger Automático** está funcionando perfeitamente!

**Próximos passos:**
1. ✅ Sistema de Abas (organizar cotações por status)
2. ✅ Dashboard de Métricas (visão geral da IA)
3. ✅ Funções SQL de Aprendizado (melhorar com feedback)

---

**Documento criado em:** 2025-10-25  
**Versão:** 1.0  
**Status:** ✅ Implementado e testável
