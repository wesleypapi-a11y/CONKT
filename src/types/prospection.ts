export type ProspectionStatus = 'novo' | 'em_analise' | 'orcamento_enviado' | 'aguardando_retorno' | 'fechado' | 'perdido';
export type ProspectionOrigem = 'telefone' | 'email' | 'site' | 'indicacao' | 'whatsapp' | 'outro';
export type ProspectionProbabilidade = 'baixa' | 'media' | 'alta';

export interface Prospection {
  id: string;
  nome_cliente: string;
  telefone?: string;
  email?: string;
  tipo_obra?: string;
  descricao?: string;
  valor_estimado?: number;
  prazo_estimado?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  status: ProspectionStatus;
  origem: ProspectionOrigem;
  probabilidade: ProspectionProbabilidade;
  proximo_followup?: string;
  observacoes?: string;
  orcamento_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const prospectionStatusLabels: Record<ProspectionStatus, string> = {
  novo: 'Novo',
  em_analise: 'Em Análise',
  orcamento_enviado: 'Orçamento Enviado',
  aguardando_retorno: 'Aguardando Retorno',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export const prospectionOrigemLabels: Record<ProspectionOrigem, string> = {
  telefone: 'Telefone',
  email: 'E-mail',
  site: 'Site',
  indicacao: 'Indicação',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
};

export const prospectionProbabilidadeLabels: Record<ProspectionProbabilidade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const prospectionStatusColors: Record<ProspectionStatus, string> = {
  novo: 'bg-blue-100 text-blue-800',
  em_analise: 'bg-yellow-100 text-yellow-800',
  orcamento_enviado: 'bg-purple-100 text-purple-800',
  aguardando_retorno: 'bg-orange-100 text-orange-800',
  fechado: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
};

export const prospectionProbabilidadeColors: Record<ProspectionProbabilidade, string> = {
  baixa: 'bg-gray-100 text-gray-800',
  media: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-green-100 text-green-800',
};
