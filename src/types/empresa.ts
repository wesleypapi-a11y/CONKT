export interface Empresa {
  id: string;
  razao_social: string;
  nome: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  data_inicio: string;
  data_fim: string;
  status: 'ativa' | 'inativa' | 'bloqueada';
  responsavel?: string;
  created_at?: string;
  updated_at?: string;
}
