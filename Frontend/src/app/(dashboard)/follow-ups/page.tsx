'use client';

import { Typography, Card, Row, Col, Statistic, Tabs, Badge } from 'antd';
import { PhoneOutlined, ClockCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { TodayFollowupList } from '@/components/follow-ups/TodayFollowupList';
import { OverdueFollowupsModal } from '@/components/follow-ups/OverdueFollowupsModal';
import { getTodayFollowups } from '@/lib/api/enquiries';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

export default function FollowupsPage() {
  const { getEnterpriseId, getEmployeeId, userType } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const employeeId = getEmployeeId();

  const { data, isLoading } = useQuery({
    queryKey: ['today-followups', enterpriseId, employeeId],
    queryFn: () => getTodayFollowups(enterpriseId!, userType === 'employee' ? employeeId || undefined : undefined),
    enabled: !!enterpriseId,
  });

  const stats = useMemo(() => {
    const followups = data?.data || [];
    const today = new Date().toISOString().split('T')[0];

    const overdue = followups.filter((f) => f.next_followup_date < today);
    const todayItems = followups.filter((f) => f.next_followup_date === today);
    const upcoming = followups.filter((f) => f.next_followup_date > today);

    return {
      total: followups.length,
      overdue: overdue.length,
      today: todayItems.length,
      upcoming: upcoming.length,
      overdueItems: overdue,
      todayItems: todayItems,
      upcomingItems: upcoming,
    };
  }, [data?.data]);

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          All Follow-ups
          <Badge count={stats.total} className="ml-2" />
        </span>
      ),
      children: <TodayFollowupList data={data?.data || []} loading={isLoading} />,
    },
    {
      key: 'overdue',
      label: (
        <span className="text-red-600">
          Overdue
          <Badge count={stats.overdue} className="ml-2" style={{ backgroundColor: '#ff4d4f' }} />
        </span>
      ),
      children: <TodayFollowupList data={stats.overdueItems} loading={isLoading} />,
    },
    {
      key: 'today',
      label: (
        <span>
          Today
          <Badge count={stats.today} className="ml-2" style={{ backgroundColor: '#1890ff' }} />
        </span>
      ),
      children: <TodayFollowupList data={stats.todayItems} loading={isLoading} />,
    },
    {
      key: 'upcoming',
      label: (
        <span>
          Upcoming
          <Badge count={stats.upcoming} className="ml-2" style={{ backgroundColor: '#52c41a' }} />
        </span>
      ),
      children: <TodayFollowupList data={stats.upcomingItems} loading={isLoading} />,
    },
  ];

  return (
    <div>
      <OverdueFollowupsModal overdueItems={stats.overdueItems} />

      <Title level={4} className="mb-6">
        Today&apos;s Follow-ups
      </Title>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="Total Pending"
              value={stats.total}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="Overdue"
              value={stats.overdue}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="Due Today"
              value={stats.today}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="Upcoming"
              value={stats.upcoming}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="card-shadow">
        <Tabs items={tabItems} defaultActiveKey="all" />
      </Card>
    </div>
  );
}
