import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function usePropostaTracking(tokenId: string, vendaId: string) {
  const sessionId = useRef(generateSessionId());
  const analyticsId = useRef<string | null>(null);
  const sectionTimers = useRef<Map<string, number>>(new Map());
  const visibleSections = useRef<Set<string>>(new Set());
  const sectionTimeAccumulated = useRef<Map<string, number>>(new Map());

  // 1. Registrar abertura da proposta
  useEffect(() => {
    if (!tokenId || !vendaId) return;

    const registerView = async () => {
      try {
        const deviceInfo = getDeviceInfo();
        
        const { data, error } = await supabase
          .from('propostas_analytics')
          .insert({
            proposta_token_id: tokenId,
            venda_id: vendaId,
            session_id: sessionId.current,
            ...deviceInfo
          })
          .select('id')
          .single();

        if (error) {
          console.error('Erro ao registrar visualização:', error);
          return;
        }

        analyticsId.current = data?.id || null;
        console.log('📊 Analytics iniciado:', analyticsId.current);
      } catch (err) {
        console.error('Erro no tracking:', err);
      }
    };

    registerView();
  }, [tokenId, vendaId]);

  // 2. IntersectionObserver para seções
  useEffect(() => {
    if (!analyticsId.current) return;

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

    // Observar todas as seções
    setTimeout(() => {
      document.querySelectorAll('[data-section]').forEach(el => {
        observer.observe(el);
      });
    }, 100);

    return () => observer.disconnect();
  }, []);

  // 3. Enviar dados ao sair da página
  useEffect(() => {
    const sendBeaconData = () => {
      if (!analyticsId.current) return;

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
          analytics_id: analyticsId.current,
          secao_id: secaoId,
          secao_nome: SECTION_NAMES[secaoId] || secaoId,
          tempo_visivel_segundos: tempo
        })
      );

      // Calcular tempo total
      const tempoTotal = Array.from(sectionTimeAccumulated.current.values())
        .reduce((sum, t) => sum + t, 0);

      // Usar sendBeacon para garantir envio
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      
      if (secoesData.length > 0) {
        navigator.sendBeacon(
          `${SUPABASE_URL}/functions/v1/proposta-analytics-beacon`,
          JSON.stringify({
            analytics_id: analyticsId.current,
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
  }, []);

  // 4. Rastrear cliques
  const trackClick = useCallback(async (tipo: string, elemento?: string) => {
    if (!analyticsId.current) return;

    try {
      await supabase.from('propostas_analytics_cliques').insert({
        analytics_id: analyticsId.current,
        tipo_acao: tipo,
        elemento_id: elemento,
        scroll_position: Math.round(window.scrollY)
      });
      console.log(`🖱️ Clique registrado: ${tipo}`);
    } catch (err) {
      console.error('Erro ao registrar clique:', err);
    }
  }, []);

  return { trackClick, analyticsId: analyticsId.current };
}
