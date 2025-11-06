import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SplashScreen from "./SplashScreen";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Check if should show splash on mount (only once per session)
  useEffect(() => {
    if (user && !loading) {
      const justLoggedIn = sessionStorage.getItem('just_logged_in');
      const sawSplash = sessionStorage.getItem('sawSplash');
      
      if (justLoggedIn === 'true' && sawSplash !== 'true') {
        setShowSplash(true);
        sessionStorage.setItem('sawSplash', 'true');
        sessionStorage.removeItem('just_logged_in');
      }
    }
  }, [user, loading]);

  // Handle splash screen lifecycle
  useEffect(() => {
    if (!showSplash) return;

    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2700);

    const hideTimer = setTimeout(() => {
      setShowSplash(false);
      navigate("/", { replace: true });
    }, 3000);

    return () => {
      clearTimeout(fadeOutTimer);
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
