export type SupplierType = 'fisica' | 'juridica';

export interface Supplier {
  id: string;
  user_id: string;
  type: SupplierType;
  name: string;
  fantasy_name?: string;
  document?: string;
  ie?: string;
  observation?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  state?: string;
  city?: string;
  recommended_partner: boolean;
  active: boolean;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierBankInfo {
  id: string;
  supplier_id: string;
  bank?: string;
  agency?: string;
  account?: string;
  pix_key?: string;
  additional_info?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierVendor {
  id: string;
  supplier_id: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  observation?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierCategory {
  id: string;
  supplier_id: string;
  category_name: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierQuality {
  id: string;
  supplier_id: string;
  rating: number;
  qualified: boolean;
  occurrence_history?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierFolder {
  id: string;
  supplier_id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierAttachment {
  id: string;
  supplier_id: string;
  folder_id?: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierCertification {
  id: string;
  supplier_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

export const SUPPLIER_CATEGORIES = [
  'Acabamento',
  'Aglomerantes',
  'Genérico',
  'Madeira',
  'Mão de obra'
];
