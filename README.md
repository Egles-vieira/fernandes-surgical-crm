# 🚀 Sistema CRM com Integração WhatsApp

Sistema completo de CRM (Customer Relationship Management) desenvolvido com React, TypeScript, Tailwind CSS e Supabase, com integração nativa do WhatsApp via Gupshup API.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Arquitetura do Projeto](#arquitetura-do-projeto)
- [Fases de Desenvolvimento](#fases-de-desenvolvimento)
- [Instalação e Configuração](#instalação-e-configuração)
- [Estrutura de Dados](#estrutura-de-dados)
- [Recursos Principais](#recursos-principais)
- [Guia de Uso](#guia-de-uso)
- [Deploy e Produção](#deploy-e-produção)

---

## 🎯 Visão Geral

Sistema integrado para gestão de relacionamento com clientes, focado em:

- **Gestão Completa de Clientes**: Cadastro, histórico e relacionamento
- **Pipeline de Vendas**: Kanban visual com etapas customizáveis
- **Integração WhatsApp**: Comunicação bidirecional em tempo real
- **Controle de Estoque**: Gestão de produtos e movimentações
- **Relatórios e Análises**: Dashboards com métricas de vendas
- **Sistema de Permissões**: Controle de acesso baseado em roles

**URL do Projeto**: https://lovable.dev/projects/1da8e29e-2c27-4a7d-bf39-0405ea816dd1

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18.3.1** - Biblioteca JavaScript para interfaces
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Componentes UI reutilizáveis

### Backend & Infraestrutura
- **Lovable Cloud (Supabase)** - Backend as a Service
  - PostgreSQL - Banco de dados relacional
  - Row Level Security (RLS) - Segurança a nível de linha
  - Edge Functions - Serverless functions (Deno)
  - Realtime - Atualizações em tempo real

### Bibliotecas Principais
- **@tanstack/react-query** - Gerenciamento de estado assíncrono
- **react-hook-form + zod** - Formulários e validação
- **recharts** - Gráficos e visualizações
- **@dnd-kit** - Drag and drop para Kanban
- **lucide-react** - Ícones
- **date-fns** - Manipulação de datas

### Integração Externa
- **Gupshup WhatsApp API** - Integração WhatsApp Business

---

## 🏗️ Arquitetura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes base (shadcn)
│   ├── cliente/        # Componentes de clientes
│   ├── vendas/         # Componentes de vendas (Kanban)
│   └── whatsapp/       # Componentes WhatsApp
├── hooks/              # Custom React Hooks
│   ├── useAuth.tsx     # Autenticação
│   ├── useClientes.tsx # Gestão de clientes
│   ├── useProdutos.tsx # Gestão de produtos
│   ├── useVendas.tsx   # Gestão de vendas
│   └── useWhatsApp.tsx # Integração WhatsApp
├── pages/              # Páginas da aplicação
├── lib/                # Utilitários e validações
└── integrations/       # Integrações (Supabase)

supabase/
├── functions/          # Edge Functions
│   ├── gupshup-webhook/        # Recebe webhooks do Gupshup
│   └── gupshup-enviar-mensagem/ # Envia mensagens via Gupshup
└── migrations/         # Migrações do banco de dados
```

---

## 📊 Fases de Desenvolvimento

### **FASE 0: Fundação e Infraestrutura** ✅
*Status: Concluída*

#### Etapa 0.1: Setup Inicial
- [x] Configuração do projeto React + Vite + TypeScript
- [x] Setup Tailwind CSS e shadcn/ui
- [x] Estrutura de pastas e arquitetura
- [x] Configuração de rotas (react-router-dom)

#### Etapa 0.2: Backend e Autenticação
- [x] Configuração Lovable Cloud (Supabase)
- [x] Sistema de autenticação (signup/login)
- [x] Proteção de rotas (ProtectedRoute)
- [x] Hook useAuth para gerenciamento de sessão

**Documentação Relacionada**: 
- `FASE-0-README.md` - Overview completo da Fase 0
- `FASE-0-ETAPA-0.2-README.md` - Detalhes de autenticação
- `FASE-0-ETAPA-2.2-README.md` - Configurações avançadas

---

### **FASE 1: Sistema de Permissões e Roles** ✅
*Status: Concluída*

#### Objetivos
Implementar sistema robusto de controle de acesso baseado em roles (RBAC - Role-Based Access Control).

#### Roles Implementados
```typescript
type AppRole = 'admin' | 'manager' | 'sales' | 'warehouse' | 'support'
```

#### Estrutura de Dados
**Tabela**: `user_roles`
- `id` (UUID) - Identificador único
- `user_id` (UUID) - Referência ao usuário
- `role` (app_role) - Role atribuído
- `created_at` (timestamp)
- `created_by` (UUID) - Quem criou

**Security Definer Functions**:
```sql
-- Verificar se usuário tem role específico
has_role(_user_id uuid, _role app_role) → boolean

-- Verificar se usuário tem algum dos roles
has_any_role(_user_id uuid, _roles app_role[]) → boolean

-- Obter roles do usuário com flags booleanas
get_user_roles(_user_id uuid) → TABLE

-- Listar todos usuários com seus roles (admin only)
list_users_with_roles() → TABLE
```

#### RLS Policies
- **SELECT**: Usuários podem ver suas próprias roles
- **ALL**: Admins podem gerenciar todas as roles
- Funções `SECURITY DEFINER` previnem recursão infinita

#### Hook Personalizado
`useRoles()` - Gerenciamento completo de roles no frontend
```typescript
const {
  currentUserRoles,      // Roles do usuário atual
  isAdmin,               // Boolean flags
  isManager,
  isSales,
  hasRole,               // Function para verificar role
  addRole,               // Mutation para adicionar role
  removeRole,            // Mutation para remover role
  allUsers               // Lista de usuários (admin only)
} = useRoles()
```

#### Componentes
- `src/pages/Usuarios.tsx` - Gestão de usuários e roles (admin only)

**Documentação Relacionada**: 
- `FASE-1-README.md` - Guia completo do sistema de roles

---

### **FASE 2: Gestão de Clientes** ✅
*Status: Concluída*

#### Objetivos
Sistema completo de CRM para gestão de clientes, contatos e relacionamentos.

#### Estrutura de Dados

**Tabela**: `clientes`
- Informações básicas: nome, CNPJ, atividade
- Dados de contato: telefone, email, email_xml
- Dados comerciais: limite_crédito, condições de pagamento
- Relacionamento: cod_rep, equipevendas
- Referências: conta_id (tabela contas)

**Tabela**: `enderecos_clientes`
- Múltiplos endereços por cliente
- Tipos: principal, entrega, cobrança
- Dados completos: CEP, logradouro, cidade, estado
- Flag is_principal para endereço padrão

**Tabela**: `contas`
- Abstração de conta (pode ser cliente, fornecedor, etc.)
- Hierarquia: conta_pai_id para subcontas
- Proprietário: proprietario_id
- Status e soft delete: esta_ativa, excluido_em

**Tabela**: `contatos`
- Contatos associados a contas/clientes
- Informações pessoais e profissionais
- Lead scoring e ciclo de vida
- Preferências de comunicação

#### Funcionalidades

**Listagem e Busca**:
- Tabela responsiva com ordenação
- Busca por nome, CNPJ, email
- Filtros avançados
- Paginação

**Cadastro e Edição**:
- Formulários validados (react-hook-form + zod)
- Gestão de múltiplos endereços
- Upload de dados via CSV (importação)

**Detalhes do Cliente**:
- Visão 360° do cliente
- Histórico de produtos comprados
- Timeline de interações
- Oportunidades vinculadas
- Chat WhatsApp integrado

#### Hooks
- `useClientes()` - CRUD de clientes
- `useRoles()` - Verificação de permissões

#### Páginas
- `/clientes` - Listagem
- `/clientes/:id` - Detalhes
- `/importar-clientes` - Importação CSV

#### Permissões RLS
- **SELECT**: Usuários veem seus próprios clientes
- **INSERT**: Sales+ podem criar
- **UPDATE**: Proprietário + Manager+ podem editar
- **DELETE**: Admin only

---

### **FASE 3: Gestão de Produtos e Estoque** ✅
*Status: Concluída*

#### Objetivos
Sistema de catálogo de produtos e controle de estoque.

#### Estrutura de Dados

**Tabela**: `produtos`
- Identificação: referencia_interna, nome
- Precificação: preco_venda, custo, dtr
- Estoque: quantidade_em_maos, quantidade_prevista
- Fiscal: NCM, cod_trib_icms, aliquota_ipi
- Organização: grupo_estoque, marcadores_produto

**Tabela**: `estoque`
- Rastreamento de movimentações
- Tipos: entrada, saída, ajuste, devolução
- Histórico: quantidade_anterior, quantidade_atual
- Rastreabilidade: documento, lote, responsável

**Tabela**: `produtos_catalogo`
- Produtos para cotações/oportunidades
- Informações comerciais
- Preços e disponibilidade

#### Funcionalidades

**Gestão de Produtos**:
- CRUD completo
- Importação via CSV
- Busca e filtros
- Categorização

**Controle de Estoque**:
- Registro de entradas/saídas
- Histórico completo
- Saldo em tempo real
- Alertas de estoque baixo

**Diálogo de Busca**:
- Busca rápida de produtos
- Seleção para vendas/cotações
- Preview de informações

#### Hooks
- `useProdutos()` - CRUD de produtos
- `useCondicoesPagamento()` - Condições
- `useTiposFrete()` - Tipos de frete
- `useTiposPedido()` - Tipos de pedido

#### Páginas
- `/produtos` - Catálogo
- `/importar-produtos` - Importação

#### Permissões RLS
- **SELECT**: Sales+ e Warehouse+ podem ver
- **INSERT/UPDATE/DELETE**: Admin e Manager only
- **Estoque**: Warehouse pode registrar movimentações

---

### **FASE 4: Pipeline de Vendas (Kanban)** ✅
*Status: Concluída*

#### Objetivos
Sistema visual de pipeline de vendas com drag-and-drop.

#### Estrutura de Dados

**Tabela**: `oportunidades`
- Identificação: nome_oportunidade
- Valor: valor, receita_esperada
- Relacionamento: conta_id, contato_id, proprietario_id
- Pipeline: pipeline_id, estagio_id
- Status: esta_fechada, foi_ganha, percentual_probabilidade
- Tracking: dias_no_estagio, ultima_mudanca_estagio_em

**Tabela**: `pipelines`
- Nome e descrição
- Tipo: vendas, suporte, etc.
- Ordenação e ativação

**Tabela**: `estagios_pipeline`
- Nome do estágio
- Ordem: ordem_estagio
- Probabilidade: percentual_probabilidade
- Flags: eh_ganho_fechado, eh_perdido_fechado
- Visual: cor

**Tabela**: `itens_linha_oportunidade`
- Produtos da oportunidade
- Preços e descontos
- Cálculos automáticos

**Tabela**: `historico_estagio_oportunidade`
- Auditoria de mudanças
- Tempo em cada estágio
- Responsável pela mudança

#### Funcionalidades

**Kanban Board**:
- Drag-and-drop entre colunas (@dnd-kit)
- Cards com informações resumidas
- Cores por estágio
- Contadores e totalizadores

**Gestão de Oportunidades**:
- Criação rápida via dialog
- Edição inline de valores
- Associação com produtos
- Cálculo automático de valores

**Analytics**:
- Taxa de conversão por estágio
- Tempo médio em cada estágio
- Valor total do pipeline
- Previsão de fechamento

#### Componentes
- `PipelineKanban` - Board principal
- `KanbanColumn` - Coluna do Kanban
- `KanbanCard` - Card da oportunidade
- `NovaOportunidadeDialog` - Criação

#### Hook
- `useVendas()` - CRUD de oportunidades

#### Páginas
- `/vendas` - Pipeline visual
- `/vendas/minha-carteira` - Oportunidades do usuário
- `/vendas/contratos` - Contratos fechados
- `/vendas/pedidos` - Pedidos gerados

#### Permissões RLS
- **SELECT**: Sales+ podem ver
- **INSERT**: Sales+ podem criar
- **UPDATE**: Proprietário + Manager+ podem editar
- **DELETE**: Admin only

---

### **FASE 5: Integração WhatsApp** ✅
*Status: Concluída*

#### Objetivos
Comunicação bidirecional com clientes via WhatsApp Business API (Gupshup).

#### Estrutura de Dados

**Tabela**: `whatsapp_contas`
- Identificação: nome, numero_telefone
- API: app_id, api_key (encrypted)
- Status: esta_ativa, verificada
- Limites: limite_mensagens_dia

**Tabela**: `whatsapp_contatos`
- Número do contato
- Dados: nome, foto_perfil_url
- Relacionamento: cliente_id
- Métricas: total_mensagens, ultima_mensagem_em
- Flags: bloqueado, opt_out

**Tabela**: `whatsapp_conversas`
- Vinculação: conta_id + contato_id
- Status: status, prioridade
- Janela 24h: janela_24h_ativa, janela_fecha_em
- Atribuição: atribuida_para
- Métricas: total_mensagens, tempo_primeira_resposta

**Tabela**: `whatsapp_mensagens`
- Conteúdo: texto, tipo_mensagem
- Direção: enviada/recebida
- Status: pendente, enviada, entregue, lida, erro
- Tracking: enviado_em, entregue_em, lida_em
- Referência: gupshup_message_id

**Tabela**: `whatsapp_templates`
- Nome e categoria
- Corpo da mensagem
- Variáveis: variaveis (JSONB)
- Aprovação: status_aprovacao

**Tabela**: `whatsapp_respostas_rapidas`
- Atalho e título
- Conteúdo da resposta
- Categorização

#### Funcionalidades

**Chat em Tempo Real**:
- Lista de conversas com status
- Área de chat com mensagens
- Envio de mensagens de texto
- Indicadores de status (enviado, lido)
- Timestamps e avatares

**Gestão de Contatos**:
- Criação de novos contatos
- Associação com clientes
- Consulta de dados do cliente
- Histórico de interações

**Templates e Respostas**:
- Templates aprovados pela Meta
- Respostas rápidas personalizadas
- Variáveis dinâmicas
- Categorização

**Configurações**:
- Múltiplas contas WhatsApp
- Gestão de API keys
- Configuração de webhooks
- Monitoramento de limites

#### Edge Functions

**`gupshup-webhook`**:
- Recebe webhooks do Gupshup
- Processa mensagens recebidas
- Atualiza status de mensagens
- Gerencia janela 24h
- Cria/atualiza contatos e conversas

**`gupshup-enviar-mensagem`**:
- Envia mensagens via API Gupshup
- Valida janela 24h
- Atualiza status no banco
- Trata erros e retries

#### Hooks
- `useWhatsApp()` - Gestão completa WhatsApp
  - Contas, conversas, mensagens
  - Mutations para envio
  - Realtime updates

#### Componentes
- `ConversasList` - Lista de conversas
- `ChatArea` - Área de chat
- `NovaConversaDialog` - Nova conversa
- `ClienteConsultaDialog` - Consulta cliente
- `ContasWhatsAppList` - Gestão de contas
- `TemplatesWhatsApp` - Templates
- `RespostasRapidas` - Respostas rápidas

#### Páginas
- `/whatsapp` - Chat principal
- `/whatsapp/configuracoes` - Configurações

#### Triggers do Banco

**`atualizar_metricas_whatsapp_contato`**:
- Atualiza métricas ao receber mensagem
- Contadores de enviadas/recebidas

**`atualizar_conversa_ultima_mensagem`**:
- Atualiza timestamp da última mensagem
- Contadores por conversa

**`verificar_janela_24h`**:
- Abre janela 24h em mensagens recebidas
- Calcula timestamp de fechamento

#### Segurança
- API keys criptografadas
- Validação de webhooks
- RLS policies por usuário
- Rate limiting

#### Integrações Externas
- **Gupshup WhatsApp API**
  - Endpoint: `https://api.gupshup.io/sm/api/v1`
  - Autenticação: API Key
  - Webhooks para mensagens recebidas

---

### **FASE 6: Dashboard e Relatórios** 🚧
*Status: Em Planejamento*

#### Objetivos Planejados
- Dashboard executivo com KPIs
- Gráficos de vendas e performance
- Relatórios de clientes e produtos
- Análise de funil de vendas
- Métricas de WhatsApp

#### Componentes Planejados
- Gráficos com recharts
- Cards de métricas
- Filtros de período
- Exportação de relatórios

---

### **FASE 7: Licitações e Governo** 🔮
*Status: Planejado*

#### Objetivos
- Integração com portais de licitação
- Gestão de contratos governamentais
- Solicitações de participação
- Acompanhamento de editais

#### Estrutura Planejada
- Módulo de licitações
- Contratos com governo
- Documentação específica
- Prazos e alertas

---

### **FASE 8: Plataformas e Integrações** 🔮
*Status: Planejado*

#### Objetivos
- Integração com marketplaces
- Gestão de cotações
- Pedidos de múltiplas plataformas
- Relatórios consolidados

---

## 💾 Estrutura de Dados Completa

### Diagrama de Relacionamentos

```
┌─────────────┐
│  auth.users │
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
┌──────▼────────┐                  ┌─────────▼─────────┐
│  user_roles   │                  │ perfis_usuario    │
│  (security)   │                  │ (profile data)    │
└───────────────┘                  └───────────────────┘
       │
       │ has_role()
       │ has_any_role()
       │
┌──────▼────────────────────────────────────┐
│           RLS Policies                    │
│  (Controle de acesso em todas tabelas)   │
└───────────────────────────────────────────┘

┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   clientes  │────▶│    contas    │────▶│  contatos   │
└──────┬──────┘     └──────┬───────┘     └─────────────┘
       │                   │
       │                   ├──────────────┐
       │                   │              │
┌──────▼──────────┐  ┌─────▼────────┐  ┌─▼──────────────┐
│enderecos_clientes│  │oportunidades │  │perfis_sociais  │
└──────────────────┘  └──────┬───────┘  └────────────────┘
                             │
                    ┌────────┴──────────┐
                    │                   │
           ┌────────▼────────┐  ┌───────▼─────────────┐
           │  pipelines      │  │itens_linha_opor.    │
           │  estagios_pipe. │  └─────────────────────┘
           └─────────────────┘

┌──────────────┐     ┌─────────────────┐
│   produtos   │────▶│    estoque      │
└──────┬───────┘     └─────────────────┘
       │
       └──────────────┐
                      │
              ┌───────▼─────────────┐
              │ produtos_catalogo   │
              └─────────────────────┘

┌──────────────────┐     ┌────────────────────┐
│whatsapp_contas   │────▶│whatsapp_contatos   │
└──────────────────┘     └─────────┬──────────┘
                                   │
                         ┌─────────▼──────────┐
                         │whatsapp_conversas  │
                         └─────────┬──────────┘
                                   │
                         ┌─────────▼──────────┐
                         │whatsapp_mensagens  │
                         └────────────────────┘
```

### Principais Relações

1. **Usuários e Segurança**:
   - `auth.users` ← `user_roles` (N roles por usuário)
   - `auth.users` ← `perfis_usuario` (1:1)
   - Functions `has_role()` usadas em RLS policies

2. **CRM**:
   - `clientes` ← `enderecos_clientes` (1:N)
   - `clientes` → `contas` (N:1 opcional)
   - `contas` ← `contatos` (1:N)
   - `contas` ← `oportunidades` (1:N)

3. **Vendas**:
   - `oportunidades` → `pipelines` (N:1)
   - `oportunidades` → `estagios_pipeline` (N:1)
   - `oportunidades` ← `itens_linha_oportunidade` (1:N)

4. **Produtos**:
   - `produtos` ← `estoque` (1:N movimentações)
   - `produtos_catalogo` (tabela separada para cotações)

5. **WhatsApp**:
   - `whatsapp_contas` ← `whatsapp_contatos` (1:N)
   - `whatsapp_contatos` ← `whatsapp_conversas` (1:N)
   - `whatsapp_conversas` ← `whatsapp_mensagens` (1:N)
   - `whatsapp_contatos` → `clientes` (N:1 opcional)

---

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ e npm
- Conta no Lovable (para deploy)
- Conta Gupshup (para WhatsApp)

### Instalação Local

```bash
# Clone o repositório
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

O arquivo `.env` é gerado automaticamente pelo Lovable Cloud:

```env
VITE_SUPABASE_URL=<auto-generated>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-generated>
VITE_SUPABASE_PROJECT_ID=<auto-generated>
```

⚠️ **NUNCA edite o .env manualmente!**

### Configuração do WhatsApp (Gupshup)

1. Crie conta em [Gupshup](https://www.gupshup.io/)
2. Configure um App WhatsApp Business
3. Obtenha o `APP_ID` e `API_KEY`
4. Configure o webhook:
   - URL: `https://<seu-projeto>.lovable.app/functions/v1/gupshup-webhook`
   - Eventos: `message`, `message-event`

5. Adicione a conta no sistema:
   - Vá em `/whatsapp/configuracoes`
   - Clique em "Nova Conta WhatsApp"
   - Insira os dados

---

## 📖 Guia de Uso

### Primeiro Acesso

1. **Criar Conta**:
   - Acesse `/auth`
   - Clique em "Criar Conta"
   - Preencha email e senha
   - Auto-confirmação habilitada (sem necessidade de verificar email)

2. **Primeiro Admin**:
   - O primeiro usuário deve ser manualmente promovido a admin via backend
   - Acesse o backend do Lovable Cloud
   - Na tabela `user_roles`, insira:
     ```sql
     INSERT INTO user_roles (user_id, role)
     VALUES ('<user_id>', 'admin');
     ```

3. **Configurar Sistema**:
   - Como admin, acesse `/usuarios`
   - Adicione roles para outros usuários
   - Configure produtos em `/produtos`
   - Importe clientes em `/importar-clientes`

### Fluxo de Trabalho

#### Para Vendedores (Sales):

1. **Gestão de Clientes**:
   - Acesse `/clientes`
   - Cadastre novo cliente ou importe CSV
   - Adicione endereços e contatos

2. **Pipeline de Vendas**:
   - Acesse `/vendas`
   - Crie nova oportunidade no Kanban
   - Arraste cards entre etapas
   - Adicione produtos à oportunidade

3. **WhatsApp**:
   - Acesse `/whatsapp`
   - Inicie conversa com cliente
   - Use respostas rápidas
   - Consulte dados do cliente

#### Para Gerentes (Manager):

1. **Análise de Performance**:
   - Dashboard com métricas
   - Acompanhe pipeline da equipe
   - Relatórios de vendas

2. **Gestão de Equipe**:
   - Acompanhe conversões
   - Reatribua oportunidades
   - Configure pipelines

#### Para Admins:

1. **Configurações**:
   - Gestão de usuários e roles
   - Configuração de produtos
   - Setup WhatsApp

2. **Importações**:
   - Importar clientes em massa
   - Importar produtos
   - Sincronizações

---

## 📱 Recursos Principais

### 1. Sistema de Roles (RBAC)
- 5 roles: admin, manager, sales, warehouse, support
- Permissões granulares por tabela
- Functions SECURITY DEFINER para performance
- UI para gestão de usuários

### 2. Gestão de Clientes
- Cadastro completo (CNPJ, contatos, endereços)
- Histórico de compras
- Timeline de interações
- Importação CSV

### 3. Pipeline Visual (Kanban)
- Drag-and-drop entre etapas
- Customização de pipelines
- Cálculo automático de valores
- Histórico de mudanças

### 4. Integração WhatsApp
- Chat bidirecional em tempo real
- Gestão de múltiplas contas
- Templates e respostas rápidas
- Janela 24h automática
- Métricas de atendimento

### 5. Gestão de Produtos
- Catálogo completo
- Controle de estoque
- Histórico de movimentações
- Importação CSV

### 6. Segurança
- Autenticação JWT
- RLS policies em todas tabelas
- Criptografia de API keys
- Auditoria de ações

---

## 🏭 Deploy e Produção

### Deploy via Lovable

1. **Publicar**:
   - Clique em "Publish" no Lovable
   - URL: `https://<seu-projeto>.lovable.app`

2. **Domínio Customizado** (Plano Pago):
   - Vá em Project > Settings > Domains
   - Clique em "Connect Domain"
   - Siga as instruções de DNS

### Edge Functions

- Automaticamente deployadas com o projeto
- Logs disponíveis no Lovable Cloud
- Monitoramento de erros

### Banco de Dados

- Backups automáticos
- RLS garantindo segurança
- Migrations versionadas

### Monitoramento

1. **Backend**:
   - Acesse o backend do Lovable Cloud
   - Monitore logs de Edge Functions
   - Verifique métricas de banco

2. **Frontend**:
   - Console do navegador
   - Network requests
   - Errors tracking

---

## 📚 Referências

### Documentação Oficial
- [Lovable Docs](https://docs.lovable.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### APIs Externas
- [Gupshup WhatsApp API](https://docs.gupshup.io/docs/)

### Tecnologias
- [Vite](https://vitejs.dev/)
- [React Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

---

## 🤝 Contribuindo

Este é um projeto privado. Para mudanças:

1. Clone o repositório
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Add nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

---

## 📝 Licença

Todos os direitos reservados.

---

## ✨ Próximos Passos

### Curto Prazo
- [ ] Dashboard com gráficos (Fase 6)
- [ ] Relatórios exportáveis
- [ ] Notificações push
- [ ] App mobile (React Native)

### Médio Prazo
- [ ] Módulo de licitações (Fase 7)
- [ ] Integrações com marketplaces (Fase 8)
- [ ] CRM de suporte técnico
- [ ] BI e analytics avançados

### Longo Prazo
- [ ] IA para previsão de vendas
- [ ] Chatbot WhatsApp automatizado
- [ ] Integração com ERPs
- [ ] Multi-tenancy

---

**Desenvolvido com ❤️ usando Lovable**
