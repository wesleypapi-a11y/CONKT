export interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  nome?: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  data_inicio?: string;
  data_fim?: string;
  status: 'ativa' | 'inativa' | 'bloqueada';
  responsavel?: string;
  logo_menu?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
