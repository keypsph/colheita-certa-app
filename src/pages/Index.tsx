import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Safra } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, Pencil, Grape, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Index() {
  const { safras, addSafra, updateSafra, deleteSafra, safraAtiva, setSafraAtiva } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSafra, setEditingSafra] = useState<Safra | null>(null);
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [valorDiaria, setValorDiaria] = useState('');
  const [horasPadrao, setHorasPadrao] = useState('8');

  const resetForm = () => {
    setNome('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setValorDiaria('');
    setHorasPadrao('8');
    setEditingSafra(null);
  };

  const openEdit = (s: Safra) => {
    setEditingSafra(s);
    setNome(s.nome);
    setDataInicio(s.dataInicio ? new Date(s.dataInicio) : undefined);
    setDataFim(s.dataFim ? new Date(s.dataFim) : undefined);
    setValorDiaria(String(s.valorDiaria));
    setHorasPadrao(String(s.horasPadrao));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!nome || !valorDiaria) {
      toast.error('Preencha o nome e o valor da diária');
      return;
    }
    const safra: Safra = {
      id: editingSafra?.id || crypto.randomUUID(),
      nome,
      dataInicio: dataInicio?.toISOString(),
      dataFim: dataFim?.toISOString(),
      valorDiaria: parseFloat(valorDiaria),
      horasPadrao: parseFloat(horasPadrao) || 8,
    };
    if (editingSafra) {
      updateSafra(safra);
      toast.success('Safra atualizada!');
    } else {
      addSafra(safra);
      toast.success('Safra adicionada!');
    }
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteSafra(id);
    toast.success('Safra excluída!');
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <Grape className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Gestão de Safras</h1>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full mb-4 gap-2">
              <Plus className="h-4 w-4" /> Adicionar Safra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSafra ? 'Editar Safra' : 'Nova Safra'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Safra</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Safra 2025" />
              </div>
              <div>
                <Label>Valor da Diária (R$)</Label>
                <Input type="number" value={valorDiaria} onChange={e => setValorDiaria(e.target.value)} placeholder="Ex: 120" />
              </div>
              <div>
                <Label>Horas Padrão do Dia</Label>
                <Input type="number" value={horasPadrao} onChange={e => setHorasPadrao(e.target.value)} placeholder="8" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data Início <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dataInicio && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Data Fim <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dataFim && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingSafra ? 'Salvar Alterações' : 'Criar Safra'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {safras.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma safra cadastrada. Clique em "Adicionar Safra" para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {safras.map(s => (
              <Card
                key={s.id}
                className={cn(
                  'cursor-pointer transition-all',
                  safraAtiva === s.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                )}
                onClick={() => setSafraAtiva(s.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {s.nome}
                      {safraAtiva === s.id && <Check className="h-4 w-4 text-primary" />}
                    </CardTitle>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {s.dataInicio && s.dataFim ? (
                      <p>Período: {format(new Date(s.dataInicio), 'dd/MM/yyyy')} - {format(new Date(s.dataFim), 'dd/MM/yyyy')}</p>
                    ) : s.dataInicio ? (
                      <p>Início: {format(new Date(s.dataInicio), 'dd/MM/yyyy')}</p>
                    ) : (
                      <p>Período: Não definido</p>
                    )}
                    <p>Diária: R$ {s.valorDiaria.toFixed(2)} | {s.horasPadrao}h/dia</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {safraAtiva && (
          <p className="mt-4 text-center text-sm text-primary font-medium">
            Safra ativa: {safras.find(s => s.id === safraAtiva)?.nome}
          </p>
        )}
      </div>
    </div>
  );
}
