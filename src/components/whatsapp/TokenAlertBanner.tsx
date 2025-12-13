import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TokenExpirando {
  id: string;
  nome_conta: string;
  provedor: string;
  token_expira_em: string | null;
  token_alertado_em: string | null;
  status_token: 'desconhecido' | 'expirado' | 'expirando' | 'ok';
  dias_restantes: number | null;
}

export function TokenAlertBanner() {
  const navigate = useNavigate();
  
  const { data: tokensExpirando } = useQuery({
    queryKey: ['whatsapp-tokens-expirando'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_whatsapp_tokens_expirando')
        .select('*');
      
      if (error) throw error;
      return data as TokenExpirando[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (!tokensExpirando || tokensExpirando.length === 0) {
    return null;
  }

  const expirados = tokensExpirando.filter(t => t.status_token === 'expirado');
  const expirando = tokensExpirando.filter(t => t.status_token === 'expirando');
  const desconhecidos = tokensExpirando.filter(t => t.status_token === 'desconhecido');

  if (expirados.length === 0 && expirando.length === 0 && desconhecidos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {expirados.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Token Expirado!</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {expirados.length === 1 
                ? `O token da conta "${expirados[0].nome_conta}" expirou.`
                : `${expirados.length} contas com tokens expirados.`
              }
              {' '}Renove o token no Meta Developer Console.
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/configuracoes')}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar Token
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {expirando.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Token Expirando</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span>
              {expirando.length === 1 
                ? `O token da conta "${expirando[0].nome_conta}" expira em ${Math.floor(expirando[0].dias_restantes || 0)} dias.`
                : `${expirando.length} contas com tokens expirando em breve.`
              }
            </span>
            <Button 
              variant="outline" 
              size="sm"
              className="border-amber-500 text-amber-700 hover:bg-amber-100"
              onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Meta Console
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {desconhecidos.length > 0 && expirados.length === 0 && expirando.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data de Expiração Desconhecida</AlertTitle>
          <AlertDescription>
            {desconhecidos.length === 1 
              ? `A conta "${desconhecidos[0].nome_conta}" não possui data de expiração configurada.`
              : `${desconhecidos.length} contas sem data de expiração configurada.`
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
