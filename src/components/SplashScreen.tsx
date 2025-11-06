import { useEffect, useState } from "react";
import logo from "@/assets/logo-convertiai.png";

interface SplashScreenProps {
  fadeOut: boolean;
}

export default function SplashScreen({ fadeOut }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000;
    const interval = 50;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#2d5f7f] to-[#3fb39d] transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[#3fb39d] rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#1e3a5f] rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Logo with animation */}
        <div className="mb-8 animate-fade-in">
          <img 
            src={logo} 
            alt="ConvertiAI" 
            className="h-20 mx-auto object-contain drop-shadow-2xl animate-scale-in"
          />
        </div>

        {/* Loading text */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Carregando Sistema
          </h2>
          <p className="text-white/70 text-sm">
            Preparando seu ambiente de trabalho...
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 mx-auto animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-white to-[#3fb39d] transition-all duration-300 ease-out rounded-full shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/60 text-xs mt-2 font-medium">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Floating dots animation */}
        <div className="flex justify-center gap-2 mt-6 animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    </div>
  );
}
