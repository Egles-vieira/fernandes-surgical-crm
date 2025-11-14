# Documentação Técnica - Sistema de Gestão Comercial

## 1. VISÃO GERAL DO PROJETO

### Nome do Projeto
**Sistema de Gestão Comercial Integrado**

### Descrição
Sistema completo de gestão comercial B2B que integra vendas, CRM, cotações EDI, WhatsApp Business, atendimento via tickets, URAs, licitações e gestão de equipes com metas e KPIs.

### Objetivo e Propósito
- Centralizar operações comerciais em uma única plataforma
- Automatizar processos de vendas e atendimento
- Integrar comunicação via WhatsApp Business
- Analisar cotações com IA
- Gerenciar equipes comerciais e metas
- Facilitar participação em licitações
- Prover atendimento ao cliente estruturado

### Principais Funcionalidades
1. **Gestão de Vendas e Oportunidades**: Pipeline Kanban, propostas, pedidos, contratos
2. **CRM de Clientes**: Cadastro, histórico, contatos, oportunidades, produtos comprados
3. **EDI e Plataformas**: Importação de cotações XML, análise IA, vinculação de produtos, integração Mercado Livre
4. **WhatsApp Business**: Chat integrado, múltiplas contas, templates, respostas rápidas, URAs
5. **Sistema de Tickets**: SAC completo com SLA, priorização, atribuição, histórico
6. **Licitações**: Consulta CNPJA, participação, contratos governamentais
7. **Gestão de Equipes**: Hierarquia, metas individuais/coletivas, KPIs, performance
8. **Produtos e Estoque**: Cadastro, importação, vinculação com plataformas
9. **Usuários e Permissões**: Sistema de roles (admin, vendedor, líder, etc.)
10. **Dashboards e Relatórios**: Análises de vendas, IA, WhatsApp, tickets

### Tecnologias Utilizadas

#### Frontend
- **React 18.3.1**: Biblioteca principal
- **TypeScript 5.8.3**: Tipagem estática
- **Vite 5.4.19**: Build tool
- **React Router DOM 6.30.1**: Roteamento
- **TailwindCSS 3.4.17**: Estilização
- **Shadcn/ui**: Componentes UI (Radix UI)
- **Lucide React 0.462.0**: Ícones
- **React Hook Form 7.61.1**: Formulários
- **Zod 3.25.76**: Validação de schemas
- **TanStack Query 5.83.0**: Gerenciamento de estado servidor
- **date-fns 4.1.0**: Manipulação de datas
- **Recharts 2.15.4**: Gráficos
- **Sonner 1.7.4**: Notificações toast
- **XLSX 0.18.5**: Exportação Excel
- **PapaParse 5.4.1**: Parse CSV

#### Backend
- **Supabase**: Backend as a Service
  - PostgreSQL: Banco de dados
  - Auth: Autenticação
  - Realtime: Atualizações em tempo real
  - Storage: Armazenamento de arquivos
  - Edge Functions: Serverless functions

#### Integrações
- **CNPJA API**: Consulta de CNPJs
- **Gupshup**: WhatsApp Business oficial
- **W-API**: WhatsApp não oficial
- **Zenvia**: URAs e ligações
- **IA (Gemini/GPT)**: Análise de cotações e assistente

### Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │Components│  │  Hooks   │  │   Lib    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ REST API / Realtime
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │   Auth   │  │ Realtime │  │  Storage │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Edge Functions (Serverless)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ APIs Externas
┌─────────────────────────────────────────────────────────────┐
│  CNPJA │ Gupshup │ W-API │ Zenvia │ IA (Gemini/GPT)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. ESTRUTURA DE PASTAS E ARQUIVOS

```
projeto/
├── public/                      # Arquivos públicos estáticos
│   ├── favicon.png
│   └── robots.txt
├── src/
│   ├── assets/                  # Imagens, logos, ícones
│   │   ├── favicon-cfernandes.png
│   │   ├── logo-cfernandes.webp
│   │   └── logo-convertiai.png
│   ├── components/              # Componentes React reutilizáveis
│   │   ├── ui/                  # Componentes base (Shadcn)
│   │   ├── cliente/             # Componentes específicos de clientes
│   │   ├── cnpja/               # Componentes CNPJA
│   │   ├── configuracoes/       # Configurações do sistema
│   │   ├── equipes/             # Gestão de equipes
│   │   ├── plataformas/         # EDI e plataformas
│   │   ├── solicitacoes/        # Solicitações de cadastro
│   │   ├── tickets/             # Sistema de tickets
│   │   ├── ura/                 # URAs
│   │   ├── usuario/             # Gestão de usuários
│   │   ├── vendas/              # Vendas e oportunidades
│   │   ├── vendedor/            # Perfil de vendedor
│   │   ├── whatsapp/            # WhatsApp Business
│   │   ├── Layout.tsx           # Layout principal
│   │   ├── Header.tsx           # Cabeçalho
│   │   └── ProtectedRoute.tsx   # Proteção de rotas
│   ├── contexts/                # Contexts do React
│   │   └── EquipesFiltrosContext.tsx
│   ├── hooks/                   # Custom hooks
│   │   ├── useAuth.tsx          # Autenticação
│   │   ├── useRoles.tsx         # Permissões
│   │   ├── useClientes.tsx      # Clientes
│   │   ├── useVendas.tsx        # Vendas
│   │   ├── useEquipes.tsx       # Equipes
│   │   ├── useWhatsApp.tsx      # WhatsApp
│   │   └── ... (43 hooks no total)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts        # Cliente Supabase
│   │       └── types.ts         # Tipos gerados
│   ├── lib/                     # Utilitários
│   │   ├── utils.ts             # Funções auxiliares
│   │   ├── cnpja-utils.ts       # Utilitários CNPJA
│   │   ├── ura-utils.ts         # Utilitários URA
│   │   ├── whatsappAdapter.ts   # Adapter WhatsApp
│   │   └── validations/         # Schemas de validação
│   ├── pages/                   # Páginas da aplicação
│   │   ├── vendas/              # Páginas de vendas
│   │   ├── plataformas/         # Páginas de plataformas
│   │   ├── licitacoes/          # Páginas de licitações
│   │   ├── whatsapp/            # Páginas WhatsApp
│   │   ├── Dashboard.tsx
│   │   ├── Vendas.tsx
│   │   ├── Clientes.tsx
│   │   └── ... (32 páginas)
│   ├── types/                   # Definições de tipos
│   │   ├── cnpja.ts
│   │   └── ia-analysis.ts
│   ├── App.tsx                  # Componente principal
│   ├── main.tsx                 # Entry point
│   └── index.css                # Estilos globais (Design System)
├── supabase/
│   ├── functions/               # Edge Functions (33 funções)
│   │   ├── _shared/             # Código compartilhado
│   │   ├── analisar-cotacao-completa/
│   │   ├── chat-assistente-ticket/
│   │   ├── cnpja-consultar-office/
│   │   ├── gupshup-webhook/
│   │   ├── w-api-enviar-mensagem/
│   │   └── ... (mais funções)
│   ├── migrations/              # 141 migrations do banco
│   └── config.toml              # Configuração Supabase
├── database-dump.sql            # Dump completo do banco
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### Convenções de Nomenclatura

- **Componentes**: PascalCase (ex: `ClienteSearchDialog.tsx`)
- **Hooks**: camelCase com prefixo `use` (ex: `useClientes.tsx`)
- **Páginas**: PascalCase (ex: `Dashboard.tsx`)
- **Utilitários**: kebab-case (ex: `cnpja-utils.ts`)
- **Tipos**: PascalCase para interfaces/types
- **Variáveis CSS**: kebab-case com `--` (ex: `--primary`)
- **Classes Tailwind**: Tokens semânticos (ex: `bg-primary`, `text-foreground`)

---

## 3. MÓDULOS E COMPONENTES PRINCIPAIS

### 3.1 Autenticação e Segurança

#### `src/hooks/useAuth.tsx`
**Propósito**: Gerenciar autenticação de usuários via Supabase Auth

**Estados**:
- `user: User | null` - Usuário logado
- `session: Session | null` - Sessão ativa
- `loading: boolean` - Estado de carregamento

**Funções**:
- `signOut()` - Logout do usuário

**Uso**:
```typescript
const { user, session, loading, signOut } = useAuth();
```

#### `src/hooks/useRoles.tsx`
**Propósito**: Verificar permissões e roles do usuário

**Roles Disponíveis**:
- `admin` - Administrador
- `vendedor` - Vendedor
- `lider` - Líder de equipe
- `gerente_comercial` - Gerente
- `diretor_comercial` - Diretor
- `backoffice` - Backoffice
- `support` - Suporte
- `manager` - Gerente

**Funções**:
```typescript
const { 
  isAdmin, isVendedor, isLider, 
  hasRole, hasAnyRole, canManageTeam 
} = useRoles();
```

#### `src/components/ProtectedRoute.tsx`
**Propósito**: Proteger rotas que requerem autenticação

**Fluxo**:
1. Verifica se usuário está autenticado
2. Redireciona para `/auth` se não autenticado
3. Mostra splash screen após login
4. Renderiza componente protegido

### 3.2 Layout e Navegação

#### `src/components/Layout.tsx`
**Propósito**: Layout principal com sidebar e header

**Características**:
- Sidebar colapsável
- Menu hierárquico com Collapsible
- Filtros por role (adminOnly)
- Logo e favicon personalizados
- Context para estado do sidebar

**Menu Principal**:
```typescript
const menuItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { 
    icon: ShoppingCart, 
    label: "Vendas",
    children: [
      { path: "/vendas", label: "Propostas" },
      { path: "/vendas/pedidos", label: "Pedidos" },
      { path: "/vendas/contratos", label: "Relatórios" }
    ]
  },
  // ... mais menus
];
```

#### `src/components/Header.tsx`
**Propósito**: Cabeçalho com notificações, perfil e tema

**Componentes**:
- Botão toggle sidebar
- Notificações (sheet lateral)
- Dropdown de perfil
- Toggle dark/light mode
- Avatar do usuário

### 3.3 Gestão de Vendas

#### `src/pages/Vendas.tsx`
**Propósito**: Lista de oportunidades de venda em formato Kanban

**Características**:
- Pipeline Kanban drag & drop (@dnd-kit)
- Filtros (período, vendedor, pipeline, estágio)
- Action bar com ações em massa
- Modal de criação de oportunidade
- Integração com `useVendas` hook

**Estágios do Pipeline**:
1. Prospecção
2. Qualificação
3. Proposta
4. Negociação
5. Fechamento
6. Ganho/Perdido

#### `src/components/vendas/PipelineKanban.tsx`
**Propósito**: Visualização Kanban das vendas

**Props**:
```typescript
interface PipelineKanbanProps {
  vendas: Venda[];
  onUpdateVenda: (id: string, data: any) => void;
  onDeleteVenda: (id: string) => void;
}
```

**Drag & Drop**:
- Usa `@dnd-kit/core` e `@dnd-kit/sortable`
- Move cards entre estágios
- Atualiza automaticamente no backend

#### `src/hooks/useVendas.tsx`
**Propósito**: CRUD e queries de vendas

**Queries**:
- `vendas` - Lista todas as vendas acessíveis
- `isLoading` - Estado de carregamento

**Mutations**:
- `criarVenda` - Criar nova venda
- `atualizarVenda` - Atualizar venda
- `deletarVenda` - Deletar venda
- `aprovarVenda` - Aprovar venda

### 3.4 CRM de Clientes

#### `src/pages/Clientes.tsx`
**Propósito**: Listagem e gestão de clientes

**Funcionalidades**:
- Tabela de clientes com paginação
- Filtros (busca, segmento, vendedor)
- Ações: editar, atribuir vendedor, distribuir
- Importação de clientes
- Histórico de produtos comprados

#### `src/pages/ClienteDetalhes.tsx`
**Propósito**: Página detalhada do cliente

**Abas**:
1. **Informações**: Dados cadastrais, contatos
2. **Oportunidades**: Vendas do cliente
3. **Histórico**: Produtos comprados
4. **WhatsApp**: Chat integrado
5. **Tickets**: Atendimentos

#### `src/components/cliente/WhatsAppChat.tsx`
**Propósito**: Chat WhatsApp integrado na página do cliente

**Características**:
- Lista de conversas do cliente
- Área de mensagens
- Envio de texto, imagem, áudio, documento
- Botões interativos
- Indicador de digitação

### 3.5 Plataformas e EDI

#### `src/pages/plataformas/Cotacoes.tsx`
**Propósito**: Gestão de cotações importadas via EDI

**Workflow**:
1. Importar XML da plataforma
2. Análise IA dos itens
3. Vincular produtos (DE-PARA)
4. Precificar
5. Exportar resposta

#### `src/hooks/useEDICotacoes.tsx`
**Propósito**: Gerenciar cotações EDI

**Queries**:
- `cotacoes` - Lista cotações
- `cotacaoAtual` - Cotação específica
- `itens` - Itens da cotação

**Mutations**:
- `criarCotacao` - Nova cotação
- `atualizarCotacao` - Atualizar cotação
- `importarXML` - Importar arquivo XML

#### `src/components/plataformas/ImportarXMLDialog.tsx`
**Propósito**: Dialog para importação de XML

**Fluxo**:
1. Upload do arquivo XML
2. Parse e validação
3. Criação da cotação
4. Criação dos itens
5. Trigger análise IA (edge function)

#### `src/pages/plataformas/DashboardAnaliseIA.tsx`
**Propósito**: Dashboard de análises IA

**Métricas**:
- Total de análises
- Score médio
- Tempo médio de análise
- Taxa de acerto
- Análises por plataforma

**Gráficos** (Recharts):
- Evolução temporal
- Distribuição de scores
- Análises por categoria

### 3.6 WhatsApp Business

#### `src/pages/WhatsApp.tsx`
**Propósito**: Central de atendimento WhatsApp

**Layout**:
```
┌──────────────┬───────────────┬──────────────┐
│   Contas     │   Conversas   │   Mensagens  │
│   (Select)   │   (Lista)     │   (Chat)     │
└──────────────┴───────────────┴──────────────┘
```

**Componentes**:
- `ConversasList` - Lista de conversas
- `ChatArea` - Área de mensagens
- `MediaUploader` - Upload de mídia
- `AudioRecorder` - Gravação de áudio
- `EmojiPicker` - Seletor de emojis
- `ButtonMessageBuilder` - Construtor de botões

#### `src/hooks/useWhatsApp.tsx`
**Propósito**: Gerenciar contas, conversas e mensagens WhatsApp

**Queries**:
- `contas` - Contas WhatsApp ativas
- `useConversas(contaId)` - Conversas da conta
- `useMensagens(conversaId)` - Mensagens da conversa

**Mutations**:
- `enviarMensagem` - Enviar mensagem texto
- `criarConversa` - Nova conversa
- `atualizarConversa` - Atualizar status/prioridade

#### `src/hooks/useWhatsAppConfig.ts`
**Propósito**: Configuração global do WhatsApp

**Modos**:
- `oficial_gupshup` - API oficial via Gupshup
- `nao_oficial_wapi` - API não oficial W-API

**Uso**:
```typescript
const { 
  config, isOficial, isGupshup, isWAPI,
  atualizarConfig, isAtualizando 
} = useWhatsAppConfig();
```

#### Edge Functions WhatsApp

**`gupshup-webhook`**: Recebe mensagens do Gupshup
**`gupshup-enviar-mensagem`**: Envia via Gupshup
**`w-api-webhook`**: Recebe mensagens do W-API
**`w-api-enviar-mensagem`**: Envia via W-API
**`w-api-enviar-imagem`**: Envia imagem
**`w-api-enviar-audio`**: Envia áudio
**`w-api-enviar-documento`**: Envia documento
**`w-api-enviar-botoes`**: Envia botões interativos
**`w-api-gerar-qrcode`**: Gera QR Code de conexão

### 3.7 Sistema de Tickets (SAC)

#### `src/pages/Tickets.tsx`
**Propósito**: Lista de tickets de atendimento

**Colunas**:
- Número do ticket
- Assunto
- Cliente
- Prioridade
- Status
- Atribuído para
- Tempo decorrido
- Ações

**Status**:
- `aberto` - Ticket aberto
- `em_atendimento` - Em atendimento
- `aguardando_cliente` - Aguardando retorno
- `pausado` - Pausado
- `resolvido` - Resolvido
- `fechado` - Fechado

#### `src/pages/TicketDetalhes.tsx`
**Propósito**: Detalhes e interações do ticket

**Seções**:
1. **Header**: Número, status, prioridade, tempo
2. **Informações**: Cliente, assunto, descrição
3. **Interações**: Timeline de mensagens
4. **Chat Assistente**: IA contextual
5. **Anexos**: Documentos relacionados

#### `src/hooks/useTickets.tsx`
**Propósito**: CRUD de tickets

**Mutations**:
- `criarTicket` - Criar ticket
- `atualizarTicket` - Atualizar ticket
- `adicionarInteracao` - Nova interação
- `pausarTicket` - Pausar ticket
- `transferirTicket` - Transferir para outro atendente
- `avaliarAtendimento` - Avaliação do cliente

#### `src/components/tickets/ChatAssistente.tsx`
**Propósito**: Chat IA para auxiliar atendente

**Edge Function**: `chat-assistente-ticket`
- Analisa contexto do ticket
- Sugere respostas
- Busca na base de conhecimento
- Detecta sentimento do cliente

### 3.8 Gestão de Equipes e Metas

#### `src/pages/Equipes.tsx`
**Propósito**: Gestão completa de equipes comerciais

**Abas**:
1. **Visão Geral**: KPIs consolidados
2. **Equipes**: Lista de equipes
3. **Metas**: Metas coletivas e individuais
4. **Performance**: Rankings e análises
5. **Hierarquia**: Organograma

#### `src/hooks/useEquipes.tsx`
**Propósito**: CRUD de equipes

**Queries**:
- `equipes` - Lista equipes
- `membros` - Membros da equipe
- `hierarquia` - Estrutura hierárquica

**Mutations**:
- `criarEquipe` - Nova equipe
- `editarEquipe` - Editar equipe
- `adicionarMembro` - Adicionar membro
- `removerMembro` - Remover membro
- `transferirLideranca` - Transferir líder

#### `src/hooks/useMetasEquipe.tsx`
**Propósito**: Metas de equipe

**Tipos de Meta**:
- `vendas` - Valor de vendas
- `atendimentos` - Número de atendimentos
- `conversao` - Taxa de conversão
- `satisfacao` - NPS/CSAT

**Queries**:
- `metas` - Lista metas
- `progresso` - Progresso da meta
- `alertas` - Alertas de meta

**Mutations**:
- `criarMeta` - Nova meta
- `atualizarProgresso` - Atualizar progresso
- `marcarAlertaLido` - Marcar alerta como lido

#### `src/components/equipes/RadarPerformance.tsx`
**Propósito**: Gráfico radar de performance

**Métricas**:
- Atingimento de meta
- Taxa de conversão
- Ticket médio
- Margem média
- Satisfação do cliente

### 3.9 Licitações

#### `src/pages/licitacoes/SolicitacaoParticipacao.tsx`
**Propósito**: Solicitar participação em licitações

**Workflow**:
1. Pesquisar licitação (CNPJA)
2. Analisar edital
3. Solicitar aprovação
4. Vincular produtos
5. Montar proposta

#### `src/hooks/useCNPJA.tsx`
**Propósito**: Integração com CNPJA API

**Funções**:
- `consultarCNPJ` - Buscar empresa
- `consultarLicitacoes` - Buscar licitações
- `decisoesInteligentes` - IA para análise

**Edge Functions**:
- `cnpja-consultar-office` - Consulta CNPJA Office
- `cnpja-decisoes-inteligentes` - Análise IA de viabilidade
- `cnpja-executar-consultas` - Executar consultas em lote

### 3.10 URAs (Zenvia)

#### `src/pages/URAs.tsx`
**Propósito**: Gerenciar URAs telefônicas

**Funcionalidades**:
- Criar/editar URAs
- Fluxo visual de opções
- Testar URA
- Logs de chamadas

#### `src/components/ura/FluxoVisual.tsx`
**Propósito**: Editor visual de fluxo de URA

**Tipos de Nó**:
- Mensagem de áudio
- Opções do menu
- Transferência
- Encerramento

#### Edge Functions URA

**`handle-ura-zenvia`**: Webhook de eventos Zenvia
**`zenvia-iniciar-ligacao`**: Iniciar chamada
**`zenvia-webhook-ligacao`**: Receber eventos de ligação

---

## 4. ROTAS E NAVEGAÇÃO

### Estrutura de Rotas

```typescript
<Routes>
  {/* Pública */}
  <Route path="/auth" element={<Auth />} />
  
  {/* Protegidas */}
  <Route path="/" element={<Dashboard />} />
  
  {/* Vendas */}
  <Route path="/vendas" element={<Vendas />} />
  <Route path="/vendas/pedidos" element={<PedidosVendas />} />
  <Route path="/vendas/contratos" element={<ContratosVendas />} />
  <Route path="/vendas/carteira" element={<MinhaCarteira />} />
  
  {/* Plataformas */}
  <Route path="/plataformas/cotacoes" element={<Cotacoes />} />
  <Route path="/plataformas/cotacoes/:id" element={<CotacaoDetalhes />} />
  <Route path="/plataformas/dashboard-ia" element={<DashboardAnaliseIA />} />
  <Route path="/plataformas/ml-dashboard" element={<MLDashboard />} />
  <Route path="/plataformas/produtos-vinculo" element={<ProdutosVinculo />} />
  <Route path="/plataformas/parametros" element={<Parametros />} />
  
  {/* Clientes */}
  <Route path="/clientes" element={<Clientes />} />
  <Route path="/clientes/:id" element={<ClienteDetalhes />} />
  <Route path="/clientes/cadastro-cnpj" element={<CadastroCNPJ />} />
  <Route path="/clientes/solicitacoes" element={<SolicitacoesCadastro />} />
  
  {/* WhatsApp */}
  <Route path="/whatsapp" element={<WhatsApp />} />
  <Route path="/whatsapp/configuracoes" element={<ConfiguracoesWhatsApp />} />
  <Route path="/whatsapp/configuracao-global" element={<ConfiguracaoGlobal />} />
  
  {/* URAs */}
  <Route path="/uras" element={<URAs />} />
  <Route path="/uras/editor/:id?" element={<URAEditor />} />
  
  {/* Tickets */}
  <Route path="/tickets" element={<Tickets />} />
  <Route path="/tickets/novo" element={<NovoTicket />} />
  <Route path="/tickets/:id" element={<TicketDetalhes />} />
  <Route path="/tickets/dashboard" element={<TicketsDashboard />} />
  
  {/* Licitações */}
  <Route path="/licitacoes" element={<Licitacoes />} />
  <Route path="/licitacoes/solicitacao" element={<SolicitacaoParticipacao />} />
  <Route path="/licitacoes/contratos" element={<ContratosGoverno />} />
  
  {/* Equipes */}
  <Route path="/equipes" element={<Equipes />} />
  <Route path="/perfil-vendedor" element={<PerfilVendedor />} />
  
  {/* Admin */}
  <Route path="/usuarios" element={<Usuarios />} />
  <Route path="/produtos" element={<Produtos />} />
  <Route path="/configuracoes" element={<Configuracoes />} />
  <Route path="/perfil" element={<MeuPerfil />} />
  
  {/* 404 */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Proteção de Rotas

Todas as rotas exceto `/auth` são protegidas pelo componente `<ProtectedRoute>`:

```typescript
<Route path="/rota" element={
  <ProtectedRoute>
    <Layout>
      <Componente />
    </Layout>
  </ProtectedRoute>
} />
```

### Parâmetros de Rota

- `/clientes/:id` - ID do cliente
- `/vendas/:id` - ID da venda
- `/tickets/:id` - ID do ticket
- `/plataformas/cotacoes/:id` - ID da cotação
- `/uras/editor/:id?` - ID opcional da URA

---

## 5. GERENCIAMENTO DE ESTADO

### TanStack Query (React Query)

**Configuração** (`src/main.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      retry: 1,
    },
  },
});
```

**Padrão de Uso**:
```typescript
// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['vendas', filtros],
  queryFn: async () => {
    const { data } = await supabase
      .from('vendas')
      .select('*')
      .eq('filtro', valor);
    return data;
  }
});

// Mutation
const { mutate, isLoading } = useMutation({
  mutationFn: async (novaVenda) => {
    const { data } = await supabase
      .from('vendas')
      .insert(novaVenda);
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['vendas']);
    toast.success('Venda criada!');
  }
});
```

### Context API

#### `EquipesFiltrosContext`
**Propósito**: Compartilhar filtros entre componentes de equipes

```typescript
const {
  dataInicio, dataFim,
  equipeSelecionada, vendedorSelecionado,
  criterio, setDataInicio, ...
} = useEquipesFiltros();
```

#### `ThemeProvider`
**Propósito**: Gerenciar tema claro/escuro

```typescript
const { theme, setTheme } = useTheme();
```

### Estado Local (useState)

Usado para:
- Estados de UI (modals, dialogs, sheets)
- Formulários simples
- Estados transitórios

---

## 6. SERVIÇOS E APIs

### Supabase Client

**Configuração** (`src/integrations/supabase/client.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
```

### Edge Functions

Localizadas em `supabase/functions/`:

#### Análise IA
- **`analisar-cotacao-completa`**: Análise completa de cotação
- **`analisar-sentimento-cliente`**: Análise de sentimento
- **`chat-assistente-criacao`**: Assistente para criação
- **`chat-assistente-ticket`**: Assistente de tickets
- **`classificar-criticidade-ticket`**: Classificação de criticidade
- **`corrigir-analises-travadas`**: Corrigir análises travadas
- **`edi-sugerir-produtos`**: Sugestão de produtos EDI

#### APIs Externas
- **`cliente-api`**: CRUD de clientes via API
- **`produto-api`**: CRUD de produtos via API
- **`cnpja-consultar-office`**: Consulta CNPJA
- **`cnpja-decisoes-inteligentes`**: Decisões inteligentes CNPJA
- **`cnpja-executar-consultas`**: Executar consultas CNPJA

#### WhatsApp Gupshup
- **`gupshup-enviar-mensagem`**: Enviar mensagem
- **`gupshup-webhook`**: Webhook de eventos

#### WhatsApp W-API
- **`w-api-enviar-mensagem`**: Enviar texto
- **`w-api-enviar-imagem`**: Enviar imagem
- **`w-api-enviar-audio`**: Enviar áudio
- **`w-api-enviar-video`**: Enviar vídeo
- **`w-api-enviar-documento`**: Enviar documento
- **`w-api-enviar-botoes`**: Enviar botões
- **`w-api-gerar-qrcode`**: Gerar QR Code
- **`w-api-verificar-status`**: Verificar status
- **`w-api-reagir-mensagem`**: Reagir a mensagem
- **`w-api-deletar-mensagem`**: Deletar mensagem
- **`w-api-editar-mensagem`**: Editar mensagem
- **`w-api-webhook`**: Webhook de eventos

#### Zenvia URAs
- **`handle-ura-zenvia`**: Handler de URA
- **`zenvia-iniciar-ligacao`**: Iniciar ligação
- **`zenvia-webhook-ligacao`**: Webhook de ligação

#### Outros
- **`criar-usuario`**: Criar usuário administrativamente
- **`edi-importar-xml`**: Importar XML EDI
- **`upload-anexo-spaces`**: Upload para DigitalOcean Spaces
- **`sincronizar-contatos-whatsapp`**: Sincronizar contatos

### Tratamento de Erros

**Padrão**:
```typescript
try {
  const { data, error } = await supabase
    .from('tabela')
    .select('*');
    
  if (error) throw error;
  
  return data;
} catch (error) {
  console.error('Erro:', error);
  toast.error('Ocorreu um erro');
  throw error;
}
```

### Autenticação e Autorização

**RLS (Row Level Security)** habilitado em todas as tabelas sensíveis.

**Políticas**:
- Usuários veem apenas seus próprios dados ou de sua equipe
- Admins têm acesso total
- Líderes veem dados de sua equipe
- Vendedores veem apenas seus clientes

**Exemplo de RLS Policy**:
```sql
CREATE POLICY "Usuários podem ver suas vendas"
ON vendas FOR SELECT
USING (
  vendedor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM equipes e
    JOIN membros_equipe me ON e.id = me.equipe_id
    WHERE e.lider_equipe_id = auth.uid()
    AND me.usuario_id = vendedor_id
  ) OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

---

## 7. ESTILIZAÇÃO

### Design System (index.css)

**Tokens Semânticos** (HSL):
```css
:root {
  /* Core Colors */
  --background: 0 0% 95%;
  --foreground: 186 80% 15%;
  --primary: 186 60% 56%; /* #47CCD8 - Cyan */
  --secondary: 240 65% 60%; /* #6366F1 - Indigo */
  --tertiary: 186 80% 40%;
  --success: 142 71% 45%;
  --warning: 45 93% 47%;
  --destructive: 0 84% 60%;
  --muted: 186 25% 94%;
  --accent: 280 60% 60%;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, hsl(186 60% 56%), hsl(186 80% 40%));
  --gradient-secondary: linear-gradient(135deg, hsl(240 65% 60%), hsl(280 60% 60%));
  
  /* Shadows */
  --shadow-default: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 16px hsla(186, 60%, 56%, 0.15);
  
  /* Radius */
  --radius: 0.75rem;
  --border-width: 2px;
}

.dark {
  --background: 186 80% 8%;
  --foreground: 186 25% 94%;
  --primary: 186 60% 56%;
  /* ... dark mode tokens */
}
```

### TailwindCSS

**Configuração** (`tailwind.config.ts`):
```typescript
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... todos os tokens
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
      }
    }
  }
}
```

### Componentes Shadcn/ui

Localizados em `src/components/ui/`:
- `button.tsx` - Botões
- `card.tsx` - Cards
- `dialog.tsx` - Modais
- `sheet.tsx` - Painéis laterais
- `table.tsx` - Tabelas
- `form.tsx` - Formulários
- `select.tsx` - Selects
- `input.tsx` - Inputs
- `badge.tsx` - Badges
- `toast.tsx` - Notificações
- ... 48 componentes UI no total

**Uso**:
```tsx
<Button variant="default" size="lg">
  Clique aqui
</Button>

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>Conteúdo</CardContent>
</Card>
```

### Responsive Design

**Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px

**Padrão**:
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Mobile: 1 coluna, Tablet: 2 colunas, Desktop: 3 colunas */}
</div>
```

---

## 8. CONFIGURAÇÕES

### Variáveis de Ambiente (.env)

```bash
# Supabase
VITE_SUPABASE_URL=https://rzzzfprgnoywmmjwepzm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
VITE_SUPABASE_PROJECT_ID=rzzzfprgnoywmmjwepzm

# Aplicação (opcional)
VITE_APP_NAME=Sistema Gestão Comercial
VITE_APP_VERSION=1.0.0
```

### package.json

**Scripts**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  }
}
```

**Principais Dependências**:
- React 18.3.1
- TypeScript 5.8.3
- Vite 5.4.19
- TailwindCSS 3.4.17
- Supabase 2.58.0
- TanStack Query 5.83.0
- React Router 6.30.1
- React Hook Form 7.61.1
- Zod 3.25.76

### Supabase Config (config.toml)

```toml
[api]
enabled = true
port = 54321

[db]
port = 54322

[studio]
enabled = true
port = 54323

[functions]
verify_jwt = false
```

---

## 9. FLUXOS PRINCIPAIS

### 9.1 Fluxo de Venda

```
1. Prospecção
   └─> Criar oportunidade
       └─> Definir cliente, valor estimado, probabilidade
       
2. Qualificação
   └─> Adicionar informações
       └─> Budget, decisor, prazo
       
3. Proposta
   └─> Gerar proposta (PedidoForm)
       └─> Selecionar produtos
       └─> Definir preços, condições
       
4. Negociação
   └─> Ajustes de proposta
       └─> Descontos, condições
       
5. Fechamento
   └─> Aprovar venda
       └─> Gera pedido
       └─> Atualiza metas
       
6. Ganho/Perdido
   └─> Marcar resultado
       └─> Se ganho: vai para pedidos
       └─> Se perdido: registrar motivo
```

### 9.2 Fluxo de Cotação EDI

```
1. Importação
   └─> Upload XML
       └─> Parse e validação
       └─> Criação da cotação
       └─> Criação dos itens
       
2. Análise IA (automática)
   └─> Edge function analisar-cotacao-completa
       └─> Para cada item:
           ├─> Análise de descrição
           ├─> Sugestão de produto
           ├─> Score de confiança
           └─> Recomendações
       
3. Vinculação
   └─> Revisar sugestões IA
       └─> Vincular produtos
       └─> Ajustar manualmente se necessário
       
4. Precificação
   └─> Calcular preços
       └─> Aplicar margens
       └─> Definir condições
       
5. Exportação
   └─> Gerar resposta
       └─> Formato XML/CSV
       └─> Enviar para plataforma
```

### 9.3 Fluxo de Ticket

```
1. Abertura
   └─> Cliente ou sistema cria ticket
       └─> Classificação automática (IA)
       └─> Atribuição por fila/regras
       
2. Atendimento
   └─> Atendente assume ticket
       └─> Chat com cliente
       └─> Consulta assistente IA
       └─> Adiciona interações
       
3. Resolução
   └─> Problema resolvido
       └─> Marcar como resolvido
       └─> Solicitar avaliação
       
4. Avaliação
   └─> Cliente avalia
       └─> NPS/CSAT
       └─> Comentário
       
5. Fechamento
   └─> Fechar ticket
       └─> Atualizar estatísticas
       └─> Arquivar
```

### 9.4 Fluxo de WhatsApp

```
1. Conexão
   └─> Configurar conta
       └─> Gupshup: API Key
       └─> W-API: Gerar QR Code
       
2. Receber Mensagem
   └─> Webhook recebe evento
       └─> Criar/atualizar conversa
       └─> Criar mensagem
       └─> Notificar atendente
       └─> Abrir janela 24h
       
3. Atendimento
   └─> Atendente responde
       └─> Edge function envia
       └─> Salva no banco
       └─> Atualiza conversa
       
4. Automação
   └─> Respostas rápidas
   └─> Templates
   └─> URA
   └─> Chatbot (futuro)
```

---

## 10. BOAS PRÁTICAS E PADRÕES

### Padrões de Código

1. **Componentes Funcionais**: Sempre usar function components
2. **TypeScript Strict**: Tipagem forte em tudo
3. **Custom Hooks**: Lógica compartilhada em hooks
4. **Composição**: Preferir composição sobre herança
5. **Tokens Semânticos**: Usar variáveis CSS, não cores diretas

### Estrutura de Componente

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface MeuComponenteProps {
  titulo: string;
  onSave: (data: any) => void;
}

export function MeuComponente({ titulo, onSave }: MeuComponenteProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(data);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>{titulo}</h1>
      <Button onClick={handleSubmit} disabled={loading}>
        Salvar
      </Button>
    </div>
  );
}
```

### Convenções

- **Imports**: Ordenar (React, bibliotecas, local, estilos)
- **Props**: Interface nomeada `ComponenteProps`
- **States**: Prefixo `is` para booleans
- **Handlers**: Prefixo `handle`
- **Queries**: Prefixo `use` em hooks
- **Comentários**: JSDoc para funções públicas

---

## 11. CONSIDERAÇÕES DE SEGURANÇA

### RLS (Row Level Security)

- Todas as tabelas sensíveis protegidas
- Políticas por role
- Filtros por equipe/vendedor
- Auditoria de mudanças

### Validação

**Frontend** (Zod):
```typescript
const schema = z.object({
  email: z.string().email(),
  cpf: z.string().regex(/^\d{11}$/),
  valor: z.number().positive(),
});
```

**Backend** (PostgreSQL):
```sql
ALTER TABLE vendas ADD CONSTRAINT valor_positivo 
CHECK (valor_final > 0);
```

### Sanitização

- React sanitiza automaticamente JSX
- Zod valida inputs
- Supabase escapa SQL automaticamente

### Secrets

- API keys em variáveis de ambiente
- Nunca comitar .env
- Supabase gerencia secrets

---

## 12. PERFORMANCE E OTIMIZAÇÕES

### Code Splitting

```typescript
// Lazy loading de páginas
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

### Memoização

```typescript
const MemoizedComponent = React.memo(Component);

const valorCalculado = useMemo(() => {
  return calcularValor(input);
}, [input]);

const handleClick = useCallback(() => {
  // handler
}, [deps]);
```

### React Query

- Cache automático (staleTime: 60s)
- Refetch inteligente
- Deduplicação de requests
- Background updates

### Virtualização

Para listas grandes:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
```

### Imagens

- Formatos modernos (webp)
- Lazy loading
- Responsive images

---

## 13. DEPLOYMENT

### Build de Produção

```bash
npm run build
```

Gera pasta `dist/` com:
- HTML minificado
- CSS otimizado
- JS com tree-shaking
- Assets otimizados

### Configurações de Produção

**vite.config.ts**:
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  }
});
```

### Deploy Supabase

Edge functions deployadas automaticamente via Supabase CLI:
```bash
supabase functions deploy nome-funcao
```

### Variáveis de Ambiente

Configurar no Supabase Dashboard:
- CNPJA_API_KEY
- GUPSHUP_API_KEY
- ZENVIA_TOKEN
- etc.

---

## 14. PRÓXIMOS PASSOS E MELHORIAS

### Funcionalidades Pendentes

1. **Chatbot WhatsApp**: Atendimento automatizado com IA
2. **Relatórios Avançados**: Power BI embeddado
3. **App Mobile**: React Native
4. **Integrações ERP**: SAP, TOTVS, etc.
5. **Marketplace**: B2B marketplace próprio
6. **E-commerce B2B**: Carrinho e checkout
7. **CRM Marketing**: Email marketing, campanhas
8. **Previsão de Vendas**: IA preditiva
9. **Geolocalização**: Roteirização de vendedores
10. **Assinatura Eletrônica**: DocuSign/Clicksign

### Refatorações Sugeridas

1. **Separar módulos**: Criar microfrontends
2. **Testes**: Implementar Jest + Testing Library
3. **Storybook**: Documentar componentes
4. **CI/CD**: GitHub Actions
5. **Monorepo**: NX ou Turborepo
6. **Design Tokens**: Exportar para JSON
7. **Internacionalização**: i18next
8. **PWA**: Service workers

### Débitos Técnicos

1. Alguns componentes muito grandes (refatorar)
2. Duplicação de lógica entre hooks
3. Falta de testes automatizados
4. Documentação inline incompleta
5. Alguns any types no TypeScript
6. Otimizar queries SQL complexas
7. Implementar rate limiting nas APIs
8. Melhorar error boundaries

---

## 15. BANCO DE DADOS

### Principais Tabelas

- **users/profiles**: Usuários e perfis
- **clientes**: Clientes CRM
- **contatos_cliente**: Contatos
- **vendas**: Oportunidades de venda
- **produtos**: Catálogo de produtos
- **equipes**: Equipes comerciais
- **membros_equipe**: Membros das equipes
- **metas_equipe**: Metas coletivas
- **metas_vendedor**: Metas individuais
- **edi_cotacoes**: Cotações EDI
- **edi_itens_cotacao**: Itens das cotações
- **edi_produtos_vinculo**: DE-PARA produtos
- **whatsapp_contas**: Contas WhatsApp
- **whatsapp_conversas**: Conversas
- **whatsapp_mensagens**: Mensagens
- **tickets**: Tickets de atendimento
- **tickets_interacoes**: Interações dos tickets
- **uras**: URAs configuradas
- **licitacoes**: Licitações

Ver `database-dump.sql` para schema completo.

---

## CONCLUSÃO

Este sistema é uma plataforma completa de gestão comercial B2B com:
- **100+ tabelas** no banco de dados
- **32 páginas** React
- **200+ componentes** reutilizáveis
- **43 custom hooks**
- **33 edge functions**
- **12 ENUMs** customizados
- **141 migrations** aplicadas

Tecnologias modernas, arquitetura escalável, segurança robusta e UX intuitiva.
