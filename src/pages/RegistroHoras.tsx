import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { RegistroHoras as TRegistro, AjusteIndividual } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CalendarIcon, Minus, Plus, Save, AlertCircle, Trash2, Calculator, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Status = 'trabalhou' | 'nao_trabalhou' | 'outro';

interface PeriodoTrabalho {
  inicio: string;
  fim: string;
}

export default function RegistroHorasPage() {
  const { safras, safraAtiva, registros, addRegistro, deleteRegistro, funcionarios, ajustes, addAjuste, deleteAjuste } = useApp();
  const [data, setData] = useState<Date | undefined>(new Date());
  const [horas, setHoras] = useState(8);
  const [minutos, setMinutos] = useState(0);
  const [status, setStatus] = useState<Status>('trabalhou');
  const [motivo, setMotivo] = useState('');
  const [editingTime, setEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState('');

  // Calculadora de horas
  const [showCalc, setShowCalc] = useState(false);
  const [periodos, setPeriodos] = useState<PeriodoTrabalho[]>([{ inicio: '07:00', fim: '11:30' }]);

  // Ajustes individuais
  const [showAjuste, setShowAjuste] = useState(false);
  const [ajusteFuncId, setAjusteFuncId] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState<'ausencia' | 'horas_diferentes' | 'desconto'>('ausencia');
  const [ajusteHoras, setAjusteHoras] = useState('');
  const [ajusteDesconto, setAjusteDesconto] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('');

  const safra = safras.find(s => s.id === safraAtiva);
  const registrosDaSafra = registros.filter(r => r.safraId === safraAtiva);
  const funcs = funcionarios.filter(f => f.safraId === safraAtiva);
  const ajustesDaSafra = ajustes.filter(a => a.safraId === safraAtiva);

  const addMin = (n: number) => {
    let totalMin = horas * 60 + minutos + n;
    if (totalMin < 0) totalMin = 0;
    setHoras(Math.floor(totalMin / 60));
    setMinutos(totalMin % 60);
  };

  const handleTimeClick = () => {
    setEditTimeValue(`${horas}:${String(minutos).padStart(2, '0')}`);
    setEditingTime(true);
  };

  const handleTimeConfirm = () => {
    const parts = editTimeValue.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    setHoras(h);
    setMinutos(m);
    setEditingTime(false);
  };

  const handleSave = () => {
    if (!safraAtiva || !data) { toast.error('Selecione uma safra e uma data'); return; }
    const horasTotais = status === 'trabalhou' || status === 'outro'
      ? horas + minutos / 60
      : 0;

    const registro: TRegistro = {
      id: crypto.randomUUID(),
      safraId: safraAtiva,
      data: data.toISOString(),
      horasTrabalhadas: horasTotais,
      status,
      motivoOutro: status === 'outro' ? motivo : undefined,
    };
    addRegistro(registro);
    toast.success('Registro salvo!');
  };

  // Calculadora de horas
  const parseTime = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const calcPeriodo = (p: PeriodoTrabalho): number => {
    const diff = parseTime(p.fim) - parseTime(p.inicio);
    return diff > 0 ? diff : 0;
  };

  const totalCalcMinutos = periodos.reduce((sum, p) => sum + calcPeriodo(p), 0);
  const totalCalcHoras = Math.floor(totalCalcMinutos / 60);
  const totalCalcMins = totalCalcMinutos % 60;

  const addPeriodo = () => {
    setPeriodos([...periodos, { inicio: '14:00', fim: '19:00' }]);
  };

  const updatePeriodo = (index: number, field: 'inicio' | 'fim', value: string) => {
    const updated = [...periodos];
    updated[index][field] = value;
    setPeriodos(updated);
  };

  const removePeriodo = (index: number) => {
    if (periodos.length > 1) {
      setPeriodos(periodos.filter((_, i) => i !== index));
    }
  };

  // Ajustes individuais
  const handleSaveAjuste = () => {
    if (!ajusteFuncId || !safraAtiva || !data) {
      toast.error('Selecione um funcionário e data');
      return;
    }
    const ajuste: AjusteIndividual = {
      id: crypto.randomUUID(),
      funcionarioId: ajusteFuncId,
      safraId: safraAtiva,
      data: data.toISOString(),
      tipo: ajusteTipo,
      horasTrabalhadas: ajusteTipo === 'horas_diferentes' ? parseFloat(ajusteHoras) || 0 : undefined,
      valorDesconto: ajusteTipo === 'desconto' ? parseFloat(ajusteDesconto) || 0 : undefined,
      motivo: ajusteMotivo || undefined,
    };
    addAjuste(ajuste);
    setAjusteFuncId('');
    setAjusteMotivo('');
    setAjusteHoras('');
    setAjusteDesconto('');
    setShowAjuste(false);
    toast.success('Ajuste registrado!');
  };

  if (!safraAtiva) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Registro de Horas</h1>
          </div>
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              Selecione uma safra na tela inicial primeiro.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Registro de Horas</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Safra: {safra?.nome} — Vale para todos</p>

        <Card className="mb-4">
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !data && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, 'dd/MM/yyyy') : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={data} onSelect={setData} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Situação</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {[
                  { value: 'trabalhou' as Status, label: 'Trabalhou' },
                  { value: 'nao_trabalhou' as Status, label: 'Não trabalhou' },
                  { value: 'outro' as Status, label: 'Adicionar motivo' },
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant={status === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      status === opt.value && opt.value === 'nao_trabalhou' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    )}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {status === 'outro' && (
              <div>
                <Label>Descrição do motivo</Label>
                <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Descreva o motivo..." />
              </div>
            )}

            {(status === 'trabalhou' || status === 'outro') && (
              <div>
                <Label>Horas Trabalhadas</Label>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Button variant="outline" size="icon" onClick={() => addMin(-15)} className="h-12 w-12 rounded-full">
                    <Minus className="h-5 w-5" />
                  </Button>
                  {editingTime ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editTimeValue}
                        onChange={e => setEditTimeValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTimeConfirm()}
                        onBlur={handleTimeConfirm}
                        className="w-24 text-center text-xl font-bold"
                        autoFocus
                        placeholder="8:00"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={handleTimeClick}
                      className="bg-primary text-primary-foreground rounded-xl px-6 py-3 text-2xl font-bold min-w-[120px] text-center cursor-pointer hover:opacity-90 transition-opacity"
                      title="Clique para editar"
                    >
                      {horas}h{minutos > 0 ? `${String(minutos).padStart(2, '0')}` : '00'}
                    </div>
                  )}
                  <Button variant="outline" size="icon" onClick={() => addMin(15)} className="h-12 w-12 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">Toque no horário para editar ou use + / -</p>
              </div>
            )}

            <Button onClick={handleSave} className="w-full gap-2">
              <Save className="h-4 w-4" /> Salvar Registro
            </Button>
          </CardContent>
        </Card>

        {/* Separador - Ferramentas extras */}
        <Separator className="my-6" />

        <div className="space-y-3 mb-6">
          {/* Ajustes individuais */}
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowAjuste(true)}>
            <UserMinus className="h-4 w-4" /> Ajuste Individual de Funcionário
          </Button>

          {/* Calculadora de horas */}
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowCalc(true)}>
            <Calculator className="h-4 w-4" /> Calculadora de Horas
          </Button>
        </div>

        {/* Dialog ajuste individual */}
        <Dialog open={showAjuste} onOpenChange={setShowAjuste}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajuste Individual</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Funcionário</Label>
                <Select value={ajusteFuncId} onValueChange={setAjusteFuncId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {funcs.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de ajuste</Label>
                <Select value={ajusteTipo} onValueChange={(v) => setAjusteTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ausencia">Não foi trabalhar</SelectItem>
                    <SelectItem value="horas_diferentes">Horas diferentes</SelectItem>
                    <SelectItem value="desconto">Desconto no dia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {ajusteTipo === 'horas_diferentes' && (
                <div>
                  <Label>Horas trabalhadas</Label>
                  <Input type="number" value={ajusteHoras} onChange={e => setAjusteHoras(e.target.value)} placeholder="Ex: 6" />
                </div>
              )}
              {ajusteTipo === 'desconto' && (
                <div>
                  <Label>Valor do desconto (R$)</Label>
                  <Input type="number" value={ajusteDesconto} onChange={e => setAjusteDesconto(e.target.value)} placeholder="Ex: 50" />
                </div>
              )}
              <div>
                <Label>Motivo (opcional)</Label>
                <Input value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)} placeholder="Ex: Saiu mais cedo" />
              </div>
              <Button onClick={handleSaveAjuste} className="w-full">Salvar Ajuste</Button>
            </div>

            {ajustesDaSafra.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-sm mb-2">Ajustes registrados:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {ajustesDaSafra.map(a => {
                    const func = funcs.find(f => f.id === a.funcionarioId);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">{func?.nome}</span>
                          <span className="text-muted-foreground ml-2">
                            {a.tipo === 'ausencia' && 'Ausência'}
                            {a.tipo === 'horas_diferentes' && `${a.horasTrabalhadas}h`}
                            {a.tipo === 'desconto' && `- R$ ${a.valorDesconto?.toFixed(2)}`}
                          </span>
                          <span className="text-muted-foreground ml-1">{format(new Date(a.data), 'dd/MM')}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { deleteAjuste(a.id); toast.success('Removido'); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog calculadora de horas */}
        <Dialog open={showCalc} onOpenChange={setShowCalc}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Calculadora de Horas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {periodos.map((p, i) => (
                <div key={i}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Comecei às</Label>
                      <Input
                        type="time"
                        value={p.inicio}
                        onChange={e => updatePeriodo(i, 'inicio', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Parei às</Label>
                      <Input
                        type="time"
                        value={p.fim}
                        onChange={e => updatePeriodo(i, 'fim', e.target.value)}
                      />
                    </div>
                    <div className="min-w-[60px] text-center">
                      <Label className="text-xs">Total</Label>
                      <div className="bg-muted rounded-lg px-2 py-2 text-sm font-bold">
                        {Math.floor(calcPeriodo(p) / 60)}h{String(calcPeriodo(p) % 60).padStart(2, '0')}
                      </div>
                    </div>
                    {periodos.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePeriodo(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full gap-2" onClick={addPeriodo}>
                <Plus className="h-4 w-4" /> Adicionar período
              </Button>

              <div className="bg-primary text-primary-foreground rounded-xl px-4 py-3 text-center">
                <p className="text-xs opacity-80">Total do dia</p>
                <p className="text-2xl font-bold">{totalCalcHoras}h{String(totalCalcMins).padStart(2, '0')}</p>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setHoras(totalCalcHoras);
                  setMinutos(totalCalcMins);
                  setShowCalc(false);
                  toast.success('Horas aplicadas!');
                }}
              >
                Usar este horário
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Histórico */}
        {registrosDaSafra.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Histórico</h2>
            <div className="space-y-2">
              {registrosDaSafra
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                .map(r => (
                  <Card
                    key={r.id}
                    className={cn(
                      r.status === 'nao_trabalhou' && 'border-destructive/50 bg-destructive/5'
                    )}
                  >
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className={cn(
                          'font-medium',
                          r.status === 'nao_trabalhou' && 'text-destructive'
                        )}>
                          {format(new Date(r.data), 'dd/MM/yyyy')}
                        </p>
                        <p className={cn(
                          'text-sm',
                          r.status === 'nao_trabalhou' ? 'text-destructive/80 font-medium' : 'text-muted-foreground'
                        )}>
                          {r.status === 'trabalhou' && `${r.horasTrabalhadas.toFixed(2)}h trabalhadas`}
                          {r.status === 'nao_trabalhou' && '❌ Não trabalhou'}
                          {r.status === 'outro' && `${r.horasTrabalhadas.toFixed(2)}h - ${r.motivoOutro}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { deleteRegistro(r.id); toast.success('Registro removido'); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
