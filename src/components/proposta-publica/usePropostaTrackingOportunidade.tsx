import { useEffect, useRef, useCallback, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  let osName = 'Unknown';
  let osVersion = '';
  if (/Windows NT/i.test(ua)) {
    osName = 'Windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    osVersion = match ? match[1] : '';
  } else if (/Mac OS X/i.test(ua)) {
    osName = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/Android/i.test(ua)) {
    osName = 'Android';
    const match = ua.match(/Android (\d+\.?\d*)/);
    osVersion = match ? match[1] : '';
  } else if (/iOS|iPhone|iPad/i.test(ua)) {
    osName = 'iOS';
    const match = ua.match(/OS (\d+_\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
  }
  
  let browserName = 'Unknown';
  let browserVersion = '';
  if (/Chrome/i.test(ua) && !/Chromium|Edge/i.test(ua)) {
    browserName = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (/Firefox/i.test(ua)) {
    browserName = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browserName = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (/Edge/i.test(ua)) {
    browserName = 'Edge';
    const match = ua.match(/Edge\/(\d+)/);
    browserVersion = match ? match[1] : '';
  }
  
  return {
    device_type: deviceType,
    os_name: osName,
    os_version: osVersion,
    browser_name: browserName,
    browser_version: browserVersion,
    screen_width: window.screen.width,
    screen_height: window.screen.height
  };
}

// Inserir via Edge Function (para oportunidades)
async function insertAnalyticsViaEdge(data: {
  tokenId: string;
  oportunidadeId: string;
  sessionId: string;
  deviceInfo: ReturnType<typeof getDeviceInfo>;
}): Promise<{ id?: string; error?: string }> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/registrar-visualizacao-proposta`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          tokenId: data.tokenId,
          oportunidadeId: data.oportunidadeId,
          sessionId: data.sessionId,
          deviceInfo: data.deviceInfo
        }),
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error || 'Erro ao registrar' };
    }

    return { id: result.id };
  } catch (err) {
    console.error('❌ [insertAnalyticsViaEdge] Erro:', err);
    return { error: String(err) };
  }
}

// Inserir clique
async function insertClick(data: {
  analyticsId: string;
  tipoAcao: string;
  elementoId: string;
  secaoAtual: string;
  scrollPosition: number;
}): Promise<void> {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/propostas_analytics_cliques`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          analytics_id: data.analyticsId,
          tipo_acao: data.tipoAcao,
          elemento_id: data.elementoId,
          secao_atual: data.secaoAtual,
          scroll_position: data.scrollPosition
        }),
      }
    );
  } catch (err) {
    console.error('❌ [insertClick] Erro:', err);
  }
}

export function usePropostaTrackingOportunidade(tokenId: string, oportunidadeId: string) {
  const sessionId = useRef(generateSessionId());
  const [analyticsIdState, setAnalyticsIdState] = useState<string | null>(null);
  const hasRegistered = useRef(false);

  console.log('🚀 [usePropostaTrackingOportunidade] Hook iniciado:', { tokenId, oportunidadeId });

  // Registrar abertura da proposta
  useEffect(() => {
    if (!tokenId || !oportunidadeId) {
      console.log('⚠️ [usePropostaTrackingOportunidade] tokenId ou oportunidadeId ausente');
      return;
    }

    if (hasRegistered.current) {
      console.log('⚠️ [usePropostaTrackingOportunidade] Já registrado');
      return;
    }

    const registerView = async () => {
      hasRegistered.current = true;
      console.log('📊 [usePropostaTrackingOportunidade] Registrando visualização...');
      
      try {
        const deviceInfo = getDeviceInfo();
        
        const result = await insertAnalyticsViaEdge({
          tokenId,
          oportunidadeId,
          sessionId: sessionId.current,
          deviceInfo
        });

        if (result.error) {
          console.error('❌ [usePropostaTrackingOportunidade] Erro:', result.error);
          hasRegistered.current = false;
          return;
        }

        console.log('✅ [usePropostaTrackingOportunidade] Analytics registrado:', result.id);
        setAnalyticsIdState(result.id || null);
      } catch (err) {
        console.error('❌ [usePropostaTrackingOportunidade] Erro inesperado:', err);
        hasRegistered.current = false;
      }
    };

    registerView();
  }, [tokenId, oportunidadeId]);

  // Função para rastrear cliques
  const trackClick = useCallback((tipoAcao: string, elementoId: string) => {
    if (!analyticsIdState) {
      console.log('⚠️ [trackClick] Analytics ID não disponível');
      return;
    }

    const secaoAtual = document.querySelector('[data-section]:hover')?.getAttribute('data-section') || 'unknown';
    const scrollPosition = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);

    console.log('🖱️ [trackClick] Registrando clique:', { tipoAcao, elementoId, secaoAtual });

    insertClick({
      analyticsId: analyticsIdState,
      tipoAcao,
      elementoId,
      secaoAtual,
      scrollPosition
    });
  }, [analyticsIdState]);

  return {
    trackClick,
    analyticsId: analyticsIdState
  };
}
