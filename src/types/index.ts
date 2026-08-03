export interface Safra {
  id: string;
  nome: string;
  dataInicio?: string; // ISO date string - opcional
  dataFim?: string;    // opcional
  valorDiaria: number;
  horasPadrao: number;
}

export interface Funcionario {
  id: string;
  nome: string;
  safraId: string;
  valorDiaria?: number;
}

export interface RegistroHoras {
  id: string;
  safraId: string;
  funcionarioId?: string; // opcional: pode ser um registro por funcionário
  data: string; // data do registro (ISO)
  startTime?: string; // ISO timestamp quando o período foi iniciado
  endTime?: string; // ISO timestamp quando finalizado
  horasTrabalhadas?: number; // em horas (float). Opcional para compatibilidade com registros antigos
  status: 'iniciado' | 'finalizado' | 'trabalhou' | 'nao_trabalhou' | 'outro';
  motivoOutro?: string;
}

export interface Adiantamento {
  id: string;
  funcionarioId: string;
  safraId: string;
  valor: number;
  data: string;
  descricao?: string;
}

export interface AjusteIndividual {
  id: string;
  funcionarioId: string;
  safraId: string;
  data: string;
  tipo: 'ausencia' | 'horas_diferentes' | 'desconto';
  horasTrabalhadas?: number;
  valorDesconto?: number;
  motivo?: string;
}
