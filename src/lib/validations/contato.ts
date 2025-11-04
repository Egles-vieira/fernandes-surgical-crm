import { z } from "zod";

// Schema completo de contato com todos os campos do CRM
export const contatoSchema = z.object({
  // Informações Básicas
  nome: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  tratamento: z.enum(["Sr.", "Sra.", "Dr.", "Dra.", "Prof.", "Eng.", ""]).optional(),
  cargo: z.string().max(100, "Cargo muito longo").optional().or(z.literal("")),
  departamento: z.string().max(100, "Departamento muito longo").optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  
  // Contato & Comunicação
  email: z.string().email("Email inválido").max(255, "Email muito longo").optional().or(z.literal("")),
  telefone: z.string().max(20, "Telefone muito longo").optional().or(z.literal("")),
  celular: z.string().max(20, "Celular muito longo").optional().or(z.literal("")),
  whatsapp_numero: z.string().max(20, "WhatsApp muito longo").optional().or(z.literal("")),
  
  // Redes Sociais
  linkedin_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
  twitter_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
  facebook_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
  instagram_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
  skype_id: z.string().max(100).optional().or(z.literal("")),
  
  // Preferências
  preferencia_contato: z.enum(["email", "telefone", "whatsapp", "linkedin", ""]).optional(),
  idioma_preferido: z.string().max(10).optional().or(z.literal("")),
  timezone: z.string().max(50).optional().or(z.literal("")),
  melhor_horario_contato: z.string().max(100).optional().or(z.literal("")),
  frequencia_contato_preferida: z.enum(["diaria", "semanal", "quinzenal", "mensal", ""]).optional(),
  
  // LGPD & Consentimentos
  consentimento_lgpd: z.boolean().optional().default(false),
  data_consentimento_lgpd: z.string().optional().or(z.literal("")),
  aceita_marketing: z.boolean().optional().default(false),
  
  // Qualificação & Vendas (BANT)
  nivel_autoridade: z.enum(["decisor", "influenciador", "usuario_final", "bloqueador", ""]).optional(),
  budget_estimado: z.number().min(0).optional(),
  timeline_decisao: z.string().max(100).optional().or(z.literal("")),
  necessidade_identificada: z.string().max(500).optional().or(z.literal("")),
  score_qualificacao: z.number().min(0).max(100).optional(),
  
  // Relacionamento & Hierarquia
  relacionamento_com: z.string().uuid().optional().or(z.literal("")), // ID de outro contato
  ultimo_contato: z.string().optional().or(z.literal("")),
  proximo_followup: z.string().optional().or(z.literal("")),
  
  // Enrichment & Tracking
  origem_lead: z.string().max(100).optional().or(z.literal("")),
  campanha_origem: z.string().max(200).optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([]),
  interesses: z.array(z.string()).optional().default([]),
  
  // Textos Longos
  dores_identificadas: z.string().max(2000).optional().or(z.literal("")),
  objetivos_profissionais: z.string().max(2000).optional().or(z.literal("")),
  observacoes: z.string().max(5000).optional().or(z.literal("")),
  
  // Relacionamento com cliente
  cliente_id: z.string().uuid().optional(),
  conta_id: z.string().uuid().optional(),
  
  // Status
  esta_ativo: z.boolean().optional().default(true),
  status_lead: z.enum(["novo", "qualificado", "oportunidade", "cliente", "perdido", ""]).optional(),
  estagio_ciclo_vida: z.enum(["lead", "mql", "sql", "oportunidade", "cliente", "evangelista", ""]).optional(),
});

export type ContatoInput = z.infer<typeof contatoSchema>;
