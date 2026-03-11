export type WeatherType = 'claro' | 'nublado' | 'chuvoso';
export type WeatherCondition = 'praticavel' | 'impraticavel';
export type RDOStatus = 'preenchendo' | 'revisar' | 'aprovado';

export interface WorkDiary {
  id: string;
  user_id: string;
  work_id: string;
  report_number: number;
  report_date: string;
  day_of_week: string;
  contract_number?: string;
  contractor?: string;
  responsible?: string;
  contracted_days?: number;
  elapsed_days?: number;
  remaining_days?: number;
  morning_weather: WeatherType;
  morning_condition: WeatherCondition;
  afternoon_weather: WeatherType;
  afternoon_condition: WeatherCondition;
  night_weather: WeatherType;
  night_condition: WeatherCondition;
  rainfall_index?: string;
  status: RDOStatus;
  manual_signature?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkDiaryLabor {
  id: string;
  work_diary_id: string;
  name: string;
  quantity: number;
  observation?: string;
  created_at: string;
}

export interface WorkDiaryEquipment {
  id: string;
  work_diary_id: string;
  name: string;
  quantity: number;
  observation?: string;
  created_at: string;
}

export interface WorkDiaryActivity {
  id: string;
  work_diary_id: string;
  description: string;
  progress?: number;
  observation?: string;
  created_at: string;
}

export interface WorkDiaryOccurrence {
  id: string;
  work_diary_id: string;
  description: string;
  type?: string;
  created_at: string;
}

export interface WorkDiaryChecklist {
  id: string;
  work_diary_id: string;
  item: string;
  checked: boolean;
  observation?: string;
  created_at: string;
}

export interface WorkDiaryComment {
  id: string;
  work_diary_id: string;
  comment: string;
  created_at: string;
}

export interface WorkDiaryPhoto {
  id: string;
  work_diary_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  description?: string;
  created_at: string;
}

export interface WorkDiaryVideo {
  id: string;
  work_diary_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  description?: string;
  created_at: string;
}

export interface WorkDiaryAttachment {
  id: string;
  work_diary_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  created_at: string;
}
