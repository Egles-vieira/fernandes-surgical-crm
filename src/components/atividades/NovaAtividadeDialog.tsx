import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckSquare, Phone, Users, Mail, MessageCircle, MapPin, RefreshCw, FileText } from 'lucide-react';
import { useAtividades } from '@/hooks/useAtividades';
import { useAuth } from '@/hooks/useAuth';
import { useClientes } from '@/hooks/useClientes';
import { useVendedores } from '@/hooks/useVendedores';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const tiposAtividade = [
  { value: 'tarefa', label: 'Tarefa', icon: CheckSquare },
  { value: 'chamada', label: 'Chamada', icon: Phone },
  { value: 'reuniao', label: 'Reunião', icon: Users },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'visita', label: 'Visita', icon: MapPin },
  { value: 'follow_up', label: 'Follow-up', icon: RefreshCw },
  { value: 'proposta', label: 'Proposta', icon: FileText },
];

interface NovaAtividadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId?: string;
  vendaId?: string;
}

export function NovaAtividadeDialog({ open, onOpenChange, clienteId, vendaId }: NovaAtividadeDialogProps) {
  const { user } = useAuth();
  const { criarAtividade } = useAtividades();
  const { clientes } = useClientes();
  const { vendedores } = useVendedores();

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'tarefa',
    prioridade: 'media',
    cliente_id: clienteId || '',
    responsavel_id: user?.id || '',
    data_vencimento: undefined as Date | undefined
  });

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) return;

    await criarAtividade.mutateAsync({
      titulo: formData.titulo,
      descricao: formData.descricao || null,
      tipo: formData.tipo as any,
      prioridade: formData.prioridade as any,
      cliente_id: formData.cliente_id || null,
      venda_id: vendaId || null,
      responsavel_id: formData.responsavel_id || null,
      data_vencimento: formData.data_vencimento?.toISOString() || null
    });

    // Reset form
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'tarefa',
      prioridade: 'media',
      cliente_id: clienteId || '',
      responsavel_id: user?.id || '',
      data_vencimento: undefined
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Ligar para cliente sobre proposta"
            />
          </div>

          {/* Tipo e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposAtividade.map(tipo => {
                    const Icon = tipo.icon;
                    return (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {tipo.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select 
                value={formData.prioridade} 
                onValueChange={(v) => setFormData({ ...formData, prioridade: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente */}
          {!clienteId && (
            <div>
              <Label>Cliente</Label>
              <Select 
                value={formData.cliente_id} 
                onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.slice(0, 50).map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome_abrev || cliente.nome_emit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Responsável */}
          <div>
            <Label>Responsável</Label>
            <Select 
              value={formData.responsavel_id} 
              onValueChange={(v) => setFormData({ ...formData, responsavel_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {vendedores?.map(vendedor => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data de Vencimento */}
          <div>
            <Label>Data de Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.data_vencimento && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data_vencimento ? (
                    format(formData.data_vencimento, "PPP", { locale: ptBR })
                  ) : (
                    "Selecione uma data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.data_vencimento}
                  onSelect={(date) => setFormData({ ...formData, data_vencimento: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.titulo.trim() || criarAtividade.isPending}
          >
            Criar Atividade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
