export type ClientType = 'fisica' | 'juridica';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  type: ClientType;
  cpf_cnpj?: string;
  rg_ie?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  profession?: string;
  observation?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  zip_code?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  state?: string;
  city?: string;
  photo_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  observation?: string;
  is_main: boolean;
  has_access: boolean;
  created_at: string;
}

export interface ClientAttachment {
  id: string;
  client_id: string;
  folder_id?: string | null;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  uploaded_at: string;
}

export interface ClientFolder {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
}

export interface ClientPermission {
  id: string;
  client_id: string;
  module_name: string;
  portal_access: boolean;
  mobile_access: boolean;
  created_at: string;
}

export type ProductType = 'Plano Start' | 'Acompanhamento de obra';

export type PlanoStartCategory = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante' | 'Personalizado';

export type ProductStatus = 'ativo' | 'concluido' | 'cancelado';

export interface ClientProduct {
  id: string;
  client_id: string;
  product_type: ProductType;
  plano_category?: PlanoStartCategory;
  value?: number;
  payment_method?: string;
  installments?: number;
  contract_date?: string;
  estimated_end_date?: string;
  duration_months?: number;
  obra_address?: string;
  status: ProductStatus;
  observations?: string;
  contract_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const AVAILABLE_MODULES = [
  'Aprovação',
  'Dia a dia da obra',
  'EVF - Estudo de Viabilidade Financeira',
  'Financeiro',
  'Financeiro - Anexar comprovante',
  'Financeiro - Gastos de obra',
  'Financeiro - NFe',
  'Fornecedores movimentados',
  'Fornecedores recomendados',
  'Gráfico previsto x realizado (versão antiga)',
  'Gráfico previsto x realizado (versão nova)',
  'Mensagens',
  'Notificação diária documentos a vencer',
  'Pasta da obra',
  'Receber Mensagens por E-mail',
  'Receber Mensagens por WhatsApp',
  'Medição de obra',
  'Financeiro - Compromissos'
];
