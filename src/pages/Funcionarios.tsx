import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Funcionario } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Plus, Trash2, AlertCircle, Play, Square, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Funcionarios() {
  const { funcionarios, addFuncionario, deleteFuncionario, safraAtiva, safras, startPeriod, finishPeriod, registros } = useApp();
  const [nome, setNome] = useState('');

  const safra = safras.find(s => s.id === safraAtiva);
  const funcs = funcionarios.filter(f => f.safraId === safraAtiva);

  const handleAdd = () => {
    if (!nome.trim()) { toast.error('Digite o nome do funcionário'); return; }
    if (!safraAtiva) { toast.error('Selecione uma safra primeiro'); return; }
    addFuncionario({
      id: crypto.randomUUID(),
      nome: nome.trim(),
      safraId: safraAtiva,
    });
    setNome('');
    toast.success('Funcionário adicionado!');
  };

  if (!safraAtiva) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Funcionários</h1>
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
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Funcionários</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Safra: {safra?.nome}</p>

        <div className="flex gap-2 mb-4">
          <Input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome do funcionário"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {funcs.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              Nenhum funcionário cadastrado nesta safra.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {funcs.map(f => {
              const registroAtivo = registros.find(r => r.funcionarioId === f.id && r.status === 'iniciado');
              
              return (
                <Card key={f.id} className={cn("transition-all", registroAtivo && "border-primary bg-primary/5 shadow-md")}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg">{f.nome}</span>
                        {registroAtivo && (
                          <span className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
                            Trabalhando agora
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { deleteFuncionario(f.id); toast.success('Removido!'); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      {!registroAtivo ? (
                        <Button 
                          className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white font-bold h-12" 
                          onClick={() => {
                            startPeriod(f.id);
                            toast.success(`Trabalho iniciado para ${f.nome}`);
                          }}
                        >
                          <Play className="h-4 w-4 fill-current" /> Iniciar Ponto
                        </Button>
                      ) : (
                        <Button 
                          variant="destructive" 
                          className="flex-1 gap-2 font-bold h-12" 
                          onClick={() => {
                            finishPeriod(registroAtivo.id);
                            toast.success(`Trabalho finalizado para ${f.nome}`);
                          }}
                        >
                          <Square className="h-4 w-4 fill-current" /> Finalizar Ponto
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <p className="text-sm text-muted-foreground text-center mt-4">
              {funcs.length} funcionário{funcs.length !== 1 ? 's' : ''} cadastrado{funcs.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
