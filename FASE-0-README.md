# 🔐 FASE 0: Fundação (Segurança) - CONCLUÍDA

## ✅ Etapa 0.1: Sistema de Permissões (RBAC) - IMPLEMENTADO

### Estrutura Criada

#### 1. **Database** ✓
- ✅ Enum `app_role` com 5 roles: admin, manager, sales, warehouse, support
- ✅ Tabela `user_roles` com RLS habilitado
- ✅ Função `has_role()` (SECURITY DEFINER - evita recursão RLS)
- ✅ Função `has_any_role()` para verificar múltiplos roles
- ✅ Função `get_user_roles()` para obter roles sem expor auth.users
- ✅ Função `list_users_with_roles()` (apenas admins)
- ✅ Políticas RLS atualizadas em:
  - `produtos` (admins/managers gerenciam, sales/warehouse visualizam)
  - `estoque` (admins gerenciam, warehouse insere, todos visualizam com restrições)
  - `condicoes_pagamento`, `tipos_frete`, `tipos_pedido` (apenas admins modificam)
  - `vendas` (admins/managers/sales podem criar)

#### 2. **Frontend** ✓
- ✅ Hook `useRoles()` com:
  - Consulta de roles do usuário atual
  - Flags: `isAdmin`, `isManager`, `isSales`, `isWarehouse`, `isSupport`
  - Função `hasRole(role)` para verificação
  - Listagem de todos os usuários (admin only)
  - Mutations: `addRole`, `removeRole`

- ✅ Página `/usuarios` (Admin Only):
  - Tabela de todos os usuários
  - Badges coloridos por role
  - Adicionar/remover roles
  - Proteção: apenas admins acessam
  - UI intuitiva com cores por role

- ✅ Menu atualizado:
  - Item "Usuários" com ícone Shield
  - Visível apenas para admins
  - Filtro automático baseado em `isAdmin`

#### 3. **Segurança** ✓
- ✅ Corrigido: Auth users exposed via view
- ✅ Corrigido: Security definer view
- ✅ Configurado: Auto-confirm email habilitado
- ⚠️ Pendente: Leaked password protection (ativar manualmente no Lovable Cloud)

---

## 📋 Roles e Permissões

| Role | Descrição | Permissões |
|------|-----------|------------|
| **Admin** | Acesso total | ✓ Tudo |
| **Manager** | Gerente | ✓ Produtos, Estoque (view), Relatórios, Vendas |
| **Sales** | Vendedor | ✓ Clientes, Vendas, Produtos (view sem custos), Estoque (view) |
| **Warehouse** | Estoquista | ✓ Estoque (insert), Produtos (view) |
| **Support** | Suporte | ✓ Tickets, Atendimento (futura implementação) |

---

## 🚀 Como Usar

### 1. **Atribuir Primeiro Admin**

Execute no SQL Editor do Lovable Cloud:

```sql
-- Substituir 'seu-email@exemplo.com' pelo email do primeiro admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'seu-email@exemplo.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.users.id AND ur.role = 'admin'
  );
```

<lov-actions>
  <lov-open-backend>Abrir Backend</lov-open-backend>
</lov-actions>

### 2. **Gerenciar Roles de Outros Usuários**

1. Faça login como admin
2. Acesse `/usuarios` no menu
3. Selecione o role desejado para cada usuário
4. Clique em "+" para adicionar
5. Clique no "X" no badge para remover

### 3. **Verificar Permissões no Código**

```typescript
import { useRoles } from "@/hooks/useRoles";

function MyComponent() {
  const { isAdmin, hasRole, isSales } = useRoles();

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div>
      {hasRole("manager") && <ManagerTools />}
      {isSales && <SalesPanel />}
    </div>
  );
}
```

---

## ⚠️ Importantes

### **Proteção de Senhas Vazadas**
Ative manualmente no Lovable Cloud:
1. Abra o Backend
2. Vá em Authentication → Policies
3. Habilite "Leaked Password Protection"

<lov-actions>
  <lov-open-backend>View Backend</lov-open-backend>
</lov-actions>

### **Logout Necessário**
Após adicionar/remover roles, os usuários devem fazer logout e login novamente para as permissões serem aplicadas.

### **Políticas RLS**
- Produtos: apenas admins/managers podem criar/editar
- Estoque: apenas admins podem deletar, warehouse pode inserir
- Vendas: apenas roles de vendas podem criar

---

## 🎯 Próximos Passos

### **Etapa 0.2: Validação de Inputs (Pendente)**
- [ ] Schemas Zod para Auth
- [ ] Schemas Zod para Clientes
- [ ] Schemas Zod para Produtos
- [ ] Schemas Zod para Vendas
- [ ] Componentes de formulário reutilizáveis

### **Etapa 0.3: Refatoração Adicional (Pendente)**
- [ ] Criptografia de campos sensíveis (opcional)
- [ ] Audit logging (tabela de auditoria)
- [ ] Políticas adicionais para enderecos_clientes

---

## 📊 Status da Fase 0

- ✅ **Etapa 0.1**: Sistema RBAC - **CONCLUÍDA**
- ⏳ **Etapa 0.2**: Validação de Inputs - **PENDENTE**
- ⏳ **Etapa 0.3**: Refatoração - **PENDENTE**

**Progresso Geral**: 33% (1 de 3 etapas concluídas)

---

## 🔍 Testes Realizados

- ✅ Criação de roles
- ✅ Remoção de roles
- ✅ Filtragem de menu por role
- ✅ Proteção de rotas (admin only)
- ✅ RLS policies funcionando
- ✅ Sem recursão em políticas

---

## 📚 Documentação Técnica

### Funções SQL

**`has_role(_user_id UUID, _role app_role)`**
- Retorna: BOOLEAN
- Uso: Verificar se usuário possui role específico
- Exemplo: `public.has_role(auth.uid(), 'admin')`

**`has_any_role(_user_id UUID, _roles app_role[])`**
- Retorna: BOOLEAN
- Uso: Verificar se usuário possui ao menos um dos roles
- Exemplo: `public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])`

**`get_user_roles(_user_id UUID)`**
- Retorna: TABLE (user_id, email, roles[], is_admin, is_manager, is_sales, is_warehouse, is_support)
- Uso: Obter todos os roles de um usuário
- Segurança: SECURITY DEFINER, não expõe auth.users

**`list_users_with_roles()`**
- Retorna: TABLE (user_id, email, roles[])
- Uso: Listar todos os usuários (apenas admins)
- Segurança: Verifica se usuário atual é admin

---

✨ **Fase 0 - Etapa 0.1 concluída com sucesso!**
