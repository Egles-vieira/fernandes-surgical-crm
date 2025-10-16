import { z } from "zod";

export const vendaItemSchema = z.object({
  produto_id: z.string().uuid("Produto inválido"),
  
  quantidade: z
    .number()
    .positive("Quantidade deve ser maior que zero")
    .max(999999, "Quantidade muito alta"),
  
  preco_unitario: z
    .number()
    .min(0, "Preço unitário não pode ser negativo")
    .max(999999999.99, "Preço unitário muito alto"),
  
  desconto: z
    .number()
    .min(0, "Desconto não pode ser negativo")
    .max(100, "Desconto não pode ser maior que 100%")
    .optional()
    .default(0),
  
  valor_total: z
    .number()
    .min(0, "Valor total não pode ser negativo")
    .max(999999999.99, "Valor total muito alto"),
});

export const vendaSchema = z.object({
  cliente_nome: z
    .string()
    .min(1, "Nome do cliente é obrigatório")
    .max(200, "Nome do cliente muito longo")
    .transform((val) => val.trim()),
  
  cliente_cnpj: z
    .string()
    .max(20, "CNPJ muito longo")
    .optional()
    .or(z.literal("")),
  
  numero_venda: z
    .string()
    .min(1, "Número da venda é obrigatório")
    .max(50, "Número da venda muito longo")
    .transform((val) => val.trim()),
  
  tipo_pedido_id: z
    .string()
    .uuid("Tipo de pedido inválido")
    .optional(),
  
  tipo_frete_id: z
    .string()
    .uuid("Tipo de frete inválido")
    .optional(),
  
  condicao_pagamento_id: z
    .string()
    .uuid("Condição de pagamento inválida")
    .optional(),
  
  valor_total: z
    .number()
    .min(0, "Valor total não pode ser negativo")
    .max(999999999.99, "Valor total muito alto"),
  
  desconto: z
    .number()
    .min(0, "Desconto não pode ser negativo")
    .max(100, "Desconto não pode ser maior que 100%")
    .optional()
    .default(0),
  
  valor_final: z
    .number()
    .min(0, "Valor final não pode ser negativo")
    .max(999999999.99, "Valor final muito alto"),
  
  observacoes: z
    .string()
    .max(5000, "Observações muito longas")
    .optional()
    .or(z.literal("")),
  
  status: z
    .string()
    .max(50, "Status inválido")
    .optional()
    .default("rascunho"),
  
  // Novos campos do pipeline
  etapa_pipeline: z
    .enum(["prospeccao", "qualificacao", "proposta", "negociacao", "fechamento", "ganho", "perdido"])
    .optional()
    .default("prospeccao"),
  
  valor_estimado: z
    .number()
    .min(0, "Valor estimado não pode ser negativo")
    .optional()
    .default(0),
  
  probabilidade: z
    .number()
    .min(0, "Probabilidade mínima é 0%")
    .max(100, "Probabilidade máxima é 100%")
    .optional()
    .default(50),
  
  data_fechamento_prevista: z
    .date()
    .optional()
    .or(z.string().optional()),
  
  motivo_perda: z
    .string()
    .max(1000, "Motivo muito longo")
    .optional()
    .or(z.literal("")),
  
  origem_lead: z
    .string()
    .max(200, "Origem muito longa")
    .optional()
    .or(z.literal("")),
  
  responsavel_id: z
    .string()
    .uuid("Responsável inválido")
    .optional(),
});

export type VendaInput = z.infer<typeof vendaSchema>;
export type VendaItemInput = z.infer<typeof vendaItemSchema>;

// Schema completo para criar venda com itens
export const vendaComItensSchema = z.object({
  venda: vendaSchema,
  itens: z
    .array(vendaItemSchema)
    .min(1, "A venda deve ter pelo menos um item"),
});

export type VendaComItensInput = z.infer<typeof vendaComItensSchema>;
