import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface ResumoFuncionario {
  id: string;
  nome: string;
  diasTrabalhados: number;
  horasTotais: number;
  horasExtras: number;
  valorBruto: number;
  totalAdiantamentos: number;
  valorLiquido: number;
  detalhamentoDias: Array<{ data: string; horas: number }>;
}

export default function AcertoFinal() {
  const { funcionarios, registros, adiantamentos, safras, safraAtiva, ajustes, workLabel } = useApp();
  const [selectedFunc, setSelectedFunc] = useState<string | null>(null);

  const safra = safras.find(s => s.id === safraAtiva);
  const funcs = funcionarios.filter(f => f.safraId === safraAtiva);
  const registrosSafra = registros.filter(r => r.safraId === safraAtiva);

  const calcularResumo = (funcId: string): ResumoFuncionario | null => {
    try {
      const func = funcs.find(f => f.id === funcId);
      if (!func) return null;

      const horasPadrao = safra?.horasPadrao || 8;
      const valorDiaria = func.valorDiaria || safra?.valorDiaria || 0;
      
      // Cálculo preciso do valor por hora para evitar erros de arredondamento (ex: 160/8 = 20.00)
      const valorHora = Math.round((valorDiaria / horasPadrao + Number.EPSILON) * 100) / 100;

      let diasTrabalhados = 0;
      let horasTotais = 0;
      const detalhamentoDias: Array<{ data: string; horas: number }> = [];

      const ajustesFunc = ajustes.filter(a => a.funcionarioId === funcId && a.safraId === safraAtiva);
      
      const allDates = Array.from(new Set(
        registrosSafra
          .filter(r => r.data)
          .map(r => {
            try {
              return format(parseISO(r.data), 'yyyy-MM-dd');
            } catch (e) {
              return null;
            }
          })
          .filter((d): d is string => d !== null)
      ));
      
      allDates.forEach(dateStr => {
        const registrosDoDia = registrosSafra.filter(r => {
          try {
            return r.data && format(parseISO(r.data), 'yyyy-MM-dd') === dateStr;
          } catch (e) {
            return false;
          }
        });
        
        let horasDesteDia = 0;
        let trabalhouNoDia = false;

        // 1. Somar todos os pontos individuais finalizados deste funcionário no dia
        const pontosIndividuais = registrosDoDia.filter(r => r.funcionarioId === func.id && r.status === 'finalizado');
        if (pontosIndividuais.length > 0) {
          trabalhouNoDia = true;
          horasDesteDia += pontosIndividuais.reduce((acc, r) => acc + (r.horasTrabalhadas || 0), 0);
        }

        // 2. Somar ajustes de horas diferentes
        const ajustesHoras = ajustesFunc.filter(a => {
          try {
            return a.data && format(parseISO(a.data), 'yyyy-MM-dd') === dateStr && a.tipo === 'horas_diferentes';
          } catch (e) {
            return false;
          }
        });
        if (ajustesHoras.length > 0) {
          trabalhouNoDia = true;
          horasDesteDia += ajustesHoras.reduce((acc, a) => acc + (a.horasTrabalhadas || 0), 0);
        }

        // 3. Somar registros gerais (se não houver ponto individual ou ajuste de horas)
        if (!trabalhouNoDia) {
          const registrosGerais = registrosDoDia.filter(r => !r.funcionarioId && (r.status === 'trabalhou' || r.status === 'outro'));
          if (registrosGerais.length > 0) {
            trabalhouNoDia = true;
            horasDesteDia += registrosGerais.reduce((acc, r) => acc + (r.horasTrabalhadas || 0), 0);
          }
        }

        // 4. Verificar se houve ausência (sobrescreve tudo)
        const temAusencia = ajustesFunc.some(a => {
          try {
            return a.data && format(parseISO(a.data), 'yyyy-MM-dd') === dateStr && a.tipo === 'ausencia';
          } catch (e) {
            return false;
          }
        });

        if (trabalhouNoDia && !temAusencia) {
          diasTrabalhados++;
          horasTotais += horasDesteDia;
          detalhamentoDias.push({ data: dateStr, horas: horasDesteDia });
        }
      });

      const horasEsperadas = diasTrabalhados * horasPadrao;
      const horasExtras = Math.round((horasTotais - horasEsperadas + Number.EPSILON) * 100) / 100;
      
      // Valor bruto calculado com arredondamento de centavos para precisão financeira
      const valorBruto = Math.round((horasTotais * valorHora + Number.EPSILON) * 100) / 100;

      const totalAdiantamentos = adiantamentos
        .filter(a => a.funcionarioId === funcId && a.safraId === safraAtiva)
        .reduce((sum, a) => sum + a.valor, 0);

      const totalDescontos = ajustesFunc
        .filter(a => a.tipo === 'desconto')
        .reduce((sum, a) => sum + (a.valorDesconto || 0), 0);

      const valorLiquido = Math.round((valorBruto - totalAdiantamentos - totalDescontos + Number.EPSILON) * 100) / 100;

      return {
        id: funcId,
        nome: func.nome,
        diasTrabalhados,
        horasTotais,
        horasExtras,
        valorBruto,
        totalAdiantamentos: totalAdiantamentos + totalDescontos,
        valorLiquido,
        detalhamentoDias: detalhamentoDias.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
      };
    } catch (e) {
      console.error('Erro ao calcular resumo do funcionário:', e);
      return null;
    }
  };

  const exportarPDF = async (resumo: ResumoFuncionario) => {
    try {
      const doc = new jsPDF();
      const adiantamentosFunc = adiantamentos.filter(
        a => a.funcionarioId === resumo.id && a.safraId === safraAtiva
      );

      doc.setFontSize(18);
      doc.text('Acerto Final', 14, 20);
      doc.setFontSize(12);
      doc.text(`Funcionário: ${resumo.nome}`, 14, 32);
      doc.text(`${(workLabel || 'trabalho').charAt(0).toUpperCase() + (workLabel || 'trabalho').slice(1)}: ${safra?.nome || ''}`, 14, 40);
      
      if (safra?.dataInicio && safra?.dataFim) {
        try {
          doc.text(`Período: ${format(parseISO(safra.dataInicio), 'dd/MM/yyyy')} - ${format(parseISO(safra.dataFim), 'dd/MM/yyyy')}`, 14, 48);
        } catch (e) {}
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

      y += 10;
      doc.setFont(undefined as any, 'normal');
      doc.setFontSize(12);
      doc.text('Detalhamento de Dias Trabalhados:', 14, y);
      
      autoTable(doc, {
        startY: y + 6,
        head: [['Data', 'Horas']],
        body: resumo.detalhamentoDias.map(d => {
          try {
            return [format(parseISO(d.data), 'dd/MM/yyyy'), `${d.horas.toFixed(2)}h`];
          } catch (e) {
            return [d.data, `${d.horas.toFixed(2)}h`];
          }
        }),
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      if (adiantamentosFunc.length > 0) {
        doc.text('Detalhamento de Adiantamentos:', 14, y);
        autoTable(doc, {
          startY: y + 6,
          head: [['Data', 'Valor', 'Descrição']],
          body: adiantamentosFunc.map(a => {
            try {
              return [format(parseISO(a.data), 'dd/MM/yyyy'), `R$ ${a.valor.toFixed(2)}`, a.descricao || '-'];
            } catch (e) {
              return [a.data, `R$ ${a.valor.toFixed(2)}`, a.descricao || '-'];
            }
          }),
        });
      }

      const fileName = `acerto-${resumo.nome.replace(/\s/g, '_')}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Exportar Acerto',
          text: `Acerto final de ${resumo.nome}`,
          url: savedFile.uri,
          dialogTitle: 'Compartilhar Acerto'
        });
      } else {
        doc.save(fileName);
        toast.success('PDF exportado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar ou compartilhar o PDF.');
    }
  };

  if (!safraAtiva) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Acerto</h1>
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

  const currentLabel = (workLabel || 'trabalho').charAt(0).toUpperCase() + (workLabel || 'trabalho').slice(1);

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Acerto</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{currentLabel}: {safra?.nome}</p>

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
              if (!resumo) return null;
              
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
                        <Download className="h-4 w-4" /> Exportar e Compartilhar PDF
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
