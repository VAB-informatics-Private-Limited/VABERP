'use client';

import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { JobCard, JOB_CARD_STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/types/manufacturing';
import { deleteJobCard } from '@/lib/api/manufacturing';
import { useAuthStore } from '@/stores/authStore';
import type { ColumnsType } from 'antd/es/table';

interface JobCardTableProps {
  data: JobCard[];
  loading: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function JobCardTable({ data, loading, pagination }: JobCardTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteJobCard(id, enterpriseId!),
    onSuccess: () => {
      message.success('Job card deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
    },
    onError: () => {
      message.error('Failed to delete job card');
    },
  });

  const getStatusColor = (status: string) => {
    const option = JOB_CARD_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const option = JOB_CARD_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.label || status;
  };

  const getPriorityColor = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((p) => p.value === priority);
    return option?.color || 'default';
  };

  const getPriorityLabel = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((p) => p.value === priority);
    return option?.label || priority;
  };

  const columns: ColumnsType<JobCard> = [
    {
      title: 'Job Card #',
      dataIndex: 'job_card_number',
      key: 'job_card_number',
      sorter: (a, b) => a.job_card_number.localeCompare(b.job_card_number),
      render: (text, record) => (
        <div>
          <span className="font-medium text-blue-600">{text}</span>
          {record.status === 'ready_for_dispatch' && (
            <div className="text-xs font-bold text-purple-600 mt-0.5">READY FOR DISPATCH</div>
          )}
        </div>
      ),
    },
    {
      title: 'Product',
      key: 'product',
      sorter: (a, b) => (a.product_name || '').localeCompare(b.product_name || ''),
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          {record.product_code && (
            <div className="text-gray-500 text-sm">SKU: {record.product_code}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (qty, record) => `${qty} ${record.unit || 'units'}`,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      filters: PRIORITY_OPTIONS.map((p) => ({ text: p.label, value: p.value })),
      onFilter: (value, record) => record.priority === value,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>{getPriorityLabel(priority)}</Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      sorter: (a, b) => (a.due_date || '').localeCompare(b.due_date || ''),
      render: (date) => {
        if (!date) return '-';
        const isOverdue = new Date(date) < new Date() && date !== 'completed';
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {date}
          </span>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: JOB_CARD_STATUS_OPTIONS.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      render: (text) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/manufacturing/${record.id}`)}
            title="View Details"
          />
          {record.status === 'pending' && (
            <Popconfirm
              title="Delete Job Card"
              description="Are you sure you want to delete this job card?"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      rowClassName={(record) =>
        record.status === 'ready_for_dispatch'
          ? 'bg-purple-50 !border-l-4 !border-l-purple-500'
          : ''
      }
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} job cards`,
            }
          : {
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} job cards`,
            }
      }
      scroll={{ x: 1200 }}
    />
  );
}
