'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Row, Col, Statistic, Table, Button, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, PhoneOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import { getSalesEnquiryReport } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { PieChartWidget } from '@/components/reports/PieChartWidget';
import { TrendChart } from '@/components/reports/TrendChart';
import { StatusBreakdown, SourceBreakdown } from '@/types/reports';
import { exportToCSV } from '@/lib/utils/export';

const { Title } = Typography;

export default function EnquiryReportPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [employeeId, setEmployeeId] = useState<number | undefined>();
  const [source, setSource] = useState<string | undefined>();

  const filters = useMemo(
    () => ({
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      employeeId,
      source,
    }),
    [dateRange, employeeId, source]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['enquiry-report', enterpriseId, filters],
    queryFn: () => getSalesEnquiryReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const report = data?.data;

  const handleClear = () => {
    setDateRange(null);
    setEmployeeId(undefined);
    setSource(undefined);
  };

  const handleExport = () => {
    if (report?.enquiries_by_status) {
      exportToCSV(report.enquiries_by_status, 'enquiry-report', [
        { key: 'status_label', title: 'Status' },
        { key: 'count', title: 'Count' },
        { key: 'percentage', title: 'Percentage' },
      ]);
    }
  };

  const statusColumns: ColumnsType<StatusBreakdown> = [
    {
      title: 'Status',
      dataIndex: 'status_label',
      key: 'status_label',
      render: (text, record) => <Tag color={record.color}>{text}</Tag>,
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

  const sourceColumns: ColumnsType<SourceBreakdown> = [
    {
      title: 'Source',
      dataIndex: 'source_name',
      key: 'source_name',
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

  const sourceChartData = useMemo(() => {
    if (!report?.enquiries_by_source) return [];
    return report.enquiries_by_source.map((s) => ({
      name: s.source_name,
      value: s.count,
    }));
  }, [report]);

  const statusChartData = useMemo(() => {
    if (!report?.enquiries_by_status) return [];
    return report.enquiries_by_status.map((s) => ({
      name: s.status_label,
      value: s.count,
      color: s.color,
    }));
  }, [report]);

  const trendData = useMemo(() => {
    if (!report?.enquiries_by_date) return [];
    return report.enquiries_by_date.map((d) => ({
      date: d.date,
      enquiries: d.count,
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
          Enquiry Report
        </Title>
      </div>

      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        employeeId={employeeId}
        onEmployeeChange={setEmployeeId}
        source={source}
        onSourceChange={setSource}
        onClear={handleClear}
        onExport={handleExport}
        showSourceFilter
      />

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Total Enquiries"
              value={report?.total_enquiries || 0}
              prefix={<PhoneOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="New"
              value={report?.new_enquiries || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Follow-ups"
              value={report?.follow_up_count || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Prospects"
              value={report?.prospects_count || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Closed"
              value={report?.closed_count || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Not Interested"
              value={report?.not_interested_count || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={12}>
          <PieChartWidget data={statusChartData} title="Enquiries by Status" />
        </Col>
        <Col xs={24} md={12}>
          <PieChartWidget data={sourceChartData} title="Enquiries by Source" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24}>
          <TrendChart
            data={trendData}
            lines={[{ dataKey: 'enquiries', name: 'Enquiries', color: '#1890ff' }]}
            title="Enquiry Trend Over Time"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Status Breakdown" className="card-shadow">
            <Table
              columns={statusColumns}
              dataSource={report?.enquiries_by_status || []}
              rowKey="status"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Source Breakdown" className="card-shadow">
            <Table
              columns={sourceColumns}
              dataSource={report?.enquiries_by_source || []}
              rowKey="source_name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
