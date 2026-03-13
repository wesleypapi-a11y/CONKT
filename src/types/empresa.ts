export interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  status: 'ativa' | 'inativa' | 'bloqueada';
  created_at?: string;
  updated_at?: string;
}
