'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Row, Col, Statistic, Table, Button, Spin, Progress, Tag } from 'antd';
import { ArrowLeftOutlined, PhoneOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { Dayjs } from 'dayjs';
import { getSalesFollowupReport } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { TrendChart } from '@/components/reports/TrendChart';
import { BarChartWidget } from '@/components/reports/BarChartWidget';
import { EmployeeFollowups } from '@/types/reports';
import { exportToCSV } from '@/lib/utils/export';

const { Title } = Typography;

export default function FollowupReportPage() {
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
    queryKey: ['followup-report', enterpriseId, filters],
    queryFn: () => getSalesFollowupReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const report = data?.data;

  const handleClear = () => {
    setDateRange(null);
    setEmployeeId(undefined);
    setPage(1);
  };

  const handleExport = () => {
    if (report?.followups_by_employee) {
      exportToCSV(report.followups_by_employee, 'followup-report', [
        { key: 'employee_name', title: 'Employee' },
        { key: 'total_followups', title: 'Total Follow-ups' },
        { key: 'completed', title: 'Completed' },
        { key: 'pending', title: 'Pending' },
        { key: 'completion_rate', title: 'Completion Rate %' },
      ]);
    }
  };

  const sortedData = useMemo(() => {
    let result = report?.followups_by_employee || [];

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof EmployeeFollowups];
        const bVal = b[sortField as keyof EmployeeFollowups];
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
  }, [report?.followups_by_employee, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<EmployeeFollowups> | SorterResult<EmployeeFollowups>[]
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

  const columns: ColumnsType<EmployeeFollowups> = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      sorter: true,
      sortOrder: sortField === 'employee_name' ? sortOrder : undefined,
    },
    {
      title: 'Total Follow-ups',
      dataIndex: 'total_followups',
      key: 'total_followups',
      sorter: true,
      sortOrder: sortField === 'total_followups' ? sortOrder : undefined,
    },
    {
      title: 'Completed',
      dataIndex: 'completed',
      key: 'completed',
      sorter: true,
      sortOrder: sortField === 'completed' ? sortOrder : undefined,
      render: (val) => <Tag color="success">{val}</Tag>,
    },
    {
      title: 'Pending',
      dataIndex: 'pending',
      key: 'pending',
      sorter: true,
      sortOrder: sortField === 'pending' ? sortOrder : undefined,
      render: (val) => <Tag color="warning">{val}</Tag>,
    },
    {
      title: 'Completion Rate',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      sorter: true,
      sortOrder: sortField === 'completion_rate' ? sortOrder : undefined,
      render: (val) => (
        <Progress
          percent={val}
          size="small"
          status={val >= 80 ? 'success' : val >= 50 ? 'normal' : 'exception'}
          format={(p) => `${p?.toFixed(1)}%`}
        />
      ),
    },
  ];

  const barChartData = useMemo(() => {
    if (!report?.followups_by_employee) return [];
    return report.followups_by_employee.slice(0, 10).map((e) => ({
      name: e.employee_name,
      completed: e.completed,
      pending: e.pending,
    }));
  }, [report]);

  const trendData = useMemo(() => {
    if (!report?.followups_by_date) return [];
    return report.followups_by_date.map((d) => ({
      date: d.date,
      followups: d.count,
    }));
  }, [report]);

  const completionRate = useMemo(() => {
    if (!report?.total_followups) return 0;
    return ((report.completed_followups || 0) / report.total_followups) * 100;
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
          Follow-up Report
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
              title="Total Follow-ups"
              value={report?.total_followups || 0}
              prefix={<PhoneOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Completed"
              value={report?.completed_followups || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Pending"
              value={report?.pending_followups || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Overdue"
              value={report?.overdue_followups || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Completion Rate"
              value={completionRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: completionRate >= 80 ? '#52c41a' : completionRate >= 50 ? '#faad14' : '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Avg. Response Time"
              value={report?.average_response_time || 0}
              suffix="hrs"
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
              { dataKey: 'completed', name: 'Completed', color: '#52c41a' },
              { dataKey: 'pending', name: 'Pending', color: '#faad14' },
            ]}
            title="Follow-ups by Employee"
          />
        </Col>
        <Col xs={24} lg={12}>
          <TrendChart
            data={trendData}
            lines={[{ dataKey: 'followups', name: 'Follow-ups', color: '#1890ff' }]}
            title="Follow-up Trend"
          />
        </Col>
      </Row>

      <Card title="Employee Follow-up Breakdown" className="card-shadow">
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
