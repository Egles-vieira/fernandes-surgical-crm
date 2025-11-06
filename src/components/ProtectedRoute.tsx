import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useThemeConfig } from "@/hooks/useThemeConfig";
import SplashScreen from "./SplashScreen";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const { themeConfig, isLoading: themeLoading } = useThemeConfig();

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Carregar configurações do tema em background
  useEffect(() => {
    if (!themeLoading && themeConfig?.colors) {
      const root = document.documentElement;
      Object.entries(themeConfig.colors).forEach(([key, value]) => {
        if (value) root.style.setProperty(`--${key}`, value);
      });
    }
  }, [themeConfig, themeLoading]);

  // Detectar pós-login e marcar que deve exibir splash UMA vez por sessão
  useEffect(() => {
    if (!loading && user) {
      const sawSplash = sessionStorage.getItem('sawSplash') === 'true';
      const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';

      if (justLoggedIn && !sawSplash) {
        sessionStorage.setItem('sawSplash', 'true');
        sessionStorage.removeItem('just_logged_in');
        setShowSplash(true);
        setFadeOut(false);
      }
    }
  }, [loading, user]);

  // Controlar timers de fade e saída + navegação para a rota inicial
  useEffect(() => {
    if (!showSplash) return;

    const fadeTimer = setTimeout(() => setFadeOut(true), 2700);
    const hideTimer = setTimeout(() => {
      setShowSplash(false);
      // Rota inicial atual do sistema (Dashboard em "/")
      navigate("/", { replace: true });
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [showSplash, navigate]);

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
    return <SplashScreen fadeOut={fadeOut} />;
  }

  return <>{children}</>;
}
