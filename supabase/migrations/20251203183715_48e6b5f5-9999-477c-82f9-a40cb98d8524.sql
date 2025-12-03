-- Inserir 2000 vendas de teste com distribuição temporal e de pipeline
INSERT INTO vendas (
  numero_venda,
  cliente_id,
  cliente_nome,
  cliente_cnpj,
  cod_emitente,
  tipo_pedido_id,
  endereco_entrega_id,
  user_id,
  vendedor_id,
  valor_total,
  desconto,
  valor_final,
  status,
  etapa_pipeline,
  data_venda,
  created_at
)
SELECT 
  'TESTE-' || LPAD(i::text, 5, '0'),
  'ebdea6e9-c6be-40ed-8b01-2611e385c9fb'::uuid,
  'INTERMEDICA SISTEMA DE SAUDE S A',
  '44649812019238',
  29586,
  '2ad4bdc8-580e-4a8d-b5de-39499f665bab'::uuid,
  '1468a0bd-34b3-4b77-83c0-7a3006e100ba'::uuid,
  '1424809f-3738-4031-864e-59416c93502c'::uuid,
  '1424809f-3738-4031-864e-59416c93502c'::uuid,
  43.47,
  25.65,
  17.82,
  'rascunho',
  (ARRAY['prospeccao','qualificacao','proposta','negociacao','fechamento'])[(i % 5) + 1]::etapa_pipeline,
  NOW() - (random() * INTERVAL '90 days'),
  NOW() - (random() * INTERVAL '90 days')
FROM generate_series(1, 2000) AS i;

-- Inserir 2000 itens (um por venda)
INSERT INTO vendas_itens (
  venda_id,
  produto_id,
  quantidade,
  preco_unitario,
  preco_tabela,
  desconto,
  valor_total,
  sequencia_item
)
SELECT 
  v.id,
  '640afce0-0b72-4b54-b2da-aabeae8e8068'::uuid,
  1,
  43.47,
  43.47,
  25.65,
  17.82,
  1
FROM vendas v
WHERE v.numero_venda LIKE 'TESTE-%';

-- Atualizar estatísticas para otimizar índices
ANALYZE vendas;
ANALYZE vendas_itens;