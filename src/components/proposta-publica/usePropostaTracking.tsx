import { useEffect, useRef, useCallback, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Gera ID único para sessão
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Detecta informações do dispositivo
function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  // Device type
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  // OS
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
  
  // Browser
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

const SECTION_NAMES: Record<string, string> = {
  'apresentacao': 'Apresentação',
  'escopo': 'Escopo/Observações',
  'precos': 'Tabela de Preços',
  'termos': 'Termos e Condições'
};

// Helper para fazer INSERT via REST API (funciona sem autenticação)
async function insertAnalytics(table: string, data: Record<string, unknown>): Promise<{ id?: string; error?: string }> {
  console.log(`🔄 [insertAnalytics] Tentando inserir em ${table}:`, data);
  console.log(`🔗 [insertAnalytics] URL: ${SUPABASE_URL}/rest/v1/${table}`);
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ [insertAnalytics] Variáveis de ambiente não definidas:', { SUPABASE_URL, SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'presente' : 'ausente' });
    return { error: 'Variáveis de ambiente não definidas' };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      }
    );

    console.log(`📡 [insertAnalytics] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [insertAnalytics] Erro ao inserir em ${table}:`, errorText);
      return { error: errorText };
    }

    const result = await response.json();
    console.log(`✅ [insertAnalytics] Sucesso em ${table}:`, result);
    return { id: result?.[0]?.id };
  } catch (err) {
    console.error(`❌ [insertAnalytics] Erro de rede ao inserir em ${table}:`, err);
    return { error: String(err) };
  }
}

// Fallback via Edge Function (usa SERVICE_ROLE_KEY)
async function insertAnalyticsViaEdge(data: {
  tokenId: string;
  vendaId: string;
  sessionId: string;
  deviceInfo: ReturnType<typeof getDeviceInfo>;
}): Promise<{ id?: string; error?: string }> {
  console.log(`🔄 [insertAnalyticsViaEdge] Tentando via Edge Function...`);
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/registrar-visualizacao-proposta`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [insertAnalyticsViaEdge] Erro:`, errorText);
      return { error: errorText };
    }

    const result = await response.json();
    console.log(`✅ [insertAnalyticsViaEdge] Sucesso:`, result);
    return { id: result?.id };
  } catch (err) {
    console.error(`❌ [insertAnalyticsViaEdge] Erro de rede:`, err);
    return { error: String(err) };
  }
}

export function usePropostaTracking(tokenId: string, vendaId: string) {
  const sessionId = useRef(generateSessionId());
  const [analyticsIdState, setAnalyticsIdState] = useState<string | null>(null);
  const sectionTimers = useRef<Map<string, number>>(new Map());
  const visibleSections = useRef<Set<string>>(new Set());
  const sectionTimeAccumulated = useRef<Map<string, number>>(new Map());
  const hasRegistered = useRef(false);

  console.log('🚀 [usePropostaTracking] Hook iniciado:', { tokenId, vendaId, hasRegistered: hasRegistered.current });

  // 1. Registrar abertura da proposta
  useEffect(() => {
    console.log('🔍 [usePropostaTracking] useEffect de registro executado:', { tokenId, vendaId, hasRegistered: hasRegistered.current });
    
    if (!tokenId || !vendaId) {
      console.log('⚠️ [usePropostaTracking] tokenId ou vendaId ausente, abortando');
      return;
    }

    if (hasRegistered.current) {
      console.log('⚠️ [usePropostaTracking] Já registrado, ignorando');
      return;
    }

    const registerView = async () => {
      hasRegistered.current = true;
      console.log('📊 [usePropostaTracking] Iniciando registro de visualização...');
      
      try {
        const deviceInfo = getDeviceInfo();
        console.log('📱 [usePropostaTracking] Device info:', deviceInfo);
        
        // Primeiro tenta via REST API direta
        let result = await insertAnalytics('propostas_analytics', {
          proposta_token_id: tokenId,
          venda_id: vendaId,
          session_id: sessionId.current,
          ...deviceInfo
        });

        // Se falhar, tenta via Edge Function (fallback)
        if (result.error) {
          console.log('⚠️ [usePropostaTracking] REST API falhou, tentando Edge Function...');
          result = await insertAnalyticsViaEdge({
            tokenId,
            vendaId,
            sessionId: sessionId.current,
            deviceInfo
          });
        }

        if (result.error) {
          console.error('❌ [usePropostaTracking] Ambos métodos falharam:', result.error);
          hasRegistered.current = false; // Permitir retry
          return;
        }

        setAnalyticsIdState(result.id || null);
        console.log('✅ [usePropostaTracking] Analytics ID salvo:', result.id);
      } catch (err) {
        console.error('❌ [usePropostaTracking] Erro no tracking:', err);
        hasRegistered.current = false; // Permitir retry
      }
    };

    registerView();
  }, [tokenId, vendaId]);

  // 2. IntersectionObserver para seções - depende do analyticsIdState
  useEffect(() => {
    console.log('👁️ [usePropostaTracking] useEffect do Observer:', { analyticsIdState });
    
    if (!analyticsIdState) {
      console.log('⚠️ [usePropostaTracking] analyticsIdState não disponível, Observer não iniciado');
      return;
    }

    console.log('🔭 [usePropostaTracking] Iniciando IntersectionObserver...');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const sectionId = entry.target.getAttribute('data-section');
          if (!sectionId) return;

          if (entry.isIntersecting) {
            // Começar a cronometrar
            sectionTimers.current.set(sectionId, Date.now());
            visibleSections.current.add(sectionId);
            console.log(`👁️ Seção visível: ${sectionId}`);
          } else if (visibleSections.current.has(sectionId)) {
            // Parar e acumular tempo
            const startTime = sectionTimers.current.get(sectionId);
            if (startTime) {
              const timeSpent = Math.round((Date.now() - startTime) / 1000);
              const accumulated = sectionTimeAccumulated.current.get(sectionId) || 0;
              sectionTimeAccumulated.current.set(sectionId, accumulated + timeSpent);
              console.log(`⏱️ Seção ${sectionId}: +${timeSpent}s (total: ${accumulated + timeSpent}s)`);
            }
            visibleSections.current.delete(sectionId);
            sectionTimers.current.delete(sectionId);
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observar todas as seções com pequeno delay para garantir DOM
    const timeoutId = setTimeout(() => {
      const sections = document.querySelectorAll('[data-section]');
      console.log(`🔭 [usePropostaTracking] Observando ${sections.length} seções`);
      sections.forEach(el => {
        observer.observe(el);
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [analyticsIdState]);

  // 3. Enviar dados ao sair da página
  useEffect(() => {
    const sendBeaconData = () => {
      if (!analyticsIdState) {
        console.log('⚠️ [sendBeaconData] analyticsIdState não disponível');
        return;
      }

      // Finalizar seções visíveis
      visibleSections.current.forEach(sectionId => {
        const startTime = sectionTimers.current.get(sectionId);
        if (startTime) {
          const timeSpent = Math.round((Date.now() - startTime) / 1000);
          const accumulated = sectionTimeAccumulated.current.get(sectionId) || 0;
          sectionTimeAccumulated.current.set(sectionId, accumulated + timeSpent);
        }
      });

      // Preparar dados das seções
      const secoesData = Array.from(sectionTimeAccumulated.current.entries()).map(
        ([secaoId, tempo]) => ({
          analytics_id: analyticsIdState,
          secao_id: secaoId,
          secao_nome: SECTION_NAMES[secaoId] || secaoId,
          tempo_visivel_segundos: tempo
        })
      );

      // Calcular tempo total
      const tempoTotal = Array.from(sectionTimeAccumulated.current.values())
        .reduce((sum, t) => sum + t, 0);

      // Usar sendBeacon para garantir envio
      if (secoesData.length > 0) {
        navigator.sendBeacon(
          `${SUPABASE_URL}/functions/v1/proposta-analytics-beacon`,
          JSON.stringify({
            analytics_id: analyticsIdState,
            action: 'session_end',
            tempo_total: tempoTotal,
            secoes: secoesData
          })
        );
        console.log('📤 Beacon enviado:', { tempoTotal, secoes: secoesData.length });
      }
    };

    const handleBeforeUnload = () => {
      sendBeaconData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendBeaconData();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [analyticsIdState]);

  // 4. Rastrear cliques
  const trackClick = useCallback(async (tipo: string, elemento?: string) => {
    if (!analyticsIdState) {
      console.log('⚠️ [trackClick] analyticsIdState não disponível');
      return;
    }

    try {
      await insertAnalytics('propostas_analytics_cliques', {
        analytics_id: analyticsIdState,
        tipo_acao: tipo,
        elemento_id: elemento,
        scroll_position: Math.round(window.scrollY)
      });
      console.log(`🖱️ Clique registrado: ${tipo}`);
    } catch (err) {
      console.error('Erro ao registrar clique:', err);
    }
  }, [analyticsIdState]);

  return { trackClick, analyticsId: analyticsIdState };
}
