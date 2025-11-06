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
  const [splashComplete, setSplashComplete] = useState(false);
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

  // Mostrar splash sempre após login
  useEffect(() => {
    if (!loading && user && !splashComplete) {
      // Verifica se acabou de fazer login
      const justLoggedIn = !sessionStorage.getItem('user_session_active');
      
      if (justLoggedIn) {
        setShowSplash(true);
        sessionStorage.setItem('user_session_active', 'true');
        
        // Timer para iniciar fade-out
        const fadeTimer = setTimeout(() => {
          setFadeOut(true);
        }, 2700);
        
        // Timer para esconder completamente
        const hideTimer = setTimeout(() => {
          setShowSplash(false);
          setSplashComplete(true);
        }, 3000);
        
        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(hideTimer);
        };
      } else {
        // Se já estava logado, não mostra splash
        setSplashComplete(true);
      }
    }
    
    // Limpa flag quando usuário faz logout
    if (!loading && !user) {
      sessionStorage.removeItem('user_session_active');
      setSplashComplete(false);
      setShowSplash(false);
      setFadeOut(false);
    }
  }, [user, loading, splashComplete]);

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
