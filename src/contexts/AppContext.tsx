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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
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

  useEffect(() => { localStorage.setItem('safras', JSON.stringify(safras)); }, [safras]);
  useEffect(() => { localStorage.setItem('funcionarios', JSON.stringify(funcionarios)); }, [funcionarios]);
  useEffect(() => { localStorage.setItem('registros', JSON.stringify(registros)); }, [registros]);
  useEffect(() => { localStorage.setItem('adiantamentos', JSON.stringify(adiantamentos)); }, [adiantamentos]);
  useEffect(() => { localStorage.setItem('ajustes', JSON.stringify(ajustes)); }, [ajustes]);
  useEffect(() => { localStorage.setItem('safraAtiva', JSON.stringify(safraAtiva)); }, [safraAtiva]);

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

  return (
    <AppContext.Provider value={{
      safras, funcionarios, registros, adiantamentos, ajustes,
      addSafra, updateSafra, deleteSafra,
      addFuncionario, deleteFuncionario,
      addRegistro, updateRegistro, deleteRegistro,
      addAdiantamento, deleteAdiantamento,
      addAjuste, deleteAjuste,
      safraAtiva, setSafraAtiva,
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
