export interface Budget {
  id: string;
  client_id: string;
  work_id: string;
  template: string;
  numero: string | null;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'cancelado';
  validade: string | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
