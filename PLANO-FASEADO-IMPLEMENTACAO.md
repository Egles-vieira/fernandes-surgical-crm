# 📋 PLANO FASEADO - Implementação Completa Análise IA

**Data**: 25/10/2025  
**Status Atual**: ~65% implementado  
**Meta**: 100% funcional e testado

---

## 🎯 VISÃO GERAL DAS FASES

| Fase | Nome | Prioridade | Tempo Estimado | Status |
|------|------|------------|----------------|--------|
| **0** | Validação do Trigger Automático | 🔴 CRÍTICA | 1-2h | ⏳ Pendente |
| **1** | Database - Campos Faltantes | 🔴 ALTA | 2-3h | ⏳ Pendente |
| **2** | Machine Learning e Feedback | 🟡 ALTA | 4-5h | ⏳ Pendente |
| **3** | UX - Ícone Animado | 🟡 MÉDIA | 2-3h | ⏳ Pendente |
| **4** | Notificações e Polimento | 🟢 BAIXA | 2-3h | ⏳ Pendente |
| **5** | Testes e Validação | 🟢 BAIXA | 2-3h | ⏳ Pendente |

**TOTAL ESTIMADO**: 13-19 horas

---

## 🚨 FASE 0 - VALIDAÇÃO DO TRIGGER AUTOMÁTICO (1-2h)

### ⚠️ DESCOBERTA IMPORTANTE
O código em `edi-importar-xml/index.ts` JÁ TEM o trigger automático implementado (linhas 221-237)!

### Objetivos
- ✅ Validar se o trigger está funcionando
- ✅ Testar se a função `analisar-cotacao-completa` existe e funciona
- ✅ Verificar se os eventos Realtime estão sendo emitidos

### Tarefas

#### 0.1 Verificar Função `analisar-cotacao-completa`
- [ ] Ler código da função `supabase/functions/analisar-cotacao-completa/index.ts`
- [ ] Verificar se existe ou se precisa criar
- [ ] Se existir, validar se está completa conforme especificação

#### 0.2 Testar Trigger Automático
- [ ] Importar XML de teste via interface
- [ ] Verificar logs da edge function `edi-importar-xml`
- [ ] Confirmar se `analisar-cotacao-completa` foi invocada
- [ ] Verificar se status mudou para 'analisando'
- [ ] Validar se moveu para aba "Análise IA"

#### 0.3 Ajustar se Necessário
- [ ] Se função não existe, criar `analisar-cotacao-completa`
- [ ] Se trigger falha, corrigir lógica de invocação
- [ ] Adicionar melhor tratamento de erros

### Critérios de Conclusão
- ✅ Função `analisar-cotacao-completa` existe e funciona
- ✅ Trigger automático dispara após import
- ✅ Status atualiza corretamente
- ✅ Sem erros nos logs

### Arquivos Envolvidos
- `supabase/functions/analisar-cotacao-completa/index.ts` (verificar/criar)
- `supabase/functions/edi-importar-xml/index.ts` (validar)

---

## 📊 FASE 1 - DATABASE - CAMPOS FALTANTES (2-3h)

### Objetivos
- ✅ Adicionar todos os campos faltantes nas tabelas
- ✅ Criar índices para performance
- ✅ Criar funções SQL de aprendizado

### Tarefas

#### 1.1 Campos em `edi_cotacoes`
```sql
ALTER TABLE edi_cotacoes 
ADD COLUMN IF NOT EXISTS itens_analisados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_itens_para_analise INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS analise_ia_iniciada_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analise_ia_concluida_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS erro_analise_ia TEXT,
ADD COLUMN IF NOT EXISTS tempo_analise_segundos INTEGER;
```

**Campos já existentes** (não recriar):
- ✅ `status_analise_ia`
- ✅ `progresso_analise_percent`

#### 1.2 Campos em `edi_cotacoes_itens`
```sql
ALTER TABLE edi_cotacoes_itens 
ADD COLUMN IF NOT EXISTS analisado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS produto_aceito_ia_id UUID REFERENCES produtos(id),
ADD COLUMN IF NOT EXISTS feedback_vendedor VARCHAR(50),
ADD COLUMN IF NOT EXISTS feedback_vendedor_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tempo_analise_segundos INTEGER;
```

**Campos já existentes** (não recriar):
- ✅ `analisado_por_ia`
- ✅ `score_confianca_ia`
- ✅ `produtos_sugeridos_ia`

#### 1.3 Criar Índices Faltantes
```sql
-- Verificar se já existem antes de criar
CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_analisado 
ON edi_cotacoes_itens(analisado_por_ia);

CREATE INDEX IF NOT EXISTS idx_edi_cotacoes_itens_score 
ON edi_cotacoes_itens(score_confianca_ia DESC);

CREATE INDEX IF NOT EXISTS idx_edi_produtos_sugeridos_gin 
ON edi_cotacoes_itens USING gin(produtos_sugeridos_ia);
```

#### 1.4 Criar Funções SQL de Feedback/Aprendizado

**Função 1: Registrar Feedback**
```sql
CREATE OR REPLACE FUNCTION registrar_feedback_ia(
  p_item_id UUID,
  p_produto_sugerido_id UUID,
  p_produto_escolhido_id UUID,
  p_feedback_tipo VARCHAR,  -- 'aceito', 'rejeitado', 'modificado'
  p_score_ia NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Registrar no histórico
  INSERT INTO ia_feedback_historico (
    item_id,
    produto_sugerido_id,
    produto_escolhido_id,
    feedback_tipo,
    score_original,
    criado_por
  ) VALUES (
    p_item_id,
    p_produto_sugerido_id,
    p_produto_escolhido_id,
    p_feedback_tipo,
    p_score_ia,
    auth.uid()
  );

  -- Atualizar item com feedback
  UPDATE edi_cotacoes_itens 
  SET 
    feedback_vendedor = p_feedback_tipo,
    feedback_vendedor_em = NOW(),
    produto_aceito_ia_id = CASE 
      WHEN p_feedback_tipo = 'aceito' THEN p_produto_sugerido_id 
      ELSE NULL 
    END
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Função 2: Ajustar Score com Aprendizado**
```sql
CREATE OR REPLACE FUNCTION ajustar_score_aprendizado(
  p_produto_id UUID,
  p_feedback_tipo VARCHAR,
  p_score_original NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_ajuste NUMERIC;
  v_motivo TEXT;
BEGIN
  -- Calcular ajuste baseado no feedback
  CASE p_feedback_tipo
    WHEN 'aceito' THEN
      v_ajuste := 5;  -- Aumentar score em 5 pontos
      v_motivo := 'Sugestão aceita pelo vendedor';
    WHEN 'rejeitado' THEN
      v_ajuste := -10;  -- Diminuir score em 10 pontos
      v_motivo := 'Sugestão rejeitada pelo vendedor';
    WHEN 'modificado' THEN
      v_ajuste := -3;  -- Pequena penalidade
      v_motivo := 'Sugestão aceita com modificações';
    ELSE
      v_ajuste := 0;
      v_motivo := 'Sem ajuste';
  END CASE;

  -- Salvar ajuste na tabela de ajustes
  INSERT INTO ia_score_ajustes (
    produto_id,
    motivo_ajuste,
    ajuste_score,
    feedback_origem,
    score_anterior,
    ativo
  ) VALUES (
    p_produto_id,
    v_motivo,
    v_ajuste,
    p_feedback_tipo,
    p_score_original,
    true
  );

  RAISE NOTICE 'Score ajustado: produto_id=%, ajuste=%, motivo=%', 
    p_produto_id, v_ajuste, v_motivo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Critérios de Conclusão
- ✅ Todos os campos criados sem erros
- ✅ Índices criados e funcionando
- ✅ Funções SQL testadas e operacionais
- ✅ Migration aplicada com sucesso

### Arquivos Envolvidos
- Nova migration SQL (via `supabase--migration` tool)

---

## 🧠 FASE 2 - MACHINE LEARNING E FEEDBACK (4-5h)

### Objetivos
- ✅ Integrar hooks de feedback com funções SQL
- ✅ Implementar sistema de aprendizado contínuo
- ✅ Atualizar edge function para usar novo sistema

### Tarefas

#### 2.1 Atualizar `useIAFeedback.tsx`
- [ ] Integrar chamada à função SQL `registrar_feedback_ia()`
- [ ] Adicionar chamada à `ajustar_score_aprendizado()`
- [ ] Implementar tratamento de erros robusto
- [ ] Adicionar logging para auditoria

```typescript
const enviarFeedback = async (feedback: FeedbackIA) => {
  setIsSubmitting(true);
  try {
    // 1. Registrar feedback na função SQL
    const { error: feedbackError } = await supabase.rpc(
      'registrar_feedback_ia',
      {
        p_item_id: feedback.item_id,
        p_produto_sugerido_id: feedback.produto_sugerido_id,
        p_produto_escolhido_id: feedback.produto_escolhido_id,
        p_feedback_tipo: feedback.feedback_tipo,
        p_score_ia: feedback.score_original
      }
    );

    if (feedbackError) throw feedbackError;

    // 2. Ajustar score para aprendizado
    if (feedback.produto_sugerido_id) {
      await supabase.rpc('ajustar_score_aprendizado', {
        p_produto_id: feedback.produto_sugerido_id,
        p_feedback_tipo: feedback.feedback_tipo,
        p_score_original: feedback.score_original
      });
    }

    toast.success('Feedback registrado com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar feedback:', error);
    toast.error('Erro ao registrar feedback');
    return { success: false, error };
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 2.2 Atualizar `edi-sugerir-produtos`
- [ ] Buscar ajustes de score da tabela `ia_score_ajustes`
- [ ] Aplicar ajustes no cálculo final do score
- [ ] Considerar histórico de feedback na ordenação

```typescript
// Buscar ajustes de score históricos
const { data: ajustes } = await supabase
  .from('ia_score_ajustes')
  .select('produto_id, ajuste_score')
  .eq('ativo', true)
  .in('produto_id', candidatos.map(c => c.id));

// Aplicar ajustes nos scores
candidatos.forEach(candidato => {
  const ajuste = ajustes?.find(a => a.produto_id === candidato.id);
  if (ajuste) {
    candidato.score_match += ajuste.ajuste_score;
    candidato.score_match = Math.min(100, Math.max(0, candidato.score_match));
  }
});
```

#### 2.3 Criar Hook `useIALearning`
- [ ] Criar novo hook para centralizar lógica de aprendizado
- [ ] Implementar métricas de performance da IA
- [ ] Adicionar dashboard de efetividade

#### 2.4 Atualizar Componentes de Sugestão
- [ ] Adicionar botões de feedback no `SugestoesIADialog`
- [ ] Capturar ações do vendedor (aceitar/rejeitar)
- [ ] Enviar feedback automaticamente ao vincular produto

### Critérios de Conclusão
- ✅ Feedback é registrado corretamente no banco
- ✅ Scores são ajustados automaticamente
- ✅ Sugestões futuras melhoram com o tempo
- ✅ Dashboard mostra taxa de aceitação

### Arquivos Envolvidos
- `src/hooks/useIAFeedback.tsx` (atualizar)
- `src/hooks/useIALearning.tsx` (criar)
- `supabase/functions/edi-sugerir-produtos/index.ts` (atualizar)
- `src/components/plataformas/SugestoesIADialog.tsx` (atualizar)

---

## 🎨 FASE 3 - UX - ÍCONE ANIMADO (2-3h)

### Objetivos
- ✅ Criar indicador visual de sugestões IA nos itens
- ✅ Implementar animação pulsante
- ✅ Mostrar badge com contador de sugestões
- ✅ Código de cores por nível de confiança

### Tarefas

#### 3.1 Criar Componente `ItemSugestaoIAIcon`

**Arquivo**: `src/components/plataformas/ItemSugestaoIAIcon.tsx`

```typescript
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ItemSugestaoIAIconProps {
  scoreConfianca?: number;
  totalSugestoes: number;
  onClick: () => void;
  className?: string;
}

export const ItemSugestaoIAIcon = ({
  scoreConfianca = 0,
  totalSugestoes,
  onClick,
  className
}: ItemSugestaoIAIconProps) => {
  // Determinar cor baseada no score
  const getColorClass = () => {
    if (scoreConfianca >= 90) return "text-success";
    if (scoreConfianca >= 70) return "text-warning";
    return "text-muted-foreground";
  };

  const shouldAnimate = scoreConfianca >= 70;

  return (
    <div 
      className={cn(
        "relative cursor-pointer group",
        className
      )}
      onClick={onClick}
    >
      <Sparkles 
        className={cn(
          "h-5 w-5 transition-all",
          getColorClass(),
          shouldAnimate && "animate-pulse group-hover:scale-110"
        )}
      />
      {totalSugestoes > 0 && (
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-xs"
        >
          {totalSugestoes}
        </Badge>
      )}
    </div>
  );
};
```

#### 3.2 Adicionar Coluna "IA" no Grid de Itens

**Arquivo**: `src/components/plataformas/ItemCotacaoTable.tsx`

```typescript
// Adicionar nova coluna
{
  accessorKey: "sugestoes_ia",
  header: "IA",
  cell: ({ row }) => {
    const item = row.original;
    const sugestoes = item.produtos_sugeridos_ia || [];
    const scoreConfianca = item.score_confianca_ia;
    
    if (!item.analisado_por_ia || sugestoes.length === 0) {
      return <span className="text-muted-foreground text-xs">-</span>;
    }

    return (
      <ItemSugestaoIAIcon
        scoreConfianca={scoreConfianca}
        totalSugestoes={sugestoes.length}
        onClick={() => handleAbrirSugestoes(item.id)}
      />
    );
  }
}
```

#### 3.3 Melhorar `StatusAnaliseIABadge`
- [ ] Adicionar mais estados visuais
- [ ] Melhorar animações
- [ ] Adicionar tooltip com detalhes

### Critérios de Conclusão
- ✅ Ícone ✨ aparece em itens com sugestões
- ✅ Cores corretas: verde (≥90), amarelo (70-89), cinza (<70)
- ✅ Animação pulsante funciona
- ✅ Badge com contador visível
- ✅ Click abre modal de sugestões

### Arquivos Envolvidos
- `src/components/plataformas/ItemSugestaoIAIcon.tsx` (criar)
- `src/components/plataformas/ItemCotacaoTable.tsx` (atualizar)
- `src/components/plataformas/StatusAnaliseIABadge.tsx` (melhorar)

---

## 🔔 FASE 4 - NOTIFICAÇÕES E POLIMENTO (2-3h)

### Objetivos
- ✅ Implementar notificações faltantes
- ✅ Adicionar badges visuais
- ✅ Melhorar feedback do usuário

### Tarefas

#### 4.1 Notificações Realtime
```typescript
// No useIAAnalysis.tsx - adicionar mais notificações

// A cada 10% de progresso
if (progress && progress.progresso % 10 === 0) {
  toast.info(
    `Análise ${progress.progresso}% concluída (${progress.itensAnalisados}/${progress.totalItens})`,
    { duration: 2000 }
  );
}

// Quando encontra match alto
if (payload.scoreConfianca >= 95) {
  toast.success(
    `🎯 Match perfeito encontrado! (${payload.scoreConfianca}%)`,
    { duration: 3000 }
  );
}
```

#### 4.2 Badge "NOVO" para Cotações Não Visualizadas
```typescript
// Em CotacoesGrid.tsx
{item.nao_visualizada && (
  <Badge 
    variant="destructive" 
    className="animate-pulse ml-2"
  >
    NOVO
  </Badge>
)}
```

#### 4.3 Tooltips Informativos
- [ ] Adicionar tooltips nos badges de status
- [ ] Explicar scores de confiança
- [ ] Dicas de como melhorar sugestões

### Critérios de Conclusão
- ✅ Notificações aparecem em momentos-chave
- ✅ Badge "NOVO" funciona corretamente
- ✅ Tooltips são informativos
- ✅ UX é fluida e responsiva

### Arquivos Envolvidos
- `src/hooks/useIAAnalysis.tsx` (atualizar)
- `src/components/plataformas/ItemCotacaoTable.tsx` (atualizar)
- `src/pages/plataformas/Cotacoes.tsx` (atualizar)

---

## 🧪 FASE 5 - TESTES E VALIDAÇÃO (2-3h)

### Objetivos
- ✅ Testar fluxo completo end-to-end
- ✅ Validar sistema de aprendizado
- ✅ Corrigir bugs encontrados
- ✅ Otimizar performance

### Tarefas

#### 5.1 Testes End-to-End

**Cenário 1: Import até Resposta**
1. [ ] Importar XML com 10+ itens
2. [ ] Verificar trigger automático
3. [ ] Acompanhar análise em tempo real
4. [ ] Validar sugestões geradas
5. [ ] Aceitar/Rejeitar sugestões
6. [ ] Verificar feedback registrado
7. [ ] Confirmar aprendizado aplicado

**Cenário 2: Match Perfeito**
1. [ ] Criar vínculo DE-PARA manual
2. [ ] Importar cotação com mesmo produto
3. [ ] Verificar se IA dá score 100
4. [ ] Confirmar sugestão automática

**Cenário 3: Produto Novo**
1. [ ] Importar produto nunca visto
2. [ ] Verificar sugestões alternativas
3. [ ] Rejeitar todas sugestões
4. [ ] Criar produto novo
5. [ ] Confirmar vínculo criado

#### 5.2 Validar Machine Learning

```sql
-- Query para verificar aprendizado
SELECT 
  p.codigo_produto,
  p.nome_produto,
  COUNT(fh.id) as total_feedbacks,
  COUNT(*) FILTER (WHERE fh.feedback_tipo = 'aceito') as aceitos,
  COUNT(*) FILTER (WHERE fh.feedback_tipo = 'rejeitado') as rejeitados,
  AVG(sa.ajuste_score) as ajuste_medio
FROM produtos p
LEFT JOIN ia_feedback_historico fh ON fh.produto_sugerido_id = p.id
LEFT JOIN ia_score_ajustes sa ON sa.produto_id = p.id AND sa.ativo = true
GROUP BY p.id
HAVING COUNT(fh.id) > 0
ORDER BY total_feedbacks DESC
LIMIT 20;
```

#### 5.3 Performance e Otimização
- [ ] Testar com cotação grande (100+ itens)
- [ ] Verificar tempo de resposta
- [ ] Otimizar queries lentas
- [ ] Adicionar caching onde necessário

#### 5.4 Checklist Final
- [ ] Trigger automático funciona 100%
- [ ] Todas as abas movem corretamente
- [ ] Badges e ícones aparecem
- [ ] Sugestões são precisas
- [ ] Feedback é registrado
- [ ] IA aprende com feedbacks
- [ ] Dashboard mostra métricas corretas
- [ ] Sem erros nos logs
- [ ] Performance aceitável (<30s para 50 itens)

### Critérios de Conclusão
- ✅ Todos os cenários de teste passam
- ✅ Machine learning funcionando
- ✅ Performance dentro do esperado
- ✅ Zero erros críticos
- ✅ UX fluida e intuitiva

---

## 📊 MÉTRICAS DE SUCESSO

Ao final de todas as fases, o sistema deve atingir:

| Métrica | Meta | Como Medir |
|---------|------|------------|
| **Automação** | 100% | Trigger dispara sem intervenção manual |
| **Taxa de Análise** | >95% | Itens analisados / Total de itens |
| **Taxa de Sugestão** | >90% | Itens com sugestão / Itens analisados |
| **Acurácia IA** | >80% | Sugestões aceitas / Total sugestões |
| **Tempo Médio** | <30s | Tempo para analisar 50 itens |
| **Aprendizado** | Funcional | Scores melhoram após feedbacks |

---

## 🎯 PRÓXIMOS PASSOS SUGERIDOS

Após completar todas as fases:

1. **Monitoramento Contínuo**
   - Criar dashboard de métricas em tempo real
   - Alertas para erros recorrentes
   - Relatório semanal de performance

2. **Melhorias Futuras**
   - Suporte para mais plataformas EDI
   - Integração com ERPs externos
   - IA multimodal (análise de imagens)
   - Sistema de recomendação de preços

3. **Documentação**
   - Manual do vendedor
   - Guia de troubleshooting
   - Documentação técnica da IA

---

## 📝 NOTAS IMPORTANTES

### ⚠️ Atenção Especial

1. **Trigger Automático (Fase 0)**
   - O código já existe em `edi-importar-xml`
   - Precisa APENAS validar se está funcionando
   - Não reescrever se estiver OK!

2. **Machine Learning (Fase 2)**
   - Coração do sistema de aprendizado
   - Testar exaustivamente
   - Validar com dados reais

3. **Performance**
   - Sistema deve escalar para 100+ itens
   - Considerar processamento paralelo
   - Cache de sugestões recorrentes

### 🔄 Ordem de Execução

**CRÍTICO**: Seguir ordem exata das fases!
- Fase 0 é pré-requisito para todas
- Fase 1 deve vir antes da Fase 2
- Fase 3 e 4 podem ser paralelas
- Fase 5 sempre por último

---

## ✅ CONCLUSÃO

Este plano faseado garante:
- ✅ Implementação incremental e testável
- ✅ Priorização correta de features
- ✅ Validação contínua de cada etapa
- ✅ Caminho claro para 100% de completude

**Tempo Total Estimado**: 13-19 horas  
**Taxa de Completude Atual**: 65%  
**Taxa de Completude Pós-Plano**: 100%

---

**Preparado para execução**: ✅  
**Última atualização**: 25/10/2025
