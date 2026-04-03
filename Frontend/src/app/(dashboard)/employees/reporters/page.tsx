'use client';

import { useState, useMemo } from 'react';
import { Typography, Button, Card, Table, Switch, Input, Space, message } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployees, setReportingHead } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { EmployeeDetails } from '@/types/employee';

const { Title } = Typography;

export default function ReportersPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', enterpriseId],
    queryFn: () => getEmployees(enterpriseId!, 1, 500),
    enabled: !!enterpriseId,
  });

  const filteredData = useMemo(() => {
    const list = data?.data ?? [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(
      e =>
        e.first_name?.toLowerCase().includes(s) ||
        e.last_name?.toLowerCase().includes(s) ||
        e.department_name?.toLowerCase().includes(s) ||
        e.designation_name?.toLowerCase().includes(s),
    );
  }, [data?.data, search]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) => setReportingHead(id, value),
    onSuccess: (_, { value }) => {
      message.success(value ? 'Marked as Manager' : 'Removed as Manager');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['reporters'] });
    },
    onError: () => message.error('Failed to update'),
  });

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: any, r: EmployeeDetails) => `${r.first_name} ${r.last_name}`,
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Designation',
      dataIndex: 'designation_name',
      key: 'designation_name',
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <span className={v === 'active' ? 'text-green-600 font-medium' : 'text-gray-400'}>{v}</span>
      ),
    },
    {
      title: 'Manager / Reporting Head',
      key: 'is_reporting_head',
      render: (_: any, r: EmployeeDetails) => (
        <Switch
          checked={!!r.is_reporting_head}
          onChange={(checked) => toggleMutation.mutate({ id: r.id, value: checked })}
          loading={toggleMutation.isPending}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/employees')} />
        <Title level={4} className="!mb-0">Manage Reporting Heads (Managers)</Title>
      </div>

      <Card className="card-shadow mb-4">
        <p className="text-gray-500 text-sm">
          Toggle <strong>ON</strong> for employees who are managers or supervisors.
          Only these employees will appear in the <strong>"Reports To"</strong> dropdown when creating other employees.
        </p>
      </Card>

      <Card className="card-shadow">
        <Space className="mb-4">
          <Input
            placeholder="Search employees..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
        </Space>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </Card>
    </div>
  );
}
