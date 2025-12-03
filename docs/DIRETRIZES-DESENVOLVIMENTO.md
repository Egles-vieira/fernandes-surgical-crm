# 📋 DIRETRIZES DE DESENVOLVIMENTO - SISTEMA CRM B2B

> **Versão:** 2.0 | **Data:** Dezembro 2024  
> **Escala Alvo:** 300 usuários concorrentes  
> **Stack:** React 18, Supabase (Postgres), Deno Edge Functions, DeepSeek AI

---

## 🚨 MANDAMENTOS IMUTÁVEIS (CRITICAL RULES)

**Se violar estas regras, o código será REJEITADO:**

### 1. ZERO Agregações em Tempo Real
```sql
-- ❌ PROIBIDO: COUNT/SUM/AVG em tabelas transacionais na UI
SELECT COUNT(*) FROM vendas WHERE status = 'aprovada';
SELECT SUM(valor_total) FROM vendas_itens WHERE venda_id = $1;

-- ✅ CORRETO: Use Materialized Views
SELECT * FROM mv_dashboard_kpis;
SELECT * FROM mv_vendas_resumo;
```

### 2. Realtime SEMPRE Filtrado
```typescript
// ❌ PROIBIDO: Subscription global
supabase.channel('vendas').on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, callback)

// ✅ CORRETO: Filtro obrigatório por usuário/entidade
supabase.channel(`vendas-${user.id}`).on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'vendas',
  filter: `vendedor_id=eq.${user.id}`
}, callback)
```

### 3. Operações >2s = Fire-and-Forget
```typescript
// ❌ PROIBIDO: Bloquear request HTTP com operação longa
const resultado = await processarPDFComplexo(dados); // Trava 10s+
return new Response(JSON.stringify(resultado));

// ✅ CORRETO: Enfileirar e retornar imediatamente
await supabase.from('jobs_queue').insert({ tipo: 'processar_pdf', payload: dados });
return new Response(JSON.stringify({ status: 'queued', job_id: jobId }));
```

### 4. Validação Defensiva com Zod
```typescript
// ❌ PROIBIDO: Confiar em dados de entrada
const { cliente_id, valor } = req.body;

// ✅ CORRETO: Validar TUDO antes de processar
const schema = z.object({
  cliente_id: z.string().uuid(),
  valor: z.number().positive(),
});
const dados = schema.parse(await req.json());
```

### 5. RLS Policies Otimizadas
```sql
-- ❌ PROIBIDO: Subqueries pesadas ou funções complexas
CREATE POLICY "vendas_select" ON vendas FOR SELECT
USING (id IN (SELECT venda_id FROM get_vendas_acessiveis(auth.uid())));

-- ✅ CORRETO: Consulta direta sem funções
CREATE POLICY "vendas_select_otimizado" ON vendas FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  OR vendedor_id = auth.uid()
  OR responsavel_id = auth.uid()
);
```

---

## 🗄️ PADRÕES DE BANCO DE DADOS

### Conexão em Edge Functions
```typescript
// ❌ PROIBIDO: Conexão direta porta 5432
import postgres from 'postgres';
const sql = postgres('postgresql://...?port=5432');

// ✅ CORRETO: Supavisor Transaction Mode porta 6543
const sql = postgres(Deno.env.get('DATABASE_URL')!, {
  port: 6543,
  prepare: false, // Obrigatório para Transaction Mode
});
```

### Índices Obrigatórios
```sql
-- Todo FK deve ter índice
CREATE INDEX idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX idx_vendas_itens_venda_id ON vendas_itens(venda_id);
CREATE INDEX idx_vendas_itens_produto_id ON vendas_itens(produto_id);

-- Colunas de filtro frequente
CREATE INDEX idx_vendas_status ON vendas(status);
CREATE INDEX idx_vendas_etapa_pipeline ON vendas(etapa_pipeline);
CREATE INDEX idx_vendas_created_at ON vendas(created_at DESC);

-- JSONB usa GIN
CREATE INDEX idx_conversas_carrinho ON whatsapp_conversas USING GIN(produtos_carrinho);
```

### Triggers Leves
```sql
-- ❌ PROIBIDO: HTTP dentro de trigger
CREATE TRIGGER notificar_venda AFTER INSERT ON vendas
FOR EACH ROW EXECUTE FUNCTION http_post('https://api.externa.com/webhook');

-- ✅ CORRETO: Apenas operações leves
CREATE TRIGGER set_updated_at BEFORE UPDATE ON vendas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Para notificações: use fila
CREATE TRIGGER enqueue_notificacao AFTER INSERT ON vendas
FOR EACH ROW EXECUTE FUNCTION enqueue_job('notificar_venda', NEW.id);
```

---

## 🔐 PADRÕES DE RLS (Row Level Security)

### Estrutura Padrão de Policy
```sql
-- TEMPLATE: Policy otimizada para performance
CREATE POLICY "{tabela}_select_otimizado" ON public.{tabela}
FOR SELECT USING (
  -- 1. Admins/Managers: acesso via role direto (mais rápido)
  (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = ANY(ARRAY['admin'::app_role, 'manager'::app_role])
  ))
  OR
  -- 2. Proprietário direto
  (user_id = auth.uid() OR vendedor_id = auth.uid())
  OR
  -- 3. Membro de equipe (se aplicável)
  (equipe_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM membros_equipe me
    WHERE me.equipe_id = {tabela}.equipe_id
    AND me.usuario_id = auth.uid()
    AND me.esta_ativo = true
  ))
);
```

### Regras de Ouro para RLS
1. **Máximo 1 JOIN** por policy
2. **NUNCA** chamar funções que fazem queries (ex: `get_vendas_acessiveis()`)
3. **Preferir** verificação direta de colunas (`vendedor_id = auth.uid()`)
4. **Usar** `EXISTS` ao invés de `IN` para subqueries
5. **Indexar** todas as colunas usadas em policies

---

## ⚡ PADRÕES DE FRONTEND (React/TanStack Query)

### Estrutura de Hooks para Dados
```typescript
// PADRÃO: Hook com paginação server-side
export function useEntidadePaginado(options: Options = {}) {
  const { pagina = 1, porPagina = 20, filtros = {} } = options;
  
  return useQuery({
    queryKey: ['entidade', 'paginado', pagina, porPagina, filtros],
    queryFn: async () => {
      const from = (pagina - 1) * porPagina;
      const to = from + porPagina - 1;
      
      let query = supabase
        .from('entidade')
        .select('*', { count: 'exact' })
        .range(from, to);
      
      // Aplicar filtros dinamicamente
      if (filtros.status) query = query.eq('status', filtros.status);
      
      const { data, count, error } = await query;
      if (error) throw error;
      
      return {
        dados: data,
        total: count,
        totalPaginas: Math.ceil((count || 0) / porPagina),
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10,   // 10 minutos
  });
}
```

### Mutations com Debounce para Edições Rápidas
```typescript
// PADRÃO: Evitar N requests simultâneos
const pendingUpdates = useRef<Map<string, UpdateData>>(new Map());
const debounceTimer = useRef<NodeJS.Timeout>();

const handleFieldChange = (itemId: string, field: string, value: any) => {
  // Acumular mudanças
  const current = pendingUpdates.current.get(itemId) || {};
  pendingUpdates.current.set(itemId, { ...current, [field]: value });
  
  // Debounce de 500ms
  clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    flushUpdates();
  }, 500);
};

const flushUpdates = async () => {
  const updates = Array.from(pendingUpdates.current.entries());
  pendingUpdates.current.clear();
  
  // Batch update
  await Promise.all(updates.map(([id, data]) => 
    updateMutation.mutateAsync({ id, ...data })
  ));
};
```

### Cache e Invalidação
```typescript
// PADRÃO: Invalidação granular
const queryClient = useQueryClient();

// Após criar venda
queryClient.invalidateQueries({ queryKey: ['vendas', 'paginado'] });
queryClient.invalidateQueries({ queryKey: ['mv_dashboard_kpis'] });

// Após atualizar item de venda específico
queryClient.invalidateQueries({ queryKey: ['venda-detalhes', vendaId] });
// NÃO invalida lista paginada (não afeta)
```

---

## 🤖 PADRÕES DE IA (DeepSeek)

### Chamadas de IA
```typescript
// PADRÃO: Sempre via Edge Function, nunca no client
// Arquivo: supabase/functions/minha-funcao-ia/index.ts

const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  }),
});
```

### Retry com Exponential Backoff
```typescript
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### RAG Inteligente
```typescript
// ❌ PROIBIDO: Injetar banco inteiro no prompt
const todosProdutos = await supabase.from('produtos').select('*');

// ✅ CORRETO: Buscar apenas Top 5-10 relevantes
const { data: produtosRelevantes } = await supabase
  .rpc('match_produtos_hibrido', {
    query_text: termoBusca,
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 10,
  });
```

---

## 📊 PADRÕES DE DASHBOARD

### Materialized Views Obrigatórias
```sql
-- Toda agregação de dashboard DEVE usar MV
CREATE MATERIALIZED VIEW mv_vendas_resumo AS
SELECT 
  COUNT(*) as total_vendas,
  SUM(valor_total) as valor_total,
  COUNT(*) FILTER (WHERE status = 'aprovada') as aprovadas
FROM vendas
WHERE created_at >= NOW() - INTERVAL '90 days';

-- Índice para refresh concorrente
CREATE UNIQUE INDEX idx_mv_vendas_resumo ON mv_vendas_resumo(total_vendas);

-- Refresh via pg_cron (cada 5 min)
SELECT cron.schedule('refresh-mv-vendas', '*/5 * * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_resumo');
```

### Hook de Dashboard
```typescript
export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['mv_dashboard_kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_dashboard_kpis')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Igual ao refresh da MV
  });
}
```

---

## 🔄 PADRÕES DE REALTIME

### Subscription Correta
```typescript
export function useRealtimeEntidade(entidadeId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`entidade-${entidadeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entidade',
          filter: `id=eq.${entidadeId}`, // SEMPRE filtrar!
        },
        (payload) => {
          queryClient.invalidateQueries({ 
            queryKey: ['entidade', entidadeId] 
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [entidadeId, queryClient]);
}
```

---

## 📁 ESTRUTURA DE ARQUIVOS

```
src/
├── components/
│   ├── ui/              # Componentes Shadcn (não modificar diretamente)
│   ├── {modulo}/        # Componentes específicos do módulo
│   └── shared/          # Componentes reutilizáveis
├── hooks/
│   ├── use{Entidade}.tsx           # CRUD básico
│   ├── use{Entidade}Paginado.tsx   # Lista com paginação
│   ├── use{Entidade}Detalhes.tsx   # Detalhes com lazy loading
│   └── useRealtime{Entidade}.tsx   # Subscriptions
├── pages/
│   └── {modulo}/
│       ├── Index.tsx    # Lista/Dashboard
│       └── Detalhes.tsx # Detalhe/Edição
└── lib/
    ├── validations/     # Schemas Zod
    └── utils.ts         # Utilitários

supabase/
├── functions/
│   ├── {funcao}/
│   │   └── index.ts
│   └── _shared/         # Código compartilhado entre funções
└── migrations/          # Alterações de schema (auto-gerenciado)
```

---

## ✅ DEFINITION OF DONE (Checklist)

Antes de submeter código, verificar:

- [ ] **Performance:** O código suporta 300 usuários simultâneos?
- [ ] **Background:** Operações pesadas estão em jobs_queue?
- [ ] **Error Handling:** Existe tratamento de erro e timeout para APIs externas?
- [ ] **Realtime:** Subscriptions estão filtradas por usuário/entidade?
- [ ] **RLS:** Novas tabelas têm policies otimizadas (sem subqueries)?
- [ ] **Índices:** Novas colunas de filtro têm índices?
- [ ] **Validação:** Inputs validados com Zod?
- [ ] **Cache:** Queries usam staleTime apropriado?
- [ ] **Paginação:** Listas >50 itens usam paginação server-side?

---

## 🚫 ANTI-PATTERNS (O que NÃO fazer)

| Anti-Pattern | Problema | Solução |
|--------------|----------|---------|
| `SELECT * FROM vendas` sem filtro | Carrega milhares de registros | Usar paginação + filtros |
| `COUNT(*)` em componente | Bloqueia render, sobrecarrega DB | Usar Materialized View |
| RLS com `get_vendas_acessiveis()` | Função executa N subqueries por row | Consulta direta em policy |
| Realtime sem filtro | Todos recebem todos eventos | Filtrar por user_id/entity_id |
| Edge Function chama Edge Function | Timeout em cascata | Retornar JSON, caller envia resposta |
| Trigger com HTTP call | Lock de tabela durante request | Enfileirar job |
| N mutations simultâneas | Estoura connection pool | Debounce + batch update |

---

## 📞 CONTATO E SUPORTE

Para dúvidas sobre estas diretrizes ou exceções necessárias, documentar no PR e solicitar review de arquitetura.

---

*Última atualização: Dezembro 2024*
*Mantido por: Equipe de Arquitetura*
