# Exemplos de Uso das APIs

## Autenticação

Todas as APIs requerem autenticação via JWT token no header `Authorization`.

Para obter o token JWT:

```bash
# Login para obter o token
curl -X POST 'https://rzzzfprgnoywmmjwepzm.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enpmcHJnbm95d21tandlcHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTMxODksImV4cCI6MjA3NDgyOTE4OX0.GVeAOtDEqJeev7dnDyemdj-W5WXZJdWZo-wUcCXx4wc" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@exemplo.com",
    "password": "sua-senha"
  }'
```

A resposta incluirá o `access_token` que deve ser usado nas requisições.

---

## API de Clientes

### Endpoint
```
POST https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/cliente-api
```

### Criar Novo Cliente

```bash
curl -X POST 'https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/cliente-api' \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_abrev": "Cliente Exemplo LTDA",
    "cgc": "12345678000190",
    "email": "contato@exemplo.com",
    "email_financeiro": "financeiro@exemplo.com",
    "email_xml": "xml@exemplo.com",
    "telefone1": "(11) 99999-9999",
    "ins_estadual": "123456789",
    "cod_suframa": "12.345.678",
    "lim_credito": 50000.00,
    "observacoes": "Cliente VIP",
    "atividade": "Comércio",
    "coligada": "Matriz"
  }'
```

### Atualizar Cliente Existente

```bash
curl -X POST 'https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/cliente-api' \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "uuid-do-cliente",
    "nome_abrev": "Cliente Exemplo LTDA - Atualizado",
    "email": "novo-email@exemplo.com",
    "lim_credito": 75000.00
  }'
```

### Campos Disponíveis

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Não | ID do cliente (para atualização) |
| `nome_abrev` | String | Sim | Nome abreviado do cliente |
| `cgc` | String | Não | CNPJ/CPF |
| `email` ou `e_mail` | String | Não | Email principal |
| `email_financeiro` | String | Não | Email do financeiro |
| `email_xml` | String | Não | Email para receber XML |
| `telefone1` | String | Não | Telefone principal |
| `ins_estadual` | String | Não | Inscrição estadual |
| `cod_suframa` | String | Não | Código SUFRAMA |
| `lim_credito` | Decimal | Não | Limite de crédito (padrão: 0) |
| `observacoes` | Text | Não | Observações gerais |
| `atividade` | String | Não | Ramo de atividade |
| `coligada` | String | Não | Empresa coligada |

### Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "id": "uuid-do-cliente",
    "nome_abrev": "Cliente Exemplo LTDA",
    "cgc": "12345678000190",
    "e_mail": "contato@exemplo.com",
    "lim_credito": 50000.00,
    ...
  },
  "message": "Cliente criado com sucesso"
}
```

---

## API de Produtos

### Endpoint
```
POST https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/produto-api
```

### Criar Novo Produto

```bash
curl -X POST 'https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/produto-api' \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referencia_interna": "PROD-001",
    "nome": "Produto Exemplo",
    "unidade_medida": "UN",
    "preco_venda": 100.50,
    "ncm": "12345678",
    "custo": 50.25,
    "quantidade_em_maos": 100,
    "icms_sp_percent": 18,
    "aliquota_ipi": 5,
    "dtr": 10,
    "lote_multiplo": 1,
    "grupo_estoque": 1,
    "qtd_cr": 0,
    "cod_trib_icms": "Tributado",
    "narrativa": "Descrição detalhada do produto",
    "responsavel": "João Silva",
    "marcadores_produto": ["eletrônico", "nacional"],
    "quantidade_prevista": 50
  }'
```

### Atualizar Produto Existente

```bash
curl -X POST 'https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/produto-api' \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "uuid-do-produto",
    "referencia_interna": "PROD-001",
    "nome": "Produto Exemplo - Atualizado",
    "preco_venda": 120.00,
    "quantidade_em_maos": 150
  }'
```

### Campos Disponíveis

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Não | ID do produto (para atualização) |
| `referencia_interna` | String | Sim | Referência interna (max 100) |
| `nome` | String | Sim | Nome do produto (max 500) |
| `unidade_medida` | String | Sim | Unidade (ex: UN, KG, L) |
| `preco_venda` | Decimal | Sim | Preço de venda |
| `ncm` | String | Sim | Código NCM |
| `custo` | Decimal | Não | Custo (padrão: 0) |
| `quantidade_em_maos` | Decimal | Não | Estoque atual (padrão: 0) |
| `icms_sp_percent` | Decimal | Não | ICMS SP % (padrão: 0) |
| `aliquota_ipi` | Decimal | Não | Alíquota IPI % (padrão: 0) |
| `dtr` | Decimal | Não | DTR (padrão: 0) |
| `lote_multiplo` | Integer | Não | Lote múltiplo (padrão: 1) |
| `grupo_estoque` | Integer | Não | Grupo de estoque (padrão: 0) |
| `qtd_cr` | Integer | Não | Quantidade CR (padrão: 0) |
| `cod_trib_icms` | String | Não | Código trib ICMS (padrão: "Tributado") |
| `narrativa` | Text | Não | Descrição detalhada |
| `responsavel` | Text | Não | Responsável pelo produto |
| `marcadores_produto` | Array | Não | Tags do produto |
| `previsao_chegada` | Date | Não | Data prevista de chegada |
| `quantidade_prevista` | Decimal | Não | Quantidade prevista (padrão: 0) |

### Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "id": "uuid-do-produto",
    "referencia_interna": "PROD-001",
    "nome": "Produto Exemplo",
    "preco_venda": 100.50,
    "quantidade_em_maos": 100,
    ...
  },
  "message": "Produto criado com sucesso"
}
```

---

## Tratamento de Erros

### Erro 401 - Não Autenticado

```json
{
  "error": "Não autenticado"
}
```

**Solução**: Verifique se o token JWT está válido e não expirou.

### Erro 400 - Validação

```json
{
  "error": "Campo \"nome\" é obrigatório"
}
```

**Solução**: Verifique se todos os campos obrigatórios estão sendo enviados.

### Erro 500 - Erro Interno

```json
{
  "error": "mensagem de erro detalhada"
}
```

**Solução**: Verifique os logs da edge function para mais detalhes.

---

## Observações Importantes

1. **Campos Email**: A API de clientes aceita tanto `email` quanto `e_mail` no JSON, mas sempre salvará como `e_mail` no banco de dados.

2. **Unidade de Medida**: Sempre convertida para maiúsculas automaticamente.

3. **Valores Padrão**: Campos numéricos opcionais têm valores padrão (geralmente 0).

4. **Autenticação**: O token JWT expira após 1 hora. Você precisará fazer login novamente para obter um novo token.

5. **RLS**: As políticas de Row Level Security garantem que você só pode acessar seus próprios dados de clientes. Produtos são compartilhados entre todos os usuários.

---

## Testando com Postman/Insomnia

1. Configure a URL base: `https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1`
2. Adicione o header `Authorization: Bearer SEU_TOKEN`
3. Adicione o header `Content-Type: application/json`
4. Envie o body como JSON raw
5. Use o método POST

---

## Exemplos de Integração

### JavaScript/TypeScript

```typescript
const token = 'seu-jwt-token';

async function criarCliente(cliente: any) {
  const response = await fetch('https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/cliente-api', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cliente)
  });
  
  return await response.json();
}
```

### Python

```python
import requests

token = 'seu-jwt-token'
url = 'https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/cliente-api'

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

cliente = {
    'nome_abrev': 'Cliente Teste',
    'cgc': '12345678000190',
    'email': 'teste@exemplo.com'
}

response = requests.post(url, json=cliente, headers=headers)
print(response.json())
```
