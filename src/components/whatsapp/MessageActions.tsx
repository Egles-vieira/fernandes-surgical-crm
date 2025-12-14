import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MoreVerticalIcon, SmileIcon, Edit2Icon, Trash2Icon, CopyIcon, Reply } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { toast } from 'sonner';

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  isOwnMessage: boolean;
  onReact: (emoji: string) => void;
  onEdit: (newText: string) => void;
  onDelete: () => void;
  onReply?: () => void;
}

export function MessageActions({
  messageId,
  messageContent,
  isOwnMessage,
  onReact,
  onEdit,
  onDelete,
  onReply,
}: MessageActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedText, setEditedText] = useState(messageContent);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success('Mensagem copiada!');
  };

  const handleEdit = () => {
    if (editedText.trim() && editedText !== messageContent) {
      onEdit(editedText);
      setShowEditDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Responder */}
          {onReply && (
            <DropdownMenuItem onClick={onReply}>
              <Reply className="h-4 w-4 mr-2" />
              Responder
            </DropdownMenuItem>
          )}

          {/* Reagir */}
          <div className="px-2 py-1.5">
            <EmojiPicker
              onSelect={onReact}
              trigger={
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <SmileIcon className="h-4 w-4 mr-2" />
                  Reagir
                </Button>
              }
            />
          </div>

          <DropdownMenuSeparator />

          {/* Copiar */}
          <DropdownMenuItem onClick={handleCopy}>
            <CopyIcon className="h-4 w-4 mr-2" />
            Copiar texto
          </DropdownMenuItem>

          {/* Editar (só para mensagens próprias) */}
          {isOwnMessage && (
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit2Icon className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
          )}

          {/* Deletar (só para mensagens próprias) */}
          {isOwnMessage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="h-4 w-4 mr-2" />
                Deletar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar mensagem</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[100px]"
            placeholder="Digite a nova mensagem..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!editedText.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será deletada para todos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
