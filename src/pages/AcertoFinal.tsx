import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ResumoFuncionario {
  id: string;
  nome: string;
  diasTrabalhados: number;
  horasTotais: number;
  horasExtras: number;
  valorBruto: number;
  totalAdiantamentos: number;
  valorLiquido: number;
}

export default function AcertoFinal() {
  const { funcionarios, registros, adiantamentos, safras, safraAtiva, ajustes } = useApp();
  const [selectedFunc, setSelectedFunc] = useState<string | null>(null);

  const safra = safras.find(s => s.id === safraAtiva);
  const funcs = funcionarios.filter(f => f.safraId === safraAtiva);
  const registrosSafra = registros.filter(r => r.safraId === safraAtiva);

  const calcularResumo = (funcId: string): ResumoFuncionario => {
    const func = funcs.find(f => f.id === funcId)!;
    const horasPadrao = safra?.horasPadrao || 8;
    const valorDiaria = func.valorDiaria || safra?.valorDiaria || 0;
    const valorHora = valorDiaria / horasPadrao;

    let diasTrabalhados = 0;
    let horasTotais = 0;

    // Check individual adjustments
    const ajustesFunc = ajustes.filter(a => a.funcionarioId === funcId && a.safraId === safraAtiva);
    const ausenciaDatas = new Set(ajustesFunc.filter(a => a.tipo === 'ausencia').map(a => a.data));

    registrosSafra.forEach(r => {
      if (ausenciaDatas.has(r.data)) return; // skip days with absence for this employee
      if (r.status === 'trabalhou' || r.status === 'outro') {
        // Check if this employee has different hours for this day
        const ajusteHoras = ajustesFunc.find(a => a.tipo === 'horas_diferentes' && a.data === r.data);
        diasTrabalhados++;
        horasTotais += ajusteHoras ? (ajusteHoras.horasTrabalhadas || 0) : r.horasTrabalhadas;
      }
    });

    const horasEsperadas = diasTrabalhados * horasPadrao;
    const horasExtras = horasTotais - horasEsperadas;
    const valorBruto = horasTotais * valorHora;

    const totalAdiantamentos = adiantamentos
      .filter(a => a.funcionarioId === funcId && a.safraId === safraAtiva)
      .reduce((sum, a) => sum + a.valor, 0);

    const totalDescontos = ajustesFunc
      .filter(a => a.tipo === 'desconto')
      .reduce((sum, a) => sum + (a.valorDesconto || 0), 0);

    return {
      id: funcId,
      nome: func.nome,
      diasTrabalhados,
      horasTotais,
      horasExtras,
      valorBruto,
      totalAdiantamentos: totalAdiantamentos + totalDescontos,
      valorLiquido: valorBruto - totalAdiantamentos - totalDescontos,
    };
  };

  const exportarPDF = (resumo: ResumoFuncionario) => {
    const doc = new jsPDF();
    const adiantamentosFunc = adiantamentos.filter(
      a => a.funcionarioId === resumo.id && a.safraId === safraAtiva
    );

    doc.setFontSize(18);
    doc.text('Acerto Final', 14, 20);
    doc.setFontSize(12);
    doc.text(`Funcionário: ${resumo.nome}`, 14, 32);
    doc.text(`Safra: ${safra?.nome || ''}`, 14, 40);
    if (safra?.dataInicio && safra?.dataFim) {
      doc.text(`Período: ${format(new Date(safra.dataInicio), 'dd/MM/yyyy')} - ${format(new Date(safra.dataFim), 'dd/MM/yyyy')}`, 14, 48);
    }

    doc.setFontSize(11);
    let y = 62;
    doc.text(`Dias trabalhados: ${resumo.diasTrabalhados}`, 14, y); y += 8;
    doc.text(`Horas totais: ${resumo.horasTotais.toFixed(2)}h`, 14, y); y += 8;
    doc.text(`Horas extras: ${resumo.horasExtras >= 0 ? '+' : ''}${resumo.horasExtras.toFixed(2)}h`, 14, y); y += 8;
    doc.text(`Valor bruto: R$ ${resumo.valorBruto.toFixed(2)}`, 14, y); y += 8;
    doc.text(`Total descontos: R$ ${resumo.totalAdiantamentos.toFixed(2)}`, 14, y); y += 14;

    doc.setFontSize(14);
    doc.setFont(undefined as any, 'bold');
    doc.text(`VALOR A RECEBER: R$ ${resumo.valorLiquido.toFixed(2)}`, 14, y);

    if (adiantamentosFunc.length > 0) {
      y += 14;
      doc.setFont(undefined as any, 'normal');
      doc.setFontSize(12);
      doc.text('Detalhamento de Adiantamentos:', 14, y);

      autoTable(doc, {
        startY: y + 6,
        head: [['Data', 'Valor', 'Descrição']],
        body: adiantamentosFunc.map(a => [
          format(new Date(a.data), 'dd/MM/yyyy'),
          `R$ ${a.valor.toFixed(2)}`,
          a.descricao || '-',
        ]),
      });
    }

    doc.save(`acerto-${resumo.nome.replace(/\s/g, '_')}.pdf`);
    toast.success('PDF exportado!');
  };

  if (!safraAtiva) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Acerto Final</h1>
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
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Acerto Final</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Safra: {safra?.nome}</p>

        {funcs.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              Nenhum funcionário cadastrado nesta safra.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {funcs.map(f => {
              const resumo = calcularResumo(f.id);
              const isSelected = selectedFunc === f.id;
              return (
                <Card
                  key={f.id}
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => setSelectedFunc(isSelected ? null : f.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      {f.nome}
                      <span className={`text-sm font-bold ${resumo.valorLiquido >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        R$ {resumo.valorLiquido.toFixed(2)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  {isSelected && (
                    <CardContent className="pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted rounded-lg p-2">
                          <p className="text-muted-foreground">Dias trab.</p>
                          <p className="font-semibold">{resumo.diasTrabalhados}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-2">
                          <p className="text-muted-foreground">Horas totais</p>
                          <p className="font-semibold">{resumo.horasTotais.toFixed(2)}h</p>
                        </div>
                        <div className="bg-muted rounded-lg p-2">
                          <p className="text-muted-foreground">Horas extras</p>
                          <p className="font-semibold">{resumo.horasExtras >= 0 ? '+' : ''}{resumo.horasExtras.toFixed(2)}h</p>
                        </div>
                        <div className="bg-muted rounded-lg p-2">
                          <p className="text-muted-foreground">Valor bruto</p>
                          <p className="font-semibold">R$ {resumo.valorBruto.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-destructive/10 rounded-lg p-2 text-sm">
                        <span>Descontos:</span>
                        <span className="font-semibold text-destructive">- R$ {resumo.totalAdiantamentos.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
                        <span className="font-semibold">A receber:</span>
                        <span className="font-bold text-lg text-primary">R$ {resumo.valorLiquido.toFixed(2)}</span>
                      </div>
                      <Button onClick={(e) => { e.stopPropagation(); exportarPDF(resumo); }} className="w-full gap-2" variant="outline">
                        <Download className="h-4 w-4" /> Exportar PDF
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
