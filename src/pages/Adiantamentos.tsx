import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Adiantamentos() {
  const { funcionarios, adiantamentos, addAdiantamento, deleteAdiantamento, safraAtiva, safras, workLabel } = useApp();
  const [selectedFunc, setSelectedFunc] = useState<string | null>(null);
  const [centavos, setCentavos] = useState(0); // valor em centavos para input estilo banco
  const [descricao, setDescricao] = useState('');

  const safra = safras.find(s => s.id === safraAtiva);
  const funcs = funcionarios.filter(f => f.safraId === safraAtiva);

  const handleKeyPress = (key: string) => {
    if (key === 'Backspace') {
      setCentavos(Math.floor(centavos / 10));
      return;
    }
    const digit = parseInt(key);
    if (!isNaN(digit)) {
      setCentavos(prev => prev * 10 + digit);
    }
  };

  const valorFormatado = (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleAdd = () => {
    if (!selectedFunc || centavos === 0 || !safraAtiva) { toast.error('Preencha o valor'); return; }
    addAdiantamento({
      id: crypto.randomUUID(),
      funcionarioId: selectedFunc,
      safraId: safraAtiva,
      valor: centavos / 100,
      data: new Date().toISOString(),
      descricao: descricao || undefined,
    });
    setCentavos(0);
    setDescricao('');
    setSelectedFunc(null);
    toast.success('Adiantamento registrado!');
  };

  if (!safraAtiva) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Adiantamentos</h1>
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

  const funcSelecionado = funcs.find(f => f.id === selectedFunc);
  const adiantamentosDoFunc = selectedFunc
    ? adiantamentos.filter(a => a.funcionarioId === selectedFunc && a.safraId === safraAtiva)
    : [];
  const totalAdiantamentos = adiantamentosDoFunc.reduce((sum, a) => sum + a.valor, 0);

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Adianto</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{workLabel.charAt(0).toUpperCase() + workLabel.slice(1)}: {safra?.nome}</p>

        <p className="text-sm font-medium mb-2">Selecione um funcionário:</p>
        {funcs.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              Nenhum funcionário cadastrado nesta safra.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {funcs.map(f => {
              const total = adiantamentos
                .filter(a => a.funcionarioId === f.id && a.safraId === safraAtiva)
                .reduce((sum, a) => sum + a.valor, 0);
              return (
                <Card
                  key={f.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => { setSelectedFunc(f.id); setCentavos(0); }}
                >
                  <CardContent className="py-3 text-center">
                    <p className="font-medium text-sm">{f.nome}</p>
                    {total > 0 && <p className="text-xs text-accent">R$ {total.toFixed(2)}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!selectedFunc} onOpenChange={(open) => { if (!open) { setSelectedFunc(null); setCentavos(0); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adiantamento - {funcSelecionado?.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Input estilo banco digital */}
              <div>
                <Label>Valor (R$)</Label>
                <div
                  className="bg-muted rounded-xl p-4 text-center cursor-text"
                  tabIndex={0}
                  onKeyDown={e => {
                    e.preventDefault();
                    if (e.key === 'Backspace') {
                      handleKeyPress('Backspace');
                    } else if (/^\d$/.test(e.key)) {
                      handleKeyPress(e.key);
                    }
                  }}
                >
                  <p className="text-xs text-muted-foreground mb-1">Toque e digite o valor</p>
                  <p className="text-3xl font-bold text-foreground">R$ {valorFormatado}</p>
                </div>
                {/* Teclado numérico para mobile */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {['1','2','3','4','5','6','7','8','9','',  '0', '⌫'].map((key, i) => (
                    key ? (
                      <Button
                        key={i}
                        variant="outline"
                        className="h-12 text-lg font-semibold"
                        onClick={() => handleKeyPress(key === '⌫' ? 'Backspace' : key)}
                      >
                        {key}
                      </Button>
                    ) : <div key={i} />
                  ))}
                </div>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Compra no mercado" />
              </div>
              <Button onClick={handleAdd} className="w-full">Registrar Adiantamento</Button>

              {adiantamentosDoFunc.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">Histórico (Total: R$ {totalAdiantamentos.toFixed(2)})</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {adiantamentosDoFunc.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">R$ {a.valor.toFixed(2)}</span>
                          <span className="text-muted-foreground ml-2">{format(new Date(a.data), 'dd/MM/yyyy')}</span>
                          {a.descricao && <span className="text-muted-foreground ml-1">- {a.descricao}</span>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { deleteAdiantamento(a.id); toast.success('Removido'); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
