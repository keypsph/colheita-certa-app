import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { RegistroHoras as TRegistro, AjusteIndividual } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CalendarIcon, Minus, Plus, Save, AlertCircle, Trash2, Calculator, UserMinus, Users, Calendar as CalendarIcon2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Status = 'trabalhou' | 'nao_trabalhou' | 'outro';

interface PeriodoTrabalho {
  inicio: string;
  fim: string;
}

export default function RegistroHorasPage() {
  const { safras, safraAtiva, registros, addRegistro, deleteRegistro, funcionarios, ajustes, addAjuste, deleteAjuste, startPeriod, finishPeriod, workLabel } = useApp();
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

  // Agrupar registros por dia
  const historicoAgrupado = useMemo(() => {
    const grupos: Record<string, typeof registrosDaSafra> = {};
    
    registrosDaSafra.forEach(r => {
      try {
        const dataKey = format(parseISO(r.data), 'yyyy-MM-dd');
        if (!grupos[dataKey]) grupos[dataKey] = [];
        grupos[dataKey].push(r);
      } catch (e) {}
    });

    return Object.entries(grupos)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dataStr, regs]) => {
        const totalHorasDia = regs.reduce((acc, r) => acc + (r.horasTrabalhadas || 0), 0);
        return { dataStr, registros: regs, totalHorasDia };
      });
  }, [registrosDaSafra]);

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
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Horas</h1>
        </div>
        <p className="text-sm text-muted-foreground -mt-4">{workLabel.charAt(0).toUpperCase() + workLabel.slice(1)}: {safra?.nome}</p>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Registro Geral (Equipe)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  { value: 'outro' as Status, label: 'Outro motivo' },
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant={status === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus(opt.value)}
                    className={cn(status === opt.value && opt.value === 'nao_trabalhou' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {(status === 'trabalhou' || status === 'outro') && (
              <div>
                <Label>Horas Trabalhadas</Label>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Button variant="outline" size="icon" onClick={() => addMin(-15)} className="h-12 w-12 rounded-full"><Minus className="h-5 w-5" /></Button>
                  {editingTime ? (
                    <Input value={editTimeValue} onChange={e => setEditTimeValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTimeConfirm()} onBlur={handleTimeConfirm} className="w-24 text-center text-xl font-bold" autoFocus />
                  ) : (
                    <div onClick={handleTimeClick} className="bg-primary text-primary-foreground rounded-xl px-6 py-3 text-2xl font-bold min-w-[120px] text-center cursor-pointer">{horas}h{minutos > 0 ? String(minutos).padStart(2, '0') : '00'}</div>
                  )}
                  <Button variant="outline" size="icon" onClick={() => addMin(15)} className="h-12 w-12 rounded-full"><Plus className="h-5 w-5" /></Button>
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full gap-2"><Save className="h-4 w-4" /> Salvar Registro Geral</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Controle de Ponto Individual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funcs.map(f => {
              const pontoAtivo = registrosDaSafra.find(r => r.funcionarioId === f.id && r.status === 'iniciado');
              return (
                <div key={f.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{f.nome}</p>
                    {pontoAtivo && <p className="text-[10px] text-primary font-bold animate-pulse">TRABALHANDO AGORA...</p>}
                  </div>
                  {pontoAtivo ? (
                    <Button size="sm" variant="destructive" onClick={() => finishPeriod(pontoAtivo.id)}>Finalizar</Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => startPeriod(f.id)}>Iniciar</Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAjuste(true)}><UserMinus className="h-4 w-4" /> Ajuste Indiv.</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCalc(true)}><Calculator className="h-4 w-4" /> Calculadora</Button>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2"><CalendarIcon2 className="h-5 w-5 text-primary" /> Histórico Agrupado</h2>
          {historicoAgrupado.map((grupo) => (
            <Card key={grupo.dataStr} className="overflow-hidden border-l-4 border-l-primary">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="text-left">
                        <p className="font-bold text-sm">{format(parseISO(grupo.dataStr), "dd 'de' MMMM", { locale: ptBR })}</p>
                        <p className="text-xs text-muted-foreground capitalize">{format(parseISO(grupo.dataStr), 'eeee', { locale: ptBR })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{grupo.totalHorasDia.toFixed(2)}h</p>
                        <p className="text-[10px] text-muted-foreground">Total da Equipe</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0 border-t">
                    <div className="space-y-2 mt-3">
                      {grupo.registros.map((r) => {
                        const func = funcionarios.find(f => f.id === r.funcionarioId);
                        return (
                          <div key={r.id} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{func ? func.nome : 'Registro Geral'}</span>
                              {r.status === 'iniciado' && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full font-bold">EM ABERTO</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-semibold">{r.horasTrabalhadas?.toFixed(2) || '0.00'}h</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRegistro(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialogs: Calculadora e Ajuste permanecem iguais */}
      <Dialog open={showCalc} onOpenChange={setShowCalc}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader><DialogTitle>Calculadora de Horas</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {periodos.map((p, i) => (
              <div key={i} className="flex items-end gap-2 bg-muted/30 p-3 rounded-lg relative">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="time" value={p.inicio} onChange={e => updatePeriodo(i, 'inicio', e.target.value)} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <Input type="time" value={p.fim} onChange={e => updatePeriodo(i, 'fim', e.target.value)} />
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-10 w-10" onClick={() => removePeriodo(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" onClick={addPeriodo} className="w-full border-dashed"><Plus className="h-4 w-4 mr-2" /> Adicionar Período</Button>
            <div className="bg-primary/10 p-4 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Total Calculado</p>
              <p className="text-3xl font-bold text-primary">{totalCalcHoras}h{String(totalCalcMins).padStart(2, '0')}</p>
            </div>
            <Button className="w-full" onClick={() => { setHoras(totalCalcHoras); setMinutos(totalCalcMins); setShowCalc(false); }}>Usar este tempo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAjuste} onOpenChange={setShowAjuste}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader><DialogTitle>Ajuste Individual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Funcionário</Label>
              <Select value={ajusteFuncId} onValueChange={setAjusteFuncId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{funcs.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={ajusteTipo} onValueChange={(v) => setAjusteTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausencia">Ausência</SelectItem>
                  <SelectItem value="horas_diferentes">Horas Diferentes</SelectItem>
                  <SelectItem value="desconto">Desconto R$</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ajusteTipo === 'horas_diferentes' && <Input type="number" value={ajusteHoras} onChange={e => setAjusteHoras(e.target.value)} placeholder="Horas" />}
            {ajusteTipo === 'desconto' && <Input type="number" value={ajusteDesconto} onChange={e => setAjusteDesconto(e.target.value)} placeholder="Valor R$" />}
            <Button className="w-full" onClick={handleSaveAjuste}>Salvar Ajuste</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
