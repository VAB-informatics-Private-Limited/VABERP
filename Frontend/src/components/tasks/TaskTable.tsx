import { Table, Button, Popconfirm, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Task } from '@/types/tasks';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';

interface Props {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onPageChange: (page: number) => void;
  onDelete: (id: number) => void;
}

export function TaskTable({ tasks, total, page, pageSize, loading, canEdit, canDelete, onPageChange, onDelete }: Props) {
  const router = useRouter();

  const isOverdue = (t: Task) =>
    t.due_date && new Date(t.due_date) < new Date() &&
    t.status !== 'completed' && t.status !== 'cancelled';

  const columns = [
    {
      title: 'Task #',
      dataIndex: 'task_number',
      key: 'task_number',
      width: 110,
      render: (v: string) => <span className="font-mono text-xs text-gray-500">{v}</span>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (v: string, r: Task) => (
        <div>
          <span
            className="font-medium text-blue-600 cursor-pointer hover:underline"
            onClick={() => router.push(`/tasks/${r.id}`)}
          >
            {v}
          </span>
          {isOverdue(r) && <span className="ml-2 text-xs text-red-500 font-medium">Overdue</span>}
          {r.module && <span className="ml-2 text-xs text-gray-400">[{r.module}]</span>}
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (v: string) => <TaskPriorityBadge priority={v as any} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: string) => <TaskStatusBadge status={v as any} />,
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      width: 150,
      render: (v: string) => v || <span className="text-gray-400">—</span>,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 110,
      render: (v: string, r: Task) => v ? (
        <span className={isOverdue(r) ? 'text-red-500 font-medium' : ''}>
          {new Date(v).toLocaleDateString('en-IN')}
        </span>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, r: Task) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${r.id}`); }} />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${r.id}/edit`); }} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm title="Delete task?" onConfirm={() => onDelete(r.id)} okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="id"
      loading={loading}
      size="small"
      onRow={(record) => ({
        onClick: () => router.push(`/tasks/${record.id}`),
        style: { cursor: 'pointer' },
      })}
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: onPageChange,
        showSizeChanger: false,
        showTotal: (t) => `${t} tasks`,
      }}
      rowClassName={(r) => isOverdue(r) ? 'bg-red-50' : ''}
    />
  );
}
