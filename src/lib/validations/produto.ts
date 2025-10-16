import { z } from "zod";

export const produtoSchema = z.object({
  referencia_interna: z
    .string()
    .min(1, "Referência interna é obrigatória")
    .max(100, "Referência interna muito longa")
    .transform((val) => val.trim()),
  
  nome: z
    .string()
    .min(1, "Nome do produto é obrigatório")
    .max(500, "Nome muito longo")
    .transform((val) => val.trim()),
  
  unidade_medida: z
    .string()
    .min(1, "Unidade de medida é obrigatória")
    .max(20, "Unidade de medida muito longa")
    .transform((val) => val.trim().toUpperCase()),
  
  preco_venda: z
    .number()
    .min(0, "Preço de venda não pode ser negativo")
    .max(999999999.99, "Preço de venda muito alto"),
  
  custo: z
    .number()
    .min(0, "Custo não pode ser negativo")
    .max(999999999.99, "Custo muito alto")
    .optional()
    .default(0),
  
  quantidade_em_maos: z
    .number()
    .min(0, "Quantidade não pode ser negativa")
    .optional()
    .default(0),
  
  ncm: z
    .string()
    .min(1, "NCM é obrigatório")
    .max(20, "NCM muito longo")
    .transform((val) => val.trim()),
  
  icms_sp_percent: z
    .number()
    .min(0, "ICMS não pode ser negativo")
    .max(100, "ICMS não pode ser maior que 100%")
    .optional()
    .default(0),
  
  aliquota_ipi: z
    .number()
    .min(0, "Alíquota IPI não pode ser negativa")
    .max(100, "Alíquota IPI não pode ser maior que 100%")
    .optional()
    .default(0),
  
  dtr: z
    .number()
    .min(0, "DTR não pode ser negativo")
    .optional()
    .default(0),
  
  lote_multiplo: z
    .number()
    .int("Lote múltiplo deve ser um número inteiro")
    .min(1, "Lote múltiplo deve ser no mínimo 1")
    .optional()
    .default(1),
  
  grupo_estoque: z
    .number()
    .int("Grupo de estoque deve ser um número inteiro")
    .optional()
    .default(0),
  
  qtd_cr: z
    .number()
    .int("Quantidade CR deve ser um número inteiro")
    .min(0, "Quantidade CR não pode ser negativa")
    .optional()
    .default(0),
  
  cod_trib_icms: z
    .string()
    .max(50, "Código tributário ICMS muito longo")
    .optional()
    .default("Tributado"),
  
  narrativa: z
    .string()
    .max(5000, "Narrativa muito longa")
    .optional()
    .or(z.literal("")),
  
  responsavel: z
    .string()
    .max(200, "Responsável muito longo")
    .optional()
    .or(z.literal("")),
  
  marcadores_produto: z
    .array(z.string().max(100))
    .optional()
    .default([]),
  
  previsao_chegada: z
    .date()
    .optional()
    .or(z.string().optional()),
  
  quantidade_prevista: z
    .number()
    .min(0, "Quantidade prevista não pode ser negativa")
    .optional()
    .default(0),
});

export type ProdutoInput = z.infer<typeof produtoSchema>;

// Schema para atualização (alguns campos podem ser opcionais)
export const produtoUpdateSchema = produtoSchema.partial();

// Validação para importação CSV
export const produtoImportSchema = produtoSchema
  .extend({
    // Para importação, podemos ter campos adicionais
  })
  .passthrough(); // Permite campos extras que serão filtrados

export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
