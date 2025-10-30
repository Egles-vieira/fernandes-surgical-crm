import { toast as sonnerToast } from "sonner";

// Adapter para manter compatibilidade com código legado
type ToastVariant = "default" | "destructive" | "success";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: any;
}

function toast({ title, description, variant = "default", action }: ToastProps) {
  // Mapear variant para o tipo correto do Sonner
  if (variant === "destructive") {
    return sonnerToast.error(title || "Erro", {
      description,
      action,
    });
  }
  
  if (variant === "success") {
    return sonnerToast.success(title || "Sucesso", {
      description,
      action,
    });
  }

  // default
  return sonnerToast(title || "Notificação", {
    description,
    action,
  });
}

// Adicionar métodos diretos do Sonner
toast.success = (title: string, options?: { description?: string }) => 
  sonnerToast.success(title, options);

toast.error = (title: string, options?: { description?: string }) => 
  sonnerToast.error(title, options);

toast.warning = (title: string, options?: { description?: string }) => 
  sonnerToast.warning(title, options);

toast.info = (title: string, options?: { description?: string }) => 
  sonnerToast.info(title, options);

// Hook mantido para compatibilidade
function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}

export { useToast, toast };
