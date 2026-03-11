export interface Schedule {
  id: string;
  user_id: string;
  work_id: string;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  consider_weekends: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleHoliday {
  id: string;
  schedule_id: string;
  holiday_date: string;
  name: string;
  created_at: string;
}

export interface ScheduleTask {
  id: string;
  schedule_id: string;
  name: string;
  is_macro: boolean;
  parent_id: string | null;
  duration: number;
  start_date: string | null;
  end_date: string | null;
  predecessors: string;
  progress: number;
  responsible: string;
  notes: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}
