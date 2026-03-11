export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface TaskBoard {
  id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  board_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  obra_id: string;
  descricao: string;
  responsavel_id: string | null;
  status: TaskStatus;
  ordem: number;
  deadline: string | null;
  column_id: string | null;
  board_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TaskWithDetails extends Task {
  obra_nome?: string;
  responsavel_nome?: string;
  column_name?: string;
  column_color?: string;
  created_by_name?: string;
}
