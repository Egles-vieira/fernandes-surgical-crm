import { LucideProps } from "lucide-react";

export const WhatsAppIcon = ({ size = 20, className = "", ...props }: LucideProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Balão de mensagem externo */}
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />

      {/* Telefone interno do WhatsApp */}
      <path d="M14.05 9.3c-.15-.3-.3-.45-.6-.45s-.45.15-.6.3c-.15.15-.3.3-.45.45-.15.15-.15.3 0 .45.75.75 1.35 1.65 1.8 2.55.15.15.3.15.45 0 .15-.15.3-.3.45-.45.15-.15.3-.45.3-.6s-.15-.45-.45-.6c-.45-.3-.75-.45-.9-.6z" />
    </svg>
  );
};
