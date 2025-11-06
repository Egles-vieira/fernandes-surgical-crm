import logo from "@/assets/logo-cfernandes.webp";

interface SplashScreenProps {
  fadeOut?: boolean;
}

export default function SplashScreen({ fadeOut = false }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#2d5f7f] to-[#3fb39d] transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <img 
          src={logo} 
          alt="ConvertiAI" 
          className="h-24 w-auto object-contain drop-shadow-2xl animate-pulse"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, glow 2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 20px rgba(63, 179, 157, 0.3))'
          }}
        />
        <h1 className="text-4xl font-bold text-white tracking-wide">
          ConvertiAI
        </h1>
      </div>
    </div>
  );
}
