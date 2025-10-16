import { z } from "zod";

// Validação de CNPJ (apenas formato)
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

// Validação de CPF (apenas formato)
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const clienteSchema = z.object({
  nome_abrev: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(200, "Nome muito longo")
    .transform((val) => val.trim()),
  
  cgc: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return cnpjRegex.test(val) || cpfRegex.test(val);
    }, "CNPJ/CPF inválido (formato: 00.000.000/0000-00 ou 000.000.000-00)"),
  
  email: z
    .string()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .optional()
    .or(z.literal("")),
  
  email_financeiro: z
    .string()
    .email("Email financeiro inválido")
    .max(255, "Email muito longo")
    .optional()
    .or(z.literal("")),
  
  email_xml: z
    .string()
    .email("Email XML inválido")
    .max(255, "Email muito longo")
    .optional()
    .or(z.literal("")),
  
  telefone1: z
    .string()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("")),
  
  ins_estadual: z
    .string()
    .max(50, "Inscrição estadual muito longa")
    .optional()
    .or(z.literal("")),
  
  cod_suframa: z
    .string()
    .max(50, "Código SUFRAMA muito longo")
    .optional()
    .or(z.literal("")),
  
  lim_credito: z
    .number()
    .min(0, "Limite de crédito não pode ser negativo")
    .max(999999999.99, "Limite de crédito muito alto")
    .optional()
    .default(0),
  
  observacoes: z
    .string()
    .max(5000, "Observações muito longas")
    .optional()
    .or(z.literal("")),
  
  atividade: z
    .string()
    .max(200, "Atividade muito longa")
    .optional()
    .or(z.literal("")),
  
  coligada: z
    .string()
    .max(100, "Coligada muito longa")
    .optional()
    .or(z.literal("")),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

// Validação para importação CSV
export const clienteImportSchema = clienteSchema.extend({
  // Para importação, alguns campos podem ser obrigatórios ou ter regras diferentes
}).passthrough(); // Permite campos extras que serão filtrados
