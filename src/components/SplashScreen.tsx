import logo from "@/assets/logo-convertiai.png";

interface SplashScreenProps {
  fadeOut: boolean;
}

export default function SplashScreen({ fadeOut }: SplashScreenProps) {
  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#2d5f7f] to-[#3fb39d] transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-label="Carregando sistema"
    >
      {/* Logo */}
      <img 
        src={logo} 
        alt="ConvertiAI" 
        className="h-20 mb-4 object-contain drop-shadow-2xl"
      />
      
      {/* Nome do Sistema */}
      <h1 className="text-2xl font-semibold text-white">
        ConvertiAI
      </h1>
    </div>
  );
}
