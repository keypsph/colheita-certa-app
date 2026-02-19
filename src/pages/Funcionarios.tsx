import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Funcionario } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Funcionarios() {
  const { funcionarios, addFuncionario, deleteFuncionario, safraAtiva, safras } = useApp();
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
          <div className="space-y-2">
            {funcs.map(f => (
              <Card key={f.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <span className="font-medium">{f.nome}</span>
                  <Button variant="ghost" size="icon" onClick={() => { deleteFuncionario(f.id); toast.success('Removido!'); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            <p className="text-sm text-muted-foreground text-center mt-2">
              {funcs.length} funcionário{funcs.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
