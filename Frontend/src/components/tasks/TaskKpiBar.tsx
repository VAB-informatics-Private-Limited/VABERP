import { Card, Col, Row, Statistic } from 'antd';
import { CheckSquareOutlined, ClockCircleOutlined, SyncOutlined, WarningOutlined } from '@ant-design/icons';
import { TaskStats } from '@/types/tasks';

export function TaskKpiBar({ stats, loading }: { stats?: TaskStats; loading?: boolean }) {
  return (
    <Row gutter={[12, 12]} className="mb-5">
      <Col xs={12} sm={6}>
        <Card className="card-shadow" loading={loading}>
          <Statistic title="Total" value={stats?.total ?? 0} prefix={<CheckSquareOutlined className="text-blue-500" />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card className="card-shadow" loading={loading}>
          <Statistic title="Pending" value={stats?.pending ?? 0} prefix={<ClockCircleOutlined className="text-gray-400" />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card className="card-shadow" loading={loading}>
          <Statistic title="In Progress" value={stats?.in_progress ?? 0} prefix={<SyncOutlined className="text-blue-500" />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card className="card-shadow" loading={loading}>
          <Statistic title="Overdue" value={stats?.overdue ?? 0} prefix={<WarningOutlined className="text-red-500" />} valueStyle={stats?.overdue ? { color: '#ef4444' } : undefined} />
        </Card>
      </Col>
    </Row>
  );
}
