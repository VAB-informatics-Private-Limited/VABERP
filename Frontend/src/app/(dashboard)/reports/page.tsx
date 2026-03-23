'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Row, Col, Statistic, Spin } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  PhoneOutlined,
  FileTextOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Dayjs } from 'dayjs';
import { getSalesEnquiryReport, getSalesProspectReport, getCustomerReport } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { SalesFunnel } from '@/components/reports/SalesFunnel';
import { PieChartWidget } from '@/components/reports/PieChartWidget';
import { TrendChart } from '@/components/reports/TrendChart';

const { Title } = Typography;

export default function ReportsPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const filters = useMemo(
    () => ({
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    [dateRange]
  );

  const { data: enquiryReport, isLoading: enquiryLoading } = useQuery({
    queryKey: ['enquiry-report', enterpriseId, filters],
    queryFn: () => getSalesEnquiryReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const { data: prospectReport, isLoading: prospectLoading } = useQuery({
    queryKey: ['prospect-report', enterpriseId, filters],
    queryFn: () => getSalesProspectReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const { data: customerReport, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-report', enterpriseId, filters],
    queryFn: () => getCustomerReport(enterpriseId!, filters),
    enabled: !!enterpriseId,
  });

  const isLoading = enquiryLoading || prospectLoading || customerLoading;
  const enquiry = enquiryReport?.data;
  const prospect = prospectReport?.data;
  const customer = customerReport?.data;

  const handleClear = () => {
    setDateRange(null);
  };

  const funnelData = useMemo(() => {
    if (!enquiry) return [];
    return [
      { name: 'Enquiries', value: enquiry.total_enquiries || 0, fill: '#1890ff' },
      { name: 'Follow-ups', value: enquiry.follow_up_count || 0, fill: '#52c41a' },
      { name: 'Prospects', value: enquiry.prospects_count || 0, fill: '#faad14' },
      { name: 'Closed', value: enquiry.closed_count || 0, fill: '#722ed1' },
    ];
  }, [enquiry]);

  const sourceData = useMemo(() => {
    if (!enquiry?.enquiries_by_source) return [];
    return enquiry.enquiries_by_source.map((s) => ({
      name: s.source_name,
      value: s.count,
    }));
  }, [enquiry]);

  const trendData = useMemo(() => {
    if (!enquiry?.enquiries_by_date) return [];
    return enquiry.enquiries_by_date.map((d) => ({
      date: d.date,
      enquiries: d.count,
    }));
  }, [enquiry]);

  const reportCards = [
    {
      title: 'Enquiry Report',
      path: '/reports/enquiries',
      icon: <PhoneOutlined />,
      description: 'View detailed enquiry analytics',
    },
    {
      title: 'Prospect Report',
      path: '/reports/prospects',
      icon: <RiseOutlined />,
      description: 'Track prospects and conversions',
    },
    {
      title: 'Follow-up Report',
      path: '/reports/follow-ups',
      icon: <FileTextOutlined />,
      description: 'Follow-up completion metrics',
    },
    {
      title: 'Customer Report',
      path: '/reports/customers',
      icon: <TeamOutlined />,
      description: 'Customer acquisition insights',
    },
    {
      title: 'Employee Performance',
      path: '/reports/employees',
      icon: <UserOutlined />,
      description: 'Team performance metrics',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} className="mb-6">
        Reports & Analytics
      </Title>

      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClear={handleClear}
        showEmployeeFilter={false}
        showExport={false}
      />

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Total Enquiries"
              value={enquiry?.total_enquiries || 0}
              prefix={<PhoneOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Prospects"
              value={prospect?.total_prospects || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Total Customers"
              value={customer?.total_customers || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="Conversion Rate"
              value={enquiry?.conversion_rate || 0}
              suffix="%"
              precision={1}
              valueStyle={{ color: enquiry?.conversion_rate && enquiry.conversion_rate > 20 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="card-shadow">
            <Statistic
              title="New This Month"
              value={customer?.new_customers_this_month || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <SalesFunnel data={funnelData} title="Sales Pipeline" />
        </Col>
        <Col xs={24} lg={12}>
          <PieChartWidget data={sourceData} title="Enquiries by Source" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24}>
          <TrendChart
            data={trendData}
            lines={[{ dataKey: 'enquiries', name: 'Enquiries', color: '#1890ff' }]}
            title="Enquiry Trend"
          />
        </Col>
      </Row>

      <Title level={5} className="mb-4">
        Detailed Reports
      </Title>
      <Row gutter={[16, 16]}>
        {reportCards.map((report) => (
          <Col xs={24} sm={12} md={8} lg={4} key={report.path}>
            <Card
              className="card-shadow cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(report.path)}
            >
              <div className="text-center">
                <div className="text-3xl text-blue-500 mb-2">{report.icon}</div>
                <div className="font-medium">{report.title}</div>
                <div className="text-sm text-gray-500 mt-1">{report.description}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
