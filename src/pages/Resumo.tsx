import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, AlertCircle, Users, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Resumo() {
  const { funcionarios, registros, adiantamentos, safras, safraAtiva, ajustes } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const safra = safras.find(s => s.id === safraAtiva);
  const funcs = funcionarios.filter(f => f.safraId === safraAtiva);
  const registrosSafra = registros.filter(r => r.safraId === safraAtiva);

  const resumoGeral = useMemo(() => {
    if (!safra) return null;

    const horasPadrao = safra.horasPadrao || 8;
    const valorDiaria = safra.valorDiaria || 0;
    const valorHora = valorDiaria / horasPadrao;

    let totalHorasGeral = 0;
    let diasTrabalhadosGeral = 0;
    let diasNaoTrabalhados = 0;

    registrosSafra.forEach(r => {
      if (r.status === 'trabalhou' || r.status === 'outro') {
        diasTrabalhadosGeral++;
        totalHorasGeral += r.horasTrabalhadas;
      } else if (r.status === 'nao_trabalhou') {
        diasNaoTrabalhados++;
      }
    });

    const totalAdiantamentos = adiantamentos
      .filter(a => a.safraId === safraAtiva)
      .reduce((sum, a) => sum + a.valor, 0);

    const totalDescontos = ajustes
      .filter(a => a.safraId === safraAtiva && a.tipo === 'desconto')
      .reduce((sum, a) => sum + (a.valorDesconto || 0), 0);

    // Calculate per-employee earnings
    const ganhosPorFunc = funcs.map(f => {
      const ajustesFunc = ajustes.filter(a => a.funcionarioId === f.id && a.safraId === safraAtiva);
      const ausenciaDatas = new Set(ajustesFunc.filter(a => a.tipo === 'ausencia').map(a => a.data));
      
      let horasFunc = 0;
      let diasFunc = 0;
      registrosSafra.forEach(r => {
        if (ausenciaDatas.has(r.data)) return;
        if (r.status === 'trabalhou' || r.status === 'outro') {
          const ajusteHoras = ajustesFunc.find(a => a.tipo === 'horas_diferentes' && a.data === r.data);
          diasFunc++;
          horasFunc += ajusteHoras ? (ajusteHoras.horasTrabalhadas || 0) : r.horasTrabalhadas;
        }
      });

      const vd = f.valorDiaria || valorDiaria;
      const vh = vd / horasPadrao;
      const bruto = horasFunc * vh;
      const adiant = adiantamentos.filter(a => a.funcionarioId === f.id && a.safraId === safraAtiva).reduce((s, a) => s + a.valor, 0);
      const desc = ajustesFunc.filter(a => a.tipo === 'desconto').reduce((s, a) => s + (a.valorDesconto || 0), 0);

      return {
        id: f.id,
        nome: f.nome,
        diasTrabalhados: diasFunc,
        horasTotais: horasFunc,
        valorBruto: bruto,
        adiantamentos: adiant,
        descontos: desc,
        liquido: bruto - adiant - desc,
      };
    });

    const valorBrutoTotal = ganhosPorFunc.reduce((s, f) => s + f.valorBruto, 0);
    const valorLiquidoTotal = ganhosPorFunc.reduce((s, f) => s + f.liquido, 0);

    return {
      diasTrabalhadosGeral,
      diasNaoTrabalhados,
      totalHorasGeral,
      totalAdiantamentos: totalAdiantamentos + totalDescontos,
      valorBrutoTotal,
      valorLiquidoTotal,
      ganhosPorFunc,
    };
  }, [safra, registrosSafra, funcs, adiantamentos, ajustes, safraAtiva]);

  // Calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayStatus = (day: Date): 'worked' | 'not_worked' | null => {
    const registro = registrosSafra.find(r => isSameDay(parseISO(r.data), day));
    if (!registro) return null;
    if (registro.status === 'nao_trabalhou') return 'not_worked';
    return 'worked';
  };

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  // Pad start of month
  const firstDayOfWeek = getDay(monthStart); // 0=Sunday

  if (!safraAtiva) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Resumo</h1>
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
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Resumo</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Safra: {safra?.nome}</p>

        {resumoGeral && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Card>
                <CardContent className="py-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Dias trabalhados</p>
                  <p className="text-xl font-bold">{resumoGeral.diasTrabalhadosGeral}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-destructive" />
                  <p className="text-xs text-muted-foreground">Dias sem trabalho</p>
                  <p className="text-xl font-bold">{resumoGeral.diasNaoTrabalhados}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Horas totais</p>
                  <p className="text-xl font-bold">{resumoGeral.totalHorasGeral.toFixed(1)}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-accent" />
                  <p className="text-xs text-muted-foreground">Adiant./Descontos</p>
                  <p className="text-xl font-bold text-destructive">R$ {resumoGeral.totalAdiantamentos.toFixed(0)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Total geral */}
            <Card className="mb-4 border-primary/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor bruto total</p>
                    <p className="text-lg font-bold">R$ {resumoGeral.valorBrutoTotal.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Líquido total</p>
                    <p className="text-lg font-bold text-primary">R$ {resumoGeral.valorLiquidoTotal.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendário */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={prevMonth}>←</Button>
                  <CardTitle className="text-base capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={nextMonth}>→</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {daysInMonth.map(day => {
                    const status = getDayStatus(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'w-8 h-8 flex items-center justify-center rounded-full text-xs mx-auto font-medium',
                          status === 'worked' && 'bg-primary text-primary-foreground',
                          status === 'not_worked' && 'bg-destructive text-destructive-foreground',
                          !status && 'text-muted-foreground'
                        )}
                      >
                        {format(day, 'd')}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>Trabalhou</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span>Não trabalhou</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ganhos por funcionário */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Ganhos por Funcionário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resumoGeral.ganhosPorFunc.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{f.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.diasTrabalhados} dias • {f.horasTotais.toFixed(1)}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-primary">R$ {f.liquido.toFixed(2)}</p>
                      {f.adiantamentos > 0 && (
                        <p className="text-xs text-destructive">-R$ {(f.adiantamentos + f.descontos).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
