// ============================================
// PhoneNumbersCard - Lista e gerencia phone numbers
// ============================================

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Star,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { 
  usePhoneNumbers, 
  useSyncPhoneNumbers,
  useDeregisterPhone,
  useSetPrincipalPhone,
  type PhoneNumber
} from '@/hooks/whatsapp/usePhoneNumbers';
import { RegisterPhoneDialog } from './RegisterPhoneDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PhoneNumbersCardProps {
  contaId: string;
}

export function PhoneNumbersCard({ contaId }: PhoneNumbersCardProps) {
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);
  const [deregisterDialogOpen, setDeregisterDialogOpen] = useState(false);
  const [phoneToDeregister, setPhoneToDeregister] = useState<PhoneNumber | null>(null);

  const { data: phoneNumbers, isLoading, error } = usePhoneNumbers(contaId);
  const syncMutation = useSyncPhoneNumbers();
  const deregisterMutation = useDeregisterPhone();
  const setPrincipalMutation = useSetPrincipalPhone();

  const handleSync = () => {
    syncMutation.mutate(contaId);
  };

  const handleOpenRegister = (phoneNumberId: string) => {
    setSelectedPhoneId(phoneNumberId);
    setRegisterDialogOpen(true);
  };

  const handleOpenDeregister = (phone: PhoneNumber) => {
    setPhoneToDeregister(phone);
    setDeregisterDialogOpen(true);
  };

  const handleConfirmDeregister = () => {
    if (phoneToDeregister) {
      deregisterMutation.mutate({
        contaId,
        phoneNumberId: phoneToDeregister.phone_number_id
      });
    }
    setDeregisterDialogOpen(false);
    setPhoneToDeregister(null);
  };

  const handleSetPrincipal = (phoneNumberId: string) => {
    setPrincipalMutation.mutate({ contaId, phoneNumberId });
  };

  // Renderiza badge de quality rating (semáforo)
  const renderQualityBadge = (quality: string | null) => {
    switch (quality) {
      case 'GREEN':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            Excelente
          </Badge>
        );
      case 'YELLOW':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5" />
            Atenção
          </Badge>
        );
      case 'RED':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
            Crítico
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-gray-400 mr-1.5" />
            Sem dados
          </Badge>
        );
    }
  };

  // Renderiza badge de name status
  const renderNameStatusBadge = (status: string | null) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Nome Aprovado
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Análise Pendente
          </Badge>
        );
      case 'DECLINED':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Nome Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Sem Nome
          </Badge>
        );
    }
  };

  // Renderiza badge de registro
  const renderRegistrationBadge = (isRegistered: boolean) => {
    if (isRegistered) {
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Registrado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <XCircle className="w-3 h-3 mr-1" />
        Não Registrado
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Números de Telefone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Erro ao carregar números: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const lastSync = phoneNumbers?.[0]?.ultima_sincronizacao_em;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Números de Telefone
            </CardTitle>
            <CardDescription>
              {lastSync 
                ? `Última sincronização: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}`
                : 'Nunca sincronizado'
              }
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {!phoneNumbers || phoneNumbers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum número encontrado</p>
              <p className="text-sm">Clique em "Sincronizar" para buscar números da Meta</p>
            </div>
          ) : (
            phoneNumbers.map((phone) => (
              <div 
                key={phone.id}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Header do número */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{phone.display_phone_number}</p>
                      {phone.verified_name && (
                        <p className="text-sm text-muted-foreground">
                          {phone.verified_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {phone.is_principal && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Star className="w-3 h-3 mr-1" />
                      Principal
                    </Badge>
                  )}
                </div>

                {/* Badges de status */}
                <div className="flex flex-wrap gap-2">
                  {renderQualityBadge(phone.quality_rating)}
                  {renderNameStatusBadge(phone.name_status)}
                  {renderRegistrationBadge(phone.is_registered)}
                </div>

                {/* Info adicional */}
                {(phone.platform_type || phone.throughput_level) && (
                  <div className="text-xs text-muted-foreground flex gap-4">
                    {phone.platform_type && (
                      <span>Plataforma: {phone.platform_type}</span>
                    )}
                    {phone.throughput_level && (
                      <span>Throughput: {phone.throughput_level}</span>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-2 border-t">
                  {!phone.is_registered ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenRegister(phone.phone_number_id)}
                    >
                      Registrar com PIN
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenDeregister(phone)}
                      disabled={deregisterMutation.isPending}
                    >
                      Desregistrar
                    </Button>
                  )}
                  
                  {!phone.is_principal && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSetPrincipal(phone.phone_number_id)}
                      disabled={setPrincipalMutation.isPending}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Definir Principal
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog de Registro */}
      <RegisterPhoneDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        contaId={contaId}
        phoneNumberId={selectedPhoneId}
      />

      {/* Dialog de Confirmação de Desregistro */}
      <AlertDialog open={deregisterDialogOpen} onOpenChange={setDeregisterDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desregistrar Número</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desregistrar o número{' '}
              <strong>{phoneToDeregister?.display_phone_number}</strong>?
              <br /><br />
              Esta ação irá desconectar o número do WhatsApp Business API e você 
              precisará registrá-lo novamente com o PIN para usá-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeregister}
              className="bg-destructive hover:bg-destructive/90"
            >
              Desregistrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
