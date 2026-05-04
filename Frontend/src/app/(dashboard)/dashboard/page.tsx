'use client';

import { Row, Col } from 'antd';
import {
  PhoneOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  BellOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TodayFollowups } from '@/components/dashboard/TodayFollowups';
import { SalesPipelineChart } from '@/components/dashboard/SalesPipelineChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { useAuthStore } from '@/stores/authStore';
import { getDashboard } from '@/lib/api';
import { getRevenueSummary } from '@/lib/api/service-products';

export default function DashboardPage() {
  const { user, userType, getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', enterpriseId],
    queryFn: () => getDashboard(),
    enabled: !!enterpriseId,
  });

  const { data: revenueSummary } = useQuery({
    queryKey: ['service-revenue-summary'],
    queryFn: getRevenueSummary,
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

  // Build sales pipeline data from dashboard summary stats
  const pipelineData = dashboard
    ? [
        { name: 'Total Enquiries', value: dashboard.totalEnquiries || 0 },
        { name: 'Total Customers', value: dashboard.totalCustomers || 0 },
        { name: "Today's Follow-ups", value: dashboard.todayFollowups || 0 },
        { name: 'Overdue Follow-ups', value: dashboard.overdueFollowups || 0 },
        { name: 'Active Orders', value: dashboard.activeOrders || 0 },
        { name: 'Active Employees', value: dashboard.activeEmployees || 0 },
        { name: 'Total Quotations', value: dashboard.totalQuotations || 0 },
      ]
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
          {getUserGreeting()}, {getUserName()}!
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      {/* KPI Cards - Row 1 */}
      <Row gutter={[20, 20]} className="mb-4">
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
            title="Active Orders"
            value={dashboard?.activeOrders || 0}
            icon={<ShoppingCartOutlined />}
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
            icon={<ClockCircleOutlined />}
            loading={isLoading}
            color="#fa8c16"
          />
        </Col>
      </Row>

      {/* KPI Cards - Row 2 */}
      <Row gutter={[20, 20]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Overdue Follow-ups"
            value={dashboard?.overdueFollowups || 0}
            icon={<ExclamationCircleOutlined />}
            loading={isLoading}
            color="#f5222d"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Total Quotations"
            value={dashboard?.totalQuotations || 0}
            icon={<FileTextOutlined />}
            loading={isLoading}
            color="#13c2c2"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Active Employees"
            value={dashboard?.activeEmployees || 0}
            icon={<UserOutlined />}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Low Stock Alerts"
            value={dashboard?.lowStockAlerts || 0}
            icon={<WarningOutlined />}
            loading={isLoading}
            color={dashboard?.lowStockAlerts ? '#f5222d' : '#8c8c8c'}
          />
        </Col>
      </Row>

      {/* After-Sales Revenue */}
      {revenueSummary && (
        <>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '0 0 12px 0' }}>After-Sales</p>
          <Row gutter={[20, 20]} className="mb-8">
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                title="Registered Products"
                value={revenueSummary.totalProducts}
                icon={<CustomerServiceOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                title="Services Completed"
                value={revenueSummary.completedBookings}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                title="Pending Reminders"
                value={revenueSummary.pendingReminders}
                icon={<BellOutlined />}
                color={revenueSummary.pendingReminders > 0 ? '#fa8c16' : '#8c8c8c'}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                title="Service Revenue (₹)"
                value={revenueSummary.totalRevenue}
                icon={<DollarOutlined />}
                color="#722ed1"
              />
            </Col>
          </Row>
        </>
      )}

      {/* Charts and Lists */}
      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '12px' }}>Analytics</p>
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <SalesPipelineChart data={pipelineData} loading={isLoading} />
        </Col>
        <Col xs={24} lg={12}>
          <TodayFollowups />
        </Col>
      </Row>

      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '24px 0 12px 0' }}>Activity</p>
      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <RecentActivity
            activities={dashboard?.recentActivities}
            loading={isLoading}
          />
        </Col>
      </Row>
    </div>
  );
}
