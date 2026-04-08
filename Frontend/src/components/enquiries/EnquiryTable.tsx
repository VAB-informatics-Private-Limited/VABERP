'use client';

import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, PhoneOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Enquiry, INTEREST_STATUS_OPTIONS } from '@/types/enquiry';
import { deleteEnquiry } from '@/lib/api/enquiries';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ColumnsType } from 'antd/es/table';

interface EnquiryTableProps {
  data: Enquiry[];
  loading: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function EnquiryTable({ data, loading, pagination }: EnquiryTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEnquiry(id, enterpriseId!),
    onSuccess: () => {
      message.success('Enquiry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    },
    onError: () => {
      message.error('Failed to delete enquiry');
    },
  });

  const getStatusColor = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.label || status;
  };

  const columns: ColumnsType<Enquiry> = [
    {
      title: 'Customer',
      key: 'customer',
      sorter: (a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.customer_name}</div>
          {record.business_name && (
            <div className="text-gray-500 text-sm">{record.business_name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-1">
            <PhoneOutlined className="text-gray-400" />
            {record.customer_mobile}
          </div>
          {record.customer_email && (
            <div className="text-gray-500 text-sm">{record.customer_email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      sorter: (a, b) => (a.source || '').localeCompare(b.source || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Interest Status',
      dataIndex: 'interest_status',
      key: 'interest_status',
      sorter: (a, b) => a.interest_status.localeCompare(b.interest_status),
      filters: INTEREST_STATUS_OPTIONS.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.interest_status === value,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Next Follow-up',
      dataIndex: 'next_followup_date',
      key: 'next_followup_date',
      sorter: (a, b) => (a.next_followup_date || '').localeCompare(b.next_followup_date || ''),
      render: (date) => {
        if (!date) return '-';
        const isOverdue = new Date(date) < new Date();
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {date}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      title: 'Assigned To',
      dataIndex: 'employee_name',
      key: 'employee_name',
      sorter: (a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Created',
      dataIndex: 'created_date',
      key: 'created_date',
      sorter: (a, b) => (a.created_date || '').localeCompare(b.created_date || ''),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={(e) => { e.stopPropagation(); router.push(`/enquiries/${record.id}`); }}
          />
          {hasPermission('enquiry', 'enquiries', 'edit') && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/enquiries/${record.id}/edit`); }}
            />
          )}
          {hasPermission('enquiry', 'enquiries', 'delete') && (
            <Popconfirm
              title="Delete Enquiry"
              description="Are you sure you want to delete this enquiry?"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
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
      onRow={(record) => ({
        onClick: () => router.push(`/enquiries/${record.id}`),
        style: { cursor: 'pointer' },
      })}
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} enquiries`,
            }
          : {
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} enquiries`,
            }
      }
      scroll={{ x: 1200 }}
    />
  );
}
