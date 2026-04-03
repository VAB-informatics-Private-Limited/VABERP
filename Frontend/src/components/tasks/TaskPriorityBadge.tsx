import { Tag } from 'antd';
import { TaskPriority, TASK_PRIORITY_OPTIONS } from '@/types/tasks';

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const opt = TASK_PRIORITY_OPTIONS.find(o => o.value === priority);
  return <Tag color={opt?.color ?? 'default'}>{opt?.label ?? priority}</Tag>;
}
