# 🔐 FASE 0: Etapa 0.2 - Validação de Inputs (EM PROGRESSO)

## ✅ Schemas Zod Criados

### 1. **Autenticação** (`/src/lib/validations/auth.ts`)

#### `loginSchema`
- ✅ Email: obrigatório, formato válido, máximo 255 caracteres
- ✅ Password: obrigatório, mínimo 6 caracteres, máximo 72 caracteres

#### `signupSchema`
- ✅ Email: obrigatório, formato válido, máximo 255 caracteres
- ✅ Password: 
  - Mínimo 8 caracteres
  - Máximo 72 caracteres
  - Pelo menos 1 letra maiúscula
  - Pelo menos 1 letra minúscula
  - Pelo menos 1 número
- ✅ Confirmação de senha: deve coincidir com a senha

---

### 2. **Clientes** (`/src/lib/validations/cliente.ts`)

#### `clienteSchema`
- ✅ Nome abreviado: obrigatório, máximo 200 caracteres, trim
- ✅ CNPJ/CPF: opcional, formato validado (00.000.000/0000-00 ou 000.000.000-00)
- ✅ Emails (principal, financeiro, XML): formato validado, máximo 255 caracteres
- ✅ Telefone: máximo 20 caracteres
- ✅ Limite de crédito: não negativo, máximo 999.999.999,99
- ✅ Observações: máximo 5000 caracteres
- ✅ Outros campos com limites apropriados

#### `clienteImportSchema`
- ✅ Estende `clienteSchema` com `.passthrough()` para permitir campos extras em CSV

---

### 3. **Produtos** (`/src/lib/validations/produto.ts`)

#### `produtoSchema`
- ✅ Referência interna: obrigatório, máximo 100 caracteres, trim
- ✅ Nome: obrigatório, máximo 500 caracteres, trim
- ✅ Unidade de medida: obrigatório, máximo 20 caracteres, uppercase, trim
- ✅ Preço de venda: não negativo, máximo 999.999.999,99
- ✅ Custo: não negativo, máximo 999.999.999,99
- ✅ NCM: obrigatório, máximo 20 caracteres
- ✅ ICMS SP: entre 0 e 100%
- ✅ Alíquota IPI: entre 0 e 100%
- ✅ Lote múltiplo: inteiro, mínimo 1
- ✅ Quantidade em mãos: não negativa
- ✅ Narrativa: máximo 5000 caracteres

#### `produtoUpdateSchema`
- ✅ Versão parcial do `produtoSchema` para atualizações

#### `produtoImportSchema`
- ✅ Estende `produtoSchema` com `.passthrough()` para CSV

---

### 4. **Vendas** (`/src/lib/validations/venda.ts`)

#### `vendaItemSchema`
- ✅ Produto ID: UUID válido
- ✅ Quantidade: positiva, máximo 999.999
- ✅ Preço unitário: não negativo, máximo 999.999.999,99
- ✅ Desconto: entre 0 e 100%
- ✅ Valor total: não negativo, máximo 999.999.999,99

#### `vendaSchema`
- ✅ Cliente nome: obrigatório, máximo 200 caracteres, trim
- ✅ Cliente CNPJ: máximo 20 caracteres
- ✅ Número da venda: obrigatório, máximo 50 caracteres, trim
- ✅ Tipo pedido, frete, condição pagamento: UUIDs válidos
- ✅ Valores: não negativos, limites apropriados
- ✅ Desconto: entre 0 e 100%
- ✅ Observações: máximo 5000 caracteres

#### `vendaComItensSchema`
- ✅ Combina `vendaSchema` com array de `vendaItemSchema`
- ✅ Requer pelo menos 1 item na venda

---

## ✅ Implementações Concluídas

### **Formulário de Autenticação** (`src/pages/Auth.tsx`)

**Implementado:**
- ✅ React Hook Form integrado
- ✅ Validação com Zod (loginSchema e signupSchema)
- ✅ Mensagens de erro amigáveis e em português
- ✅ Validação em tempo real
- ✅ Feedback visual com componente Alert
- ✅ Separação clara entre login e signup
- ✅ Reset automático do formulário após signup bem-sucedido
- ✅ Senhas fortes obrigatórias (maiúscula, minúscula, número)
- ✅ Confirmação de senha com validação

**Benefícios:**
- Previne emails inválidos
- Garante senhas seguras
- Previne cadastro com senhas não coincidentes
- Melhor experiência do usuário com feedback imediato

---

## ⏳ Pendente de Implementação

### 1. **Formulário de Clientes** (Prioridade: Alta)
- [ ] Aplicar `clienteSchema` em criação/edição
- [ ] Validar CNPJ/CPF com regex
- [ ] Validar emails (principal, financeiro, XML)
- [ ] Limitar tamanhos de campos
- [ ] Aplicar `clienteImportSchema` na importação CSV

### 2. **Formulário de Produtos** (Prioridade: Alta)
- [ ] Aplicar `produtoSchema` em criação/edição
- [ ] Validar preços e custos
- [ ] Validar percentuais (ICMS, IPI)
- [ ] Validar lote múltiplo (inteiro positivo)
- [ ] Aplicar `produtoImportSchema` na importação CSV

### 3. **Formulário de Vendas/Pedidos** (Prioridade: Alta)
- [ ] Aplicar `vendaSchema` no PedidoForm
- [ ] Aplicar `vendaItemSchema` em itens
- [ ] Validar valor total = soma dos itens
- [ ] Validar desconto não excede valor total
- [ ] Validar pelo menos 1 item

### 4. **Importação CSV** (Prioridade: Média)
- [ ] ImportarProdutos: validar cada linha com `produtoImportSchema`
- [ ] ImportarClientes: validar cada linha com `clienteImportSchema`
- [ ] Exibir erros de validação por linha
- [ ] Permitir corrigir erros antes de importar
- [ ] Preview com destaque de erros

### 5. **Sanitização de HTML** (Prioridade: Baixa)
- [ ] Implementar DOMPurify se necessário
- [ ] Sanitizar campos de texto livre (observações, narrativa)
- [ ] Prevenir XSS em campos de texto

---

## 📊 Progresso Geral

| Componente | Schema | Implementação | Status |
|-----------|--------|---------------|--------|
| Auth (Login) | ✅ | ✅ | ✅ Completo |
| Auth (Signup) | ✅ | ✅ | ✅ Completo |
| Clientes | ✅ | ⏳ | 50% |
| Produtos | ✅ | ⏳ | 50% |
| Vendas | ✅ | ⏳ | 50% |
| Import Produtos | ✅ | ⏳ | 40% |
| Import Clientes | ✅ | ⏳ | 40% |

**Progresso Total**: ~45%

---

## 🔍 Como Usar os Schemas

### Exemplo 1: Validação em Formulário com React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clienteSchema, ClienteInput } from "@/lib/validations/cliente";

function ClienteForm() {
  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome_abrev: "",
      cgc: "",
      lim_credito: 0,
    },
  });

  const onSubmit = (data: ClienteInput) => {
    // Dados já validados!
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("nome_abrev")} />
      {form.formState.errors.nome_abrev && (
        <span>{form.formState.errors.nome_abrev.message}</span>
      )}
      {/* ... outros campos */}
    </form>
  );
}
```

### Exemplo 2: Validação Programática

```typescript
import { produtoSchema } from "@/lib/validations/produto";

const validarProduto = (data: unknown) => {
  try {
    const resultado = produtoSchema.parse(data);
    return { sucesso: true, data: resultado };
  } catch (error) {
    return { sucesso: false, erros: error.errors };
  }
};
```

### Exemplo 3: Validação de CSV

```typescript
import { produtoImportSchema } from "@/lib/validations/produto";

const validarCSV = (linhas: any[]) => {
  const resultados = linhas.map((linha, index) => {
    try {
      const dadosValidos = produtoImportSchema.parse(linha);
      return { linha: index + 1, sucesso: true, dados: dadosValidos };
    } catch (error) {
      return { linha: index + 1, sucesso: false, erros: error.errors };
    }
  });

  const erros = resultados.filter(r => !r.sucesso);
  const validos = resultados.filter(r => r.sucesso);

  return { erros, validos };
};
```

---

## 🎯 Próximos Passos

### Etapa 0.2 - Continuação (Esta Semana)
1. ✅ ~~Criar schemas Zod~~ - FEITO
2. ✅ ~~Implementar validação em Auth~~ - FEITO
3. ⏳ Implementar validação em Clientes - PRÓXIMO
4. ⏳ Implementar validação em Produtos
5. ⏳ Implementar validação em Vendas
6. ⏳ Implementar validação em Importações CSV

### Etapa 0.3 - Refatoração (Próxima Semana)
- [ ] Auditoria completa (tabela de logs)
- [ ] Criptografia de campos sensíveis (opcional)
- [ ] Políticas adicionais de segurança

---

## 📚 Referências

- **Zod Documentation**: https://zod.dev/
- **React Hook Form**: https://react-hook-form.com/
- **Validação de CPF/CNPJ**: Regex simplificado (apenas formato)
- **OWASP Input Validation**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

---

✨ **Etapa 0.2 em progresso! Autenticação segura implementada com sucesso.**

**Status**: 45% concluída | **Próximo**: Validar formulários de Clientes e Produtos
