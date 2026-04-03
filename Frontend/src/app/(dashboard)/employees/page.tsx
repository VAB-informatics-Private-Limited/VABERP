'use client';

import { useState, useMemo } from 'react';
import { Typography, Button, Card, Space, Input } from 'antd';
import { PlusOutlined, TeamOutlined, IdcardOutlined, SearchOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { getEmployees } from '@/lib/api/employees';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function EmployeesPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();
  const [searchText, setSearchText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', enterpriseId],
    queryFn: () => getEmployees(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const filteredData = useMemo(() => {
    if (!data?.data || !searchText) return data?.data || [];
    const search = searchText.toLowerCase();
    return data.data.filter(
      (emp) =>
        emp.first_name?.toLowerCase().includes(search) ||
        emp.last_name?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search) ||
        emp.phone_number?.toLowerCase().includes(search) ||
        emp.department_name?.toLowerCase().includes(search) ||
        emp.designation_name?.toLowerCase().includes(search)
    );
  }, [data?.data, searchText]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">
          Employees
        </Title>
        <div className="flex flex-wrap gap-2">
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'first_name', title: 'First Name' },
              { key: 'last_name', title: 'Last Name' },
              { key: 'email', title: 'Email' },
              { key: 'phone_number', title: 'Phone' },
              { key: 'department_name', title: 'Department' },
              { key: 'designation_name', title: 'Designation' },
              { key: 'status', title: 'Status' },
            ]}
            filename="employees"
            title="Employees"
            disabled={!data?.data?.length}
          />
          {hasPermission('employees', 'all_employees', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/employees/add')}>
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search employees..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          {hasPermission('employees', 'departments', 'view') && (
            <Button icon={<TeamOutlined />} onClick={() => router.push('/employees/departments')}>
              Manage Departments
            </Button>
          )}
          {hasPermission('employees', 'designations', 'view') && (
            <Button icon={<IdcardOutlined />} onClick={() => router.push('/employees/designations')}>
              Manage Designations
            </Button>
          )}
          {hasPermission('employees', 'all_employees', 'view') && (
            <Button icon={<ApartmentOutlined />} onClick={() => router.push('/employees/reporters')}>
              Manage Reporters
            </Button>
          )}
        </Space>
      </div>

      <Card className="card-shadow">
        <EmployeeTable data={filteredData} loading={isLoading} />
      </Card>
    </div>
  );
}
