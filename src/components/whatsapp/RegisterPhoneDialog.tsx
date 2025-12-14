// ============================================
// RegisterPhoneDialog - Registrar número com PIN
// ============================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { useRegisterPhone } from '@/hooks/whatsapp/usePhoneNumbers';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface RegisterPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  phoneNumberId: string | null;
}

export function RegisterPhoneDialog({
  open,
  onOpenChange,
  contaId,
  phoneNumberId
}: RegisterPhoneDialogProps) {
  const [pin, setPin] = useState('');
  const registerMutation = useRegisterPhone();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumberId || pin.length !== 6) return;

    try {
      await registerMutation.mutateAsync({
        contaId,
        phoneNumberId,
        pin
      });
      setPin('');
      onOpenChange(false);
    } catch (error) {
      // Erro já tratado pelo mutation
    }
  };

  const handleClose = () => {
    setPin('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Registrar Número WhatsApp
          </DialogTitle>
          <DialogDescription>
            Digite o PIN de 6 dígitos configurado no Meta Business Suite para registrar este número.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="pin" className="text-center block">
              PIN de 6 dígitos
            </Label>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={pin}
                onChange={setPin}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Este PIN deve corresponder ao configurado no{' '}
                <strong>Meta Business Suite</strong> nas configurações do WhatsApp Business.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={pin.length !== 6 || registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
