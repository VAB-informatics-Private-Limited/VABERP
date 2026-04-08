'use client';

import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeeDetails } from '@/types/employee';
import { deleteEmployee } from '@/lib/api/employees';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ColumnsType } from 'antd/es/table';

interface EmployeeTableProps {
  data: EmployeeDetails[];
  loading: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function EmployeeTable({ data, loading, pagination }: EmployeeTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmployee(id, enterpriseId!),
    onSuccess: () => {
      message.success('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => {
      message.error('Failed to delete employee');
    },
  });

  const columns: ColumnsType<EmployeeDetails> = [
    {
      title: 'Name',
      key: 'name',
      sorter: (a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
      render: (_, record) => (
        <div>
          <div className="font-medium">{`${record.first_name} ${record.last_name}`}</div>
          <div className="text-gray-500 text-sm">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
      sorter: (a, b) => (a.department_name || '').localeCompare(b.department_name || ''),
      filters: Array.from(new Set(data.map(e => e.department_name).filter(Boolean))).map(d => ({ text: d!, value: d! })),
      onFilter: (value, record) => record.department_name === value,
    },
    {
      title: 'Designation',
      dataIndex: 'designation_name',
      key: 'designation_name',
      sorter: (a, b) => (a.designation_name || '').localeCompare(b.designation_name || ''),
    },
    {
      title: 'Phone',
      dataIndex: 'phone_number',
      key: 'phone_number',
      sorter: (a, b) => (a.phone_number || '').localeCompare(b.phone_number || ''),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hire_date',
      key: 'hire_date',
      sorter: (a, b) => (a.hire_date || '').localeCompare(b.hire_date || ''),
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
          {hasPermission('employees', 'permissions', 'view') && (
            <Button
              type="text"
              icon={<KeyOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/employees/${record.id}/permissions`); }}
              title="Manage Permissions"
            />
          )}
          {hasPermission('employees', 'all_employees', 'edit') && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/employees/${record.id}/edit`); }}
            />
          )}
          {hasPermission('employees', 'all_employees', 'delete') && (
            <Popconfirm
              title="Delete Employee"
              description="Are you sure you want to delete this employee?"
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
        onClick: () => router.push(`/employees/${record.id}`),
        style: { cursor: 'pointer' },
      })}
      scroll={{ x: 1200 }}
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`,
            }
          : {
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`,
            }
      }
    />
  );
}
