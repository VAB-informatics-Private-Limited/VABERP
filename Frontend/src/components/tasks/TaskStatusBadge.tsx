import { Tag } from 'antd';
import { TaskStatus, TASK_STATUS_OPTIONS } from '@/types/tasks';

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const opt = TASK_STATUS_OPTIONS.find(o => o.value === status);
  return <Tag color={opt?.color ?? 'default'}>{opt?.label ?? status}</Tag>;
}
