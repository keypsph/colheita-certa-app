import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Safra, Funcionario, RegistroHoras, Adiantamento, AjusteIndividual } from '@/types';

interface AppContextType {
  safras: Safra[];
  funcionarios: Funcionario[];
  registros: RegistroHoras[];
  adiantamentos: Adiantamento[];
  ajustes: AjusteIndividual[];
  addSafra: (safra: Safra) => void;
  updateSafra: (safra: Safra) => void;
  deleteSafra: (id: string) => void;
  addFuncionario: (f: Funcionario) => void;
  deleteFuncionario: (id: string) => void;
  addRegistro: (r: RegistroHoras) => void;
  updateRegistro: (r: RegistroHoras) => void;
  deleteRegistro: (id: string) => void;
  addAdiantamento: (a: Adiantamento) => void;
  deleteAdiantamento: (id: string) => void;
  addAjuste: (a: AjusteIndividual) => void;
  deleteAjuste: (id: string) => void;
  safraAtiva: string | null;
  setSafraAtiva: (id: string | null) => void;
  workLabel: string;
  setWorkLabel: (label: string) => void;
  startPeriod: (funcionarioId: string, date?: string, startTime?: string) => string; // returns registro id
  finishPeriod: (registroId: string, endTime?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored || stored === 'null' || stored === 'undefined') return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [safras, setSafras] = useState<Safra[]>(() => loadFromStorage('safras', []));
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(() => loadFromStorage('funcionarios', []));
  const [registros, setRegistros] = useState<RegistroHoras[]>(() => loadFromStorage('registros', []));
  const [adiantamentos, setAdiantamentos] = useState<Adiantamento[]>(() => loadFromStorage('adiantamentos', []));
  const [ajustes, setAjustes] = useState<AjusteIndividual[]>(() => loadFromStorage('ajustes', []));
  const [safraAtiva, setSafraAtiva] = useState<string | null>(() => loadFromStorage('safraAtiva', null));
  const [workLabel, setWorkLabel] = useState<string>(() => loadFromStorage('workLabel', 'trabalho'));

  useEffect(() => { localStorage.setItem('safras', JSON.stringify(safras)); }, [safras]);
  useEffect(() => { localStorage.setItem('funcionarios', JSON.stringify(funcionarios)); }, [funcionarios]);
  useEffect(() => { localStorage.setItem('registros', JSON.stringify(registros)); }, [registros]);
  useEffect(() => { localStorage.setItem('adiantamentos', JSON.stringify(adiantamentos)); }, [adiantamentos]);
  useEffect(() => { localStorage.setItem('ajustes', JSON.stringify(ajustes)); }, [ajustes]);
  useEffect(() => { localStorage.setItem('safraAtiva', JSON.stringify(safraAtiva)); }, [safraAtiva]);
  useEffect(() => { localStorage.setItem('workLabel', JSON.stringify(workLabel)); }, [workLabel]);

  const addSafra = (s: Safra) => setSafras(prev => [...prev, s]);
  const updateSafra = (s: Safra) => setSafras(prev => prev.map(x => x.id === s.id ? s : x));
  const deleteSafra = (id: string) => {
    setSafras(prev => prev.filter(x => x.id !== id));
    setFuncionarios(prev => prev.filter(x => x.safraId !== id));
    setRegistros(prev => prev.filter(x => x.safraId !== id));
    setAdiantamentos(prev => prev.filter(x => x.safraId !== id));
    setAjustes(prev => prev.filter(x => x.safraId !== id));
    if (safraAtiva === id) setSafraAtiva(null);
  };
  const addFuncionario = (f: Funcionario) => setFuncionarios(prev => [...prev, f]);
  const deleteFuncionario = (id: string) => {
    setFuncionarios(prev => prev.filter(x => x.id !== id));
    setAdiantamentos(prev => prev.filter(x => x.funcionarioId !== id));
    setAjustes(prev => prev.filter(x => x.funcionarioId !== id));
  };

  const addRegistro = (r: RegistroHoras) => setRegistros(prev => [...prev, r]);
  const updateRegistro = (r: RegistroHoras) => setRegistros(prev => prev.map(x => x.id === r.id ? r : x));
  const deleteRegistro = (id: string) => setRegistros(prev => prev.filter(x => x.id !== id));
  const addAdiantamento = (a: Adiantamento) => setAdiantamentos(prev => [...prev, a]);
  const deleteAdiantamento = (id: string) => setAdiantamentos(prev => prev.filter(x => x.id !== id));
  const addAjuste = (a: AjusteIndividual) => setAjustes(prev => [...prev, a]);
  const deleteAjuste = (id: string) => setAjustes(prev => prev.filter(x => x.id !== id));

  const startPeriod = (funcionarioId: string, date?: string, startTime?: string) => {
    if (!safraAtiva) throw new Error('Nenhuma safra/trabalho ativa');
    const now = startTime ? new Date(startTime) : new Date();
    const registro: RegistroHoras = {
      id: crypto.randomUUID(),
      safraId: safraAtiva,
      funcionarioId,
      data: date ? new Date(date).toISOString() : now.toISOString(),
      startTime: now.toISOString(),
      status: 'iniciado',
    };
    
    setRegistros(prev => {
      const filtered = prev.filter(r => !(r.funcionarioId === funcionarioId && r.status === 'iniciado'));
      return [...filtered, registro];
    });
    
    return registro.id;
  };

  const finishPeriod = (registroId: string, endTime?: string) => {
    setRegistros(prev => prev.map(r => {
      if (r.id !== registroId) return r;
      const end = endTime ? new Date(endTime) : new Date();
      const updated: RegistroHoras = { ...r, endTime: end.toISOString(), status: 'finalizado' };
      if (r.startTime) {
        const start = new Date(r.startTime);
        const diffMs = end.getTime() - start.getTime();
        const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
        updated.horasTrabalhadas = Math.round((hours + Number.EPSILON) * 100) / 100;
      }
      return updated;
    }));
  };

  return (
    <AppContext.Provider value={{
      safras, funcionarios, registros, adiantamentos, ajustes,
      addSafra, updateSafra, deleteSafra,
      addFuncionario, deleteFuncionario,
      addRegistro, updateRegistro, deleteRegistro,
      addAdiantamento, deleteAdiantamento,
      addAjuste, deleteAjuste,
      safraAtiva, setSafraAtiva,
      workLabel: workLabel || 'trabalho',
      setWorkLabel,
      startPeriod, finishPeriod,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
