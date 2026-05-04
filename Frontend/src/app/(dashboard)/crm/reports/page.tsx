'use client';

import { Typography, Row, Col, Card, Statistic } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getCrmSummary, getCrmPerformanceStats } from '@/lib/api/crm';
import { useAuthStore } from '@/stores/authStore';
import { PerformanceCard } from '@/components/crm/PerformanceCard';
import { CRM_STATUS_OPTIONS } from '@/types/crm';

const { Title } = Typography;

export default function CrmReportsPage() {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['crm-summary', enterpriseId],
    queryFn: getCrmSummary,
    enabled: !!enterpriseId,
  });

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['crm-performance', enterpriseId],
    queryFn: getCrmPerformanceStats,
    enabled: !!enterpriseId,
  });

  const summary = summaryData?.data;
  const perf    = perfData?.data || [];

  const getStatusCount = (statusVal: string) =>
    summary?.by_status?.find(s => s.status === statusVal)?.count || 0;

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-1 flex items-center gap-2">
          <BarChartOutlined style={{ color: 'var(--color-primary)' }} /> CRM Performance
        </Title>
        <p className="text-gray-500 text-sm">Team performance and lead conversion stats</p>
      </div>

      {/* Summary KPIs */}
      <Row gutter={[12, 12]} className="mb-6">
        <Col xs={12} sm={8} md={4}>
          <Card size="small" className="card-shadow" loading={summaryLoading}>
            <Statistic title="Total" value={summary?.total || 0} valueStyle={{ color: 'var(--color-primary)' }} />
          </Card>
        </Col>
        {CRM_STATUS_OPTIONS.map(opt => (
          <Col xs={12} sm={8} md={4} key={opt.value}>
            <Card size="small" className="card-shadow" loading={summaryLoading}>
              <Statistic
                title={opt.label}
                value={getStatusCount(opt.value)}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Per-Employee Performance */}
      <div className="mb-4">
        <Title level={5}>Team Performance</Title>
      </div>
      {perf.length === 0 && !perfLoading ? (
        <Card className="card-shadow text-center text-gray-400 py-8">No data yet</Card>
      ) : (
        <PerformanceCard stats={perf} loading={perfLoading} />
      )}
    </div>
  );
}
