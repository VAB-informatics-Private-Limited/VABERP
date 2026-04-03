export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  task_number: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  assigned_by?: number | null;
  created_by?: number | null;
  created_by_name?: string | null;
  module?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: number | null;
  completed_at?: string | null;
  created_date: string;
  modified_date?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  comment: string;
  created_by: number;
  created_by_name?: string | null;
  created_date: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pending',     label: 'Pending',     color: 'default'  },
  { value: 'in_progress', label: 'In Progress', color: 'blue'     },
  { value: 'completed',   label: 'Completed',   color: 'green'    },
  { value: 'cancelled',   label: 'Cancelled',   color: 'red'      },
];

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: 'default' },
  { value: 'medium', label: 'Medium', color: 'blue'    },
  { value: 'high',   label: 'High',   color: 'orange'  },
  { value: 'urgent', label: 'Urgent', color: 'red'     },
];
