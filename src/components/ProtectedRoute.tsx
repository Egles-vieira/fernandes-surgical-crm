import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useThemeConfig } from "@/hooks/useThemeConfig";
import SplashScreen from "./SplashScreen";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(false);
  const [configsLoaded, setConfigsLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const { themeConfig, isLoading: themeLoading } = useThemeConfig();

  // Mostrar splash após login bem-sucedido
  useEffect(() => {
    if (!loading && user && !showSplash) {
      const hasSeenSplash = sessionStorage.getItem('splash_shown');
      if (!hasSeenSplash) {
        setShowSplash(true);
        sessionStorage.setItem('splash_shown', 'true');
      }
    }
  }, [user, loading, showSplash]);

  // Garantir tempo mínimo de 3 segundos para o splash
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Carregar configurações do tema
  useEffect(() => {
    if (!themeLoading && themeConfig) {
      if (themeConfig.colors) {
        const root = document.documentElement;
        Object.entries(themeConfig.colors).forEach(([key, value]) => {
          if (value) root.style.setProperty(`--${key}`, value);
        });
      }
      setConfigsLoaded(true);
    }
  }, [themeConfig, themeLoading]);

  // Esconder splash quando tudo estiver pronto
  useEffect(() => {
    if (showSplash && minTimeElapsed && (configsLoaded || !themeLoading)) {
      setShowSplash(false);
    }
  }, [showSplash, minTimeElapsed, configsLoaded, themeLoading]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => {}} />;
  }

  return <>{children}</>;
}
