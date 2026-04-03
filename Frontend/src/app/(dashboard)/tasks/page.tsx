'use client';

import { useState } from 'react';
import { Typography, Button, Card, message } from 'antd';
import { PlusOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import { getTaskList, getTaskStats, deleteTask } from '@/lib/api/tasks';
import { TaskKpiBar } from '@/components/tasks/TaskKpiBar';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { TaskTable } from '@/components/tasks/TaskTable';

const { Title } = Typography;

export default function TasksPage() {
  const router = useRouter();
  const { getEnterpriseId, userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const canCreate = userType === 'enterprise' || hasPermission('tasks', 'my_tasks', 'create');
  const canEdit   = userType === 'enterprise' || hasPermission('tasks', 'my_tasks', 'edit');
  const canDelete = userType === 'enterprise' || hasPermission('tasks', 'my_tasks', 'delete');

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['task-stats', enterpriseId],
    queryFn: getTaskStats,
    enabled: !!enterpriseId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', enterpriseId, page, pageSize, search, status, priority],
    queryFn: () => getTaskList({ page, pageSize, search, status, priority }),
    enabled: !!enterpriseId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      message.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
    },
    onError: () => message.error('Failed to delete task'),
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };
  const handlePriority = (v: string) => { setPriority(v); setPage(1); };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Title level={4} className="!mb-1 flex items-center gap-2">
            <CheckSquareOutlined style={{ color: '#2563eb' }} /> Tasks
          </Title>
          <p className="text-gray-500 text-sm">Manage and track tasks across your team</p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/tasks/add')}>
            New Task
          </Button>
        )}
      </div>

      <TaskKpiBar stats={statsData?.data} loading={statsLoading} />

      <Card className="card-shadow">
        <TaskFilters
          search={search}
          status={status}
          priority={priority}
          onSearch={handleSearch}
          onStatus={handleStatus}
          onPriority={handlePriority}
        />
        <TaskTable
          tasks={data?.data ?? []}
          total={data?.totalRecords ?? 0}
          page={page}
          pageSize={pageSize}
          loading={isLoading}
          canEdit={canEdit}
          canDelete={canDelete}
          onPageChange={setPage}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </Card>
    </div>
  );
}
