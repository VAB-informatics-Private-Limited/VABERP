'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Row, Col, Statistic, Table, Button, Spin, Progress } from 'antd';
import { ArrowLeftOutlined, RiseOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { Dayjs } from 'dayjs';
import { getSalesProspectReport } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { TrendChart } from '@/components/reports/TrendChart';
import { BarChartWidget } from '@/components/reports/BarChartWidget';
import { EmployeeProspects } from '@/types/reports';
import { exportToCSV } from '@/lib/utils/export';

const { Title } = Typography;

export default function ProspectReportPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [employeeId, setEmployeeId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>();

  const filters = useMemo(
    () => ({
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      employeeId,
    }),
    [dateRange, employeeId]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['prospect-report', enterpriseId, filters],
    queryFn: () => getSalesProspectReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const report = data?.data;

  const handleClear = () => {
    setDateRange(null);
    setEmployeeId(undefined);
    setPage(1);
  };

  const handleExport = () => {
    if (report?.prospects_by_employee) {
      exportToCSV(report.prospects_by_employee, 'prospect-report', [
        { key: 'employee_name', title: 'Employee' },
        { key: 'total_prospects', title: 'Total Prospects' },
        { key: 'converted', title: 'Converted' },
        { key: 'pending', title: 'Pending' },
        { key: 'conversion_rate', title: 'Conversion Rate %' },
      ]);
    }
  };

  const sortedData = useMemo(() => {
    let result = report?.prospects_by_employee || [];

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof EmployeeProspects];
        const bVal = b[sortField as keyof EmployeeProspects];
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
  }, [report?.prospects_by_employee, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<EmployeeProspects> | SorterResult<EmployeeProspects>[]
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

  const columns: ColumnsType<EmployeeProspects> = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      sorter: true,
      sortOrder: sortField === 'employee_name' ? sortOrder : undefined,
    },
    {
      title: 'Total Prospects',
      dataIndex: 'total_prospects',
      key: 'total_prospects',
      sorter: true,
      sortOrder: sortField === 'total_prospects' ? sortOrder : undefined,
    },
    {
      title: 'Converted',
      dataIndex: 'converted',
      key: 'converted',
      sorter: true,
      sortOrder: sortField === 'converted' ? sortOrder : undefined,
      render: (val) => <span className="text-green-600">{val}</span>,
    },
    {
      title: 'Pending',
      dataIndex: 'pending',
      key: 'pending',
      sorter: true,
      sortOrder: sortField === 'pending' ? sortOrder : undefined,
      render: (val) => <span className="text-orange-500">{val}</span>,
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
    },
  ];

  const barChartData = useMemo(() => {
    if (!report?.prospects_by_employee) return [];
    return report.prospects_by_employee.slice(0, 10).map((e) => ({
      name: e.employee_name,
      prospects: e.total_prospects,
      converted: e.converted,
    }));
  }, [report]);

  const trendData = useMemo(() => {
    if (!report?.prospects_by_date) return [];
    return report.prospects_by_date.map((d) => ({
      date: d.date,
      prospects: d.count,
    }));
  }, [report]);

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
          Prospect Report
        </Title>
      </div>

      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        employeeId={employeeId}
        onEmployeeChange={setEmployeeId}
        onClear={handleClear}
        onExport={handleExport}
      />

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Total Prospects"
              value={report?.total_prospects || 0}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Hot Prospects"
              value={report?.hot_prospects || 0}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Warm Prospects"
              value={report?.warm_prospects || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Cold Prospects"
              value={report?.cold_prospects || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Converted"
              value={report?.converted_prospects || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Avg. Conversion Time"
              value={report?.average_conversion_time || 0}
              suffix="days"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <BarChartWidget
            data={barChartData}
            bars={[
              { dataKey: 'prospects', name: 'Prospects', color: '#1890ff' },
              { dataKey: 'converted', name: 'Converted', color: '#52c41a' },
            ]}
            title="Top Performers - Prospects"
          />
        </Col>
        <Col xs={24} lg={12}>
          <TrendChart
            data={trendData}
            lines={[{ dataKey: 'prospects', name: 'Prospects', color: '#faad14' }]}
            title="Prospect Trend"
          />
        </Col>
      </Row>

      <Card title="Employee Prospect Breakdown" className="card-shadow">
        <Table
          columns={columns}
          dataSource={paginatedData}
          rowKey="employee_id"
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: sortedData.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
}
