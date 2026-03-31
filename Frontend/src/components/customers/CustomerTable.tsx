'use client';

import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/types/customer';
import { deleteCustomer } from '@/lib/api/customers';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ColumnsType } from 'antd/es/table';

interface CustomerTableProps {
  data: Customer[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function CustomerTable({ data, loading, pagination }: CustomerTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(id, enterpriseId!),
    onSuccess: () => {
      message.success('Customer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: () => {
      message.error('Failed to delete customer');
    },
  });

  const columns: ColumnsType<Customer> = [
    {
      title: 'Customer Name',
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a, b) => a.customer_name.localeCompare(b.customer_name),
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          {record.business_name && (
            <div className="text-gray-500 text-sm">{record.business_name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      sorter: (a, b) => a.mobile.localeCompare(b.mobile),
      render: (_, record) => (
        <div>
          <div>{record.mobile}</div>
          {record.email && <div className="text-gray-500 text-sm">{record.email}</div>}
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      sorter: (a, b) => (a.city || '').localeCompare(b.city || ''),
      render: (_, record) => (
        <div>
          {record.city && <span>{record.city}</span>}
          {record.city && record.state && <span>, </span>}
          {record.state && <span>{record.state}</span>}
        </div>
      ),
    },
    {
      title: 'GST Number',
      dataIndex: 'gst_number',
      key: 'gst_number',
      sorter: (a, b) => (a.gst_number || '').localeCompare(b.gst_number || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      ),
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
            onClick={() => router.push(`/customers/${record.id}`)}
          />
          {hasPermission('sales', 'customers', 'edit') && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/customers/${record.id}/edit`)}
            />
          )}
          {hasPermission('sales', 'customers', 'delete') && (
            <Popconfirm
              title="Delete Customer"
              description="Are you sure you want to delete this customer?"
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
      scroll={{ x: 800 }}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} customers`,
      }}
    />
  );
}
