'use client';

import { useEffect, useState } from 'react';
import { Card, Table, Tag, Input, Select, Typography, Row, Col, Statistic } from 'antd';
import { SearchOutlined, TeamOutlined, CheckCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { getAllEmployees, getEmployeeStats } from '@/lib/api/super-admin';

const { Title } = Typography;
const { Option } = Select;

interface EmployeeRow {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: string;
  hireDate: string | null;
  createdDate: string;
  enterpriseId: number;
  enterpriseName: string;
}

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  perEnterprise: Array<{ enterpriseId: number; businessName: string; count: number }>;
}

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  suspended: 'red',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [filtered, setFiltered] = useState<EmployeeRow[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = employees;
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, statusFilter, employees]);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, statsRes] = await Promise.all([getAllEmployees(), getEmployeeStats()]);
      setEmployees(empRes.data);
      setFiltered(empRes.data);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      sorter: (a: EmployeeRow, b: EmployeeRow) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Enterprise',
      dataIndex: 'enterpriseName',
      key: 'enterpriseName',
      sorter: (a: EmployeeRow, b: EmployeeRow) =>
        (a.enterpriseName || '').localeCompare(b.enterpriseName || ''),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hireDate',
      key: 'hireDate',
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Joined',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString(),
      sorter: (a: EmployeeRow, b: EmployeeRow) =>
        new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-0">
          Employees
        </Title>
        <p className="text-slate-500 text-sm mt-1">All employees across all enterprises</p>
      </div>

      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Employees"
              value={stats?.total ?? 0}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Active"
              value={stats?.active ?? 0}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Inactive"
              value={stats?.inactive ?? 0}
              prefix={<MinusCircleOutlined className="text-slate-400" />}
              valueStyle={{ color: '#94a3b8' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Input
            placeholder="Search by name or email"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
          >
            <Option value="all">All Statuses</Option>
            <Option value="active">Active</Option>
            <Option value="inactive">Inactive</Option>
            <Option value="suspended">Suspended</Option>
          </Select>
          <span className="text-slate-500 text-sm ml-auto">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (t) => `Total ${t}` }}
        />
      </Card>
    </div>
  );
}
