import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, TrashIcon } from 'lucide-react';

interface ButtonData {
  id: string;
  texto: string;
}

interface ListSection {
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

interface ButtonMessageBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (texto: string, tipoBotao: 'action' | 'list', botoesData: any) => void;
}

export function ButtonMessageBuilder({ open, onOpenChange, onSend }: ButtonMessageBuilderProps) {
  const [tipoBotao, setTipoBotao] = useState<'action' | 'list'>('action');
  const [texto, setTexto] = useState('');
  
  // Botões de ação
  const [botoes, setBotoes] = useState<ButtonData[]>([
    { id: 'btn1', texto: '' },
  ]);

  // Botões de lista
  const [titulo, setTitulo] = useState('');
  const [textoBotao, setTextoBotao] = useState('Ver opções');
  const [secoes, setSecoes] = useState<ListSection[]>([
    { title: 'Opções', rows: [{ id: 'opt1', title: '', description: '' }] },
  ]);

  const handleAddButton = () => {
    if (botoes.length < 3) {
      setBotoes([...botoes, { id: `btn${botoes.length + 1}`, texto: '' }]);
    }
  };

  const handleRemoveButton = (index: number) => {
    setBotoes(botoes.filter((_, i) => i !== index));
  };

  const handleUpdateButton = (index: number, texto: string) => {
    const newBotoes = [...botoes];
    newBotoes[index].texto = texto;
    setBotoes(newBotoes);
  };

  const handleAddSection = () => {
    setSecoes([
      ...secoes,
      { title: `Seção ${secoes.length + 1}`, rows: [{ id: `opt${Date.now()}`, title: '', description: '' }] },
    ]);
  };

  const handleAddRow = (sectionIndex: number) => {
    const newSecoes = [...secoes];
    newSecoes[sectionIndex].rows.push({
      id: `opt${Date.now()}`,
      title: '',
      description: '',
    });
    setSecoes(newSecoes);
  };

  const handleUpdateRow = (sectionIndex: number, rowIndex: number, field: 'title' | 'description', value: string) => {
    const newSecoes = [...secoes];
    newSecoes[sectionIndex].rows[rowIndex][field] = value;
    setSecoes(newSecoes);
  };

  const handleSend = () => {
    if (!texto.trim()) return;

    let botoesData: any;
    
    if (tipoBotao === 'action') {
      const validBotoes = botoes.filter(b => b.texto.trim());
      if (validBotoes.length === 0) return;
      botoesData = { botoes: validBotoes };
    } else {
      const validSecoes = secoes
        .map(s => ({
          ...s,
          rows: s.rows.filter(r => r.title.trim()),
        }))
        .filter(s => s.rows.length > 0);
      
      if (validSecoes.length === 0) return;
      botoesData = { titulo, textoBotao, secoes: validSecoes };
    }

    onSend(texto, tipoBotao, botoesData);
    handleReset();
  };

  const handleReset = () => {
    setTexto('');
    setBotoes([{ id: 'btn1', texto: '' }]);
    setTitulo('');
    setTextoBotao('Ver opções');
    setSecoes([{ title: 'Opções', rows: [{ id: 'opt1', title: '', description: '' }] }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar mensagem com botões</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mensagem */}
          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[80px]"
            />
          </div>

          {/* Tipo de botão */}
          <Tabs value={tipoBotao} onValueChange={(v) => setTipoBotao(v as 'action' | 'list')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="action">Botões de Ação</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
            </TabsList>

            {/* Botões de Ação */}
            <TabsContent value="action" className="space-y-3">
              {botoes.map((botao, index) => (
                <div key={botao.id} className="flex gap-2">
                  <Input
                    value={botao.texto}
                    onChange={(e) => handleUpdateButton(index, e.target.value)}
                    placeholder={`Botão ${index + 1}`}
                    maxLength={20}
                  />
                  {botoes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveButton(index)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {botoes.length < 3 && (
                <Button variant="outline" size="sm" onClick={handleAddButton}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Adicionar botão
                </Button>
              )}
            </TabsContent>

            {/* Lista */}
            <TabsContent value="list" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Título da lista"
                  />
                </div>
                <div>
                  <Label>Texto do botão</Label>
                  <Input
                    value={textoBotao}
                    onChange={(e) => setTextoBotao(e.target.value)}
                    placeholder="Ver opções"
                  />
                </div>
              </div>

              {secoes.map((secao, sIndex) => (
                <div key={sIndex} className="border rounded p-3 space-y-3">
                  <Input
                    value={secao.title}
                    onChange={(e) => {
                      const newSecoes = [...secoes];
                      newSecoes[sIndex].title = e.target.value;
                      setSecoes(newSecoes);
                    }}
                    placeholder="Nome da seção"
                    className="font-semibold"
                  />

                  {secao.rows.map((row, rIndex) => (
                    <div key={row.id} className="space-y-2 pl-4">
                      <Input
                        value={row.title}
                        onChange={(e) => handleUpdateRow(sIndex, rIndex, 'title', e.target.value)}
                        placeholder="Título da opção"
                      />
                      <Input
                        value={row.description || ''}
                        onChange={(e) => handleUpdateRow(sIndex, rIndex, 'description', e.target.value)}
                        placeholder="Descrição (opcional)"
                      />
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={() => handleAddRow(sIndex)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Adicionar opção
                  </Button>
                </div>
              ))}

              <Button variant="outline" onClick={handleAddSection}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Adicionar seção
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!texto.trim()}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
