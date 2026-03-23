'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Row, Col, Table, Button, Spin, Progress, Tag, Input, Select } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { Dayjs } from 'dayjs';
import { getEmployeePerformanceReport } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { BarChartWidget } from '@/components/reports/BarChartWidget';
import { EmployeeReport } from '@/types/reports';
import { exportToCSV } from '@/lib/utils/export';

const { Title } = Typography;

export default function EmployeePerformanceReportPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>();

  const filters = useMemo(
    () => ({
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    [dateRange]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['employee-performance-report', enterpriseId, filters],
    queryFn: () => getEmployeePerformanceReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const employees = data?.data || [];

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  }, [employees]);

  const filteredData = useMemo(() => {
    let result = employees;

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.employee_name?.toLowerCase().includes(search) ||
          emp.department?.toLowerCase().includes(search) ||
          emp.designation?.toLowerCase().includes(search)
      );
    }

    if (departmentFilter) {
      result = result.filter((emp) => emp.department === departmentFilter);
    }

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof EmployeeReport];
        const bVal = b[sortField as keyof EmployeeReport];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'ascend' ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'ascend' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    return result;
  }, [employees, searchText, departmentFilter, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const handleClear = () => {
    setDateRange(null);
    setSearchText('');
    setDepartmentFilter(undefined);
    setPage(1);
    setSortField(undefined);
    setSortOrder(undefined);
  };

  const handleExport = () => {
    if (filteredData.length > 0) {
      exportToCSV(filteredData, 'employee-performance-report', [
        { key: 'employee_name', title: 'Employee' },
        { key: 'department', title: 'Department' },
        { key: 'designation', title: 'Designation' },
        { key: 'total_enquiries', title: 'Enquiries' },
        { key: 'total_prospects', title: 'Prospects' },
        { key: 'total_conversions', title: 'Conversions' },
        { key: 'total_followups', title: 'Follow-ups' },
        { key: 'conversion_rate', title: 'Conversion Rate %' },
        { key: 'average_response_time', title: 'Avg Response Time (hrs)' },
      ]);
    }
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<EmployeeReport> | SorterResult<EmployeeReport>[]
  ) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setPageSize(pagination.pageSize);

    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (singleSorter.field) {
      setSortField(singleSorter.field as string);
      setSortOrder(singleSorter.order || undefined);
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

  const columns: ColumnsType<EmployeeReport> = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      sorter: true,
      sortOrder: sortField === 'employee_name' ? sortOrder : undefined,
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sorter: true,
      sortOrder: sortField === 'department' ? sortOrder : undefined,
      responsive: ['md'],
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      responsive: ['lg'],
    },
    {
      title: 'Enquiries',
      dataIndex: 'total_enquiries',
      key: 'total_enquiries',
      sorter: true,
      sortOrder: sortField === 'total_enquiries' ? sortOrder : undefined,
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Prospects',
      dataIndex: 'total_prospects',
      key: 'total_prospects',
      sorter: true,
      sortOrder: sortField === 'total_prospects' ? sortOrder : undefined,
      render: (val) => <Tag color="orange">{val}</Tag>,
    },
    {
      title: 'Conversions',
      dataIndex: 'total_conversions',
      key: 'total_conversions',
      sorter: true,
      sortOrder: sortField === 'total_conversions' ? sortOrder : undefined,
      render: (val) => <Tag color="green">{val}</Tag>,
    },
    {
      title: 'Follow-ups',
      dataIndex: 'total_followups',
      key: 'total_followups',
      sorter: true,
      sortOrder: sortField === 'total_followups' ? sortOrder : undefined,
      responsive: ['md'],
    },
    {
      title: 'Conversion Rate',
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      sorter: true,
      sortOrder: sortField === 'conversion_rate' ? sortOrder : undefined,
      render: (val) => (
        <Progress
          percent={val}
          size="small"
          status={val >= 50 ? 'success' : val >= 25 ? 'normal' : 'exception'}
          format={(p) => `${p?.toFixed(1)}%`}
        />
      ),
      width: 150,
    },
    {
      title: 'Avg Response',
      dataIndex: 'average_response_time',
      key: 'average_response_time',
      sorter: true,
      sortOrder: sortField === 'average_response_time' ? sortOrder : undefined,
      render: (val) => `${val?.toFixed(1) || 0} hrs`,
      responsive: ['lg'],
    },
  ];

  const barChartData = useMemo(() => {
    return filteredData.slice(0, 10).map((e) => ({
      name: e.employee_name,
      enquiries: e.total_enquiries,
      conversions: e.total_conversions,
    }));
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/reports')}>
          Back
        </Button>
        <Title level={4} className="!mb-0">
          Employee Performance Report
        </Title>
      </div>

      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClear={handleClear}
        onExport={handleExport}
        showEmployeeFilter={false}
      />

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search employees..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="All Departments"
              value={departmentFilter}
              onChange={(val) => {
                setDepartmentFilter(val);
                setPage(1);
              }}
              style={{ width: '100%' }}
              allowClear
            >
              {departments.map((dept) => (
                <Select.Option key={dept} value={dept}>
                  {dept}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button icon={<ClearOutlined />} onClick={handleClear}>
              Clear All
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24}>
          <BarChartWidget
            data={barChartData}
            bars={[
              { dataKey: 'enquiries', name: 'Enquiries', color: '#1890ff' },
              { dataKey: 'conversions', name: 'Conversions', color: '#52c41a' },
            ]}
            title="Top 10 Performers"
            layout="horizontal"
          />
        </Col>
      </Row>

      <Card title="Employee Performance Details" className="card-shadow">
        <Table
          columns={columns}
          dataSource={paginatedData}
          rowKey="employee_id"
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}
