'use client';

import { Card, Button, Typography, Descriptions, Select, message, Spin } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import { getTaskById, getTaskComments, updateTaskStatus } from '@/lib/api/tasks';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TaskComments } from '@/components/tasks/TaskComments';
import { TASK_STATUS_OPTIONS } from '@/types/tasks';

const { Title } = Typography;

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const { getEnterpriseId, userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const canEdit = userType === 'enterprise' || hasPermission('tasks', 'my_tasks', 'edit');

  const { data: taskRes, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId),
    enabled: !!taskId,
  });

  const { data: commentsRes } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => getTaskComments(taskId),
    enabled: !!taskId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateTaskStatus(taskId, status),
    onSuccess: () => {
      message.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
    },
    onError: () => message.error('Failed to update status'),
  });

  const task = taskRes?.data;

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  }

  if (!task) return <div className="text-center py-20 text-gray-400">Task not found</div>;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() &&
    task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/tasks')} />
          <div>
            <Title level={4} className="!mb-0">{task.title}</Title>
            <span className="text-xs text-gray-400 font-mono">{task.task_number}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Select
              value={task.status}
              onChange={v => statusMutation.mutate(v)}
              loading={statusMutation.isPending}
              style={{ width: 140 }}
              options={TASK_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            />
          )}
          {canEdit && (
            <Button icon={<EditOutlined />} onClick={() => router.push(`/tasks/${taskId}/edit`)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Detail panel */}
        <div className="flex-1 min-w-0 space-y-4">
          <Card className="card-shadow" title="Task Details">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Status"><TaskStatusBadge status={task.status as any} /></Descriptions.Item>
              <Descriptions.Item label="Priority"><TaskPriorityBadge priority={task.priority as any} /></Descriptions.Item>
              <Descriptions.Item label="Assigned To">{task.assigned_to_name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Created By">{task.created_by_name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : '—'}
                  {isOverdue && ' (Overdue)'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Module">{task.module ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(task.created_date).toLocaleDateString('en-IN')}</Descriptions.Item>
              {task.completed_at && (
                <Descriptions.Item label="Completed">
                  {new Date(task.completed_at).toLocaleDateString('en-IN')}
                </Descriptions.Item>
              )}
            </Descriptions>
            {task.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Comments panel */}
        <div className="w-80 flex-shrink-0">
          <Card className="card-shadow" title={`Comments (${commentsRes?.data?.length ?? 0})`}>
            <TaskComments taskId={taskId} comments={commentsRes?.data ?? []} />
          </Card>
        </div>
      </div>
    </div>
  );
}
