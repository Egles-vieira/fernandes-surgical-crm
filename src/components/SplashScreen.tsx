import { motion, Variants } from "framer-motion";

interface SplashScreenProps {
  fadeOut?: boolean;
}

export default function SplashScreen({ fadeOut = false }: SplashScreenProps) {
  const logoLetters = [
    { char: 'C', color: '#0C426D' },
    { char: 'o', color: '#0C426D' },
    { char: 'n', color: '#0C426D' },
    { char: 'v', color: '#0C426D' },
    { char: 'e', color: '#0C426D' },
    { char: 'r', color: '#0C426D' },
    { char: 't', color: '#0C426D' },
    { char: 'i', color: '#0C426D' },
    { char: 'A', color: '#B2CB57' },
    { char: 'I', gradient: true },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const letterVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  };

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#0C426D]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#B2CB57]/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        
        {/* Logo Animation */}
        <motion.div 
          className="flex items-baseline gap-[1px] mb-6 text-[4rem] sm:text-[5rem] font-[800] tracking-tight"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {logoLetters.map((item, index) => (
            <motion.span
              key={index}
              variants={letterVariants}
              style={{ color: item.gradient ? undefined : item.color }}
              className={
                item.gradient 
                ? "bg-gradient-to-br from-[#B2CB57] to-[#79D4C7] text-transparent bg-clip-text" 
                : ""
              }
            >
              {item.char}
            </motion.span>
          ))}
        </motion.div>

        {/* Tagline */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="tracking-[0.2em] text-[#0C426D] font-[700] text-xs sm:text-sm uppercase text-center px-4"
        >
          Inteligência Operacional em Saúde
        </motion.div>

        {/* Progress Line */}
        <motion.div 
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-64 h-1.5 bg-slate-100 rounded-full mt-10 overflow-hidden"
        >
          <motion.div 
            className="h-full bg-gradient-to-r from-[#00C853] to-[#76FF03]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
