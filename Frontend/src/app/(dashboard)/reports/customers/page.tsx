'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Row, Col, Statistic, Table, Button, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, UserOutlined, RiseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { Dayjs } from 'dayjs';
import { getCustomerReport } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { TrendChart } from '@/components/reports/TrendChart';
import { PieChartWidget } from '@/components/reports/PieChartWidget';
import { StateBreakdown, TopCustomer } from '@/types/reports';
import { exportToCSV } from '@/lib/utils/export';

const { Title } = Typography;

export default function CustomerReportPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    queryKey: ['customer-report', enterpriseId, filters],
    queryFn: () => getCustomerReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const report = data?.data;

  const handleClear = () => {
    setDateRange(null);
    setPage(1);
  };

  const handleExport = () => {
    if (report?.top_customers) {
      exportToCSV(report.top_customers, 'customer-report', [
        { key: 'customer_name', title: 'Customer' },
        { key: 'total_orders', title: 'Total Orders' },
        { key: 'total_value', title: 'Total Value' },
      ]);
    }
  };

  const sortedData = useMemo(() => {
    let result = report?.top_customers || [];

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof TopCustomer];
        const bVal = b[sortField as keyof TopCustomer];
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
  }, [report?.top_customers, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<TopCustomer> | SorterResult<TopCustomer>[]
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

  const columns: ColumnsType<TopCustomer> = [
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: true,
      sortOrder: sortField === 'customer_name' ? sortOrder : undefined,
    },
    {
      title: 'Total Orders',
      dataIndex: 'total_orders',
      key: 'total_orders',
      sorter: true,
      sortOrder: sortField === 'total_orders' ? sortOrder : undefined,
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Total Value',
      dataIndex: 'total_value',
      key: 'total_value',
      sorter: true,
      sortOrder: sortField === 'total_value' ? sortOrder : undefined,
      render: (val) => (
        <span className="font-medium text-green-600">
          ₹{val?.toLocaleString('en-IN') || 0}
        </span>
      ),
    },
  ];

  const stateColumns: ColumnsType<StateBreakdown> = [
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (val) => `${val.toFixed(1)}%`,
      sorter: (a, b) => a.percentage - b.percentage,
    },
  ];

  const stateChartData = useMemo(() => {
    if (!report?.customers_by_state) return [];
    return report.customers_by_state.slice(0, 8).map((s) => ({
      name: s.state,
      value: s.count,
    }));
  }, [report]);

  const trendData = useMemo(() => {
    if (!report?.customers_by_date) return [];
    return report.customers_by_date.map((d) => ({
      date: d.date,
      customers: d.count,
    }));
  }, [report]);

  const activeRate = useMemo(() => {
    if (!report?.total_customers) return 0;
    return ((report.active_customers || 0) / report.total_customers) * 100;
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
          Customer Report
        </Title>
      </div>

      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClear={handleClear}
        onExport={handleExport}
        showEmployeeFilter={false}
      />

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Total Customers"
              value={report?.total_customers || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Active"
              value={report?.active_customers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Inactive"
              value={report?.inactive_customers || 0}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="New This Month"
              value={report?.new_customers_this_month || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Active Rate"
              value={activeRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: activeRate >= 70 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <PieChartWidget data={stateChartData} title="Customers by State" />
        </Col>
        <Col xs={24} lg={12}>
          <TrendChart
            data={trendData}
            lines={[{ dataKey: 'customers', name: 'New Customers', color: '#52c41a' }]}
            title="Customer Acquisition Trend"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Top Customers" className="card-shadow">
            <Table
              columns={columns}
              dataSource={paginatedData}
              rowKey="customer_id"
              onChange={handleTableChange}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: sortedData.length,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              }}
              scroll={{ x: 400 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Customers by State" className="card-shadow">
            <Table
              columns={stateColumns}
              dataSource={report?.customers_by_state || []}
              rowKey="state"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20'],
              }}
              scroll={{ x: 300 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
