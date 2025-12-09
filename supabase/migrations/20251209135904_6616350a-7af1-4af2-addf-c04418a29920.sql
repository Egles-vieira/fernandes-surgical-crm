-- Conceder permissões de INSERT/UPDATE para role anon nas tabelas de analytics (propostas públicas)
GRANT INSERT ON public.propostas_analytics TO anon;
GRANT INSERT ON public.propostas_analytics_cliques TO anon;
GRANT INSERT ON public.propostas_analytics_secoes TO anon;
GRANT UPDATE ON public.propostas_analytics TO anon;
GRANT UPDATE ON public.propostas_analytics_secoes TO anon;

-- Garantir que role authenticated tenha SELECT para visualizar na timeline
GRANT SELECT ON public.propostas_analytics TO authenticated;
GRANT SELECT ON public.propostas_analytics_cliques TO authenticated;
GRANT SELECT ON public.propostas_analytics_secoes TO authenticated;
GRANT SELECT ON public.propostas_respostas TO authenticated;