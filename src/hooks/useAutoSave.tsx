import { useState, useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  delay?: number; // em milissegundos
  onSave: () => Promise<void>;
  isEnabled?: boolean;
}

export function useAutoSave({ delay = 2000, onSave, isEnabled = true }: UseAutoSaveOptions) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSave = () => {
    if (!isEnabled) return;
    
    setHasUnsavedChanges(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onSave();
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("❌ Auto-save error:", error);
        // Não mostrar erro ao usuário, apenas logar
      } finally {
        setIsSaving(false);
      }
    }, delay);
  };

  const clearAutoSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHasUnsavedChanges(false);
    setIsSaving(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving,
    triggerAutoSave,
    clearAutoSave,
  };
}
