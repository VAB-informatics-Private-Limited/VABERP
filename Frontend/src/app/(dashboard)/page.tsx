'use client';

import { Row, Col, Typography } from 'antd';
import {
  PhoneOutlined,
  TeamOutlined,
  RiseOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TodayFollowups } from '@/components/dashboard/TodayFollowups';
import { SalesPipelineChart } from '@/components/dashboard/SalesPipelineChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { useAuthStore } from '@/stores/authStore';
import { getDashboard } from '@/lib/api';

const { Title } = Typography;

export default function DashboardPage() {
  const { user, userType, getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  // Fetch dashboard stats using unified endpoint
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', enterpriseId],
    queryFn: () => getDashboard(),
    enabled: !!enterpriseId,
  });

  const dashboard = dashboardData?.data;

  const getUserGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => {
    if (!user) return '';
    if (userType === 'employee') {
      return (user as { first_name: string }).first_name;
    }
    return (user as { business_name: string }).business_name;
  };

  if (userType === 'employee') {
    return (
      <div>
        <div className="mb-6">
          <Title level={4} className="!mb-1">
            {getUserGreeting()}, {getUserName()}!
          </Title>
          <p className="text-gray-500">Welcome back. Use the sidebar to navigate to your assigned modules.</p>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <TodayFollowups />
          </Col>
          <Col xs={24} lg={10}>
            <KpiCard
              title="Today's Follow-ups"
              value={dashboard?.todayFollowups || 0}
              icon={<UserOutlined />}
              loading={isLoading}
              color="#fa8c16"
            />
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-1">
          {getUserGreeting()}, {getUserName()}!
        </Title>
        <p className="text-gray-500">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Total Enquiries"
            value={dashboard?.totalEnquiries || 0}
            icon={<PhoneOutlined />}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Active Prospects"
            value={dashboard?.totalProspects || 0}
            icon={<RiseOutlined />}
            loading={isLoading}
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Total Customers"
            value={dashboard?.totalCustomers || 0}
            icon={<TeamOutlined />}
            loading={isLoading}
            color="#722ed1"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Today's Follow-ups"
            value={dashboard?.todayFollowups || 0}
            icon={<UserOutlined />}
            loading={isLoading}
            color="#fa8c16"
          />
        </Col>
      </Row>

      {/* Charts and Lists */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SalesPipelineChart />
        </Col>
        <Col xs={24} lg={12}>
          <TodayFollowups />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24}>
          <RecentActivity />
        </Col>
      </Row>
    </div>
  );
}
