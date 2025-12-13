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
  const {
    data: tokensExpirando
  } = useQuery({
    queryKey: ['whatsapp-tokens-expirando'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('vw_whatsapp_tokens_expirando').select('*');
      if (error) throw error;
      return data as TokenExpirando[];
    },
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
  if (!tokensExpirando || tokensExpirando.length === 0) {
    return null;
  }

  // Conta global - pegar apenas a primeira (única) conta
  const contaGlobal = tokensExpirando[0];
  if (!contaGlobal) return null;
  return <div className="space-y-2">
      {contaGlobal.status_token === 'expirado' && <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Token Expirado!</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              O token da conta WhatsApp expirou. Renove no Meta Developer Console.
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate('/configuracoes')}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar Token
            </Button>
          </AlertDescription>
        </Alert>}

      {contaGlobal.status_token === 'expirando' && <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Token Expirando</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span>
              O token expira em {Math.floor(contaGlobal.dias_restantes || 0)} dias. Renove antes do vencimento.
            </span>
            <Button variant="outline" size="sm" className="border-amber-500 text-amber-700 hover:bg-amber-100" onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Meta Console
            </Button>
          </AlertDescription>
        </Alert>}

      {contaGlobal.status_token === 'desconhecido'}
    </div>;
}