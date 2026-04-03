'use client';

import { Card, Progress, Tag, Row, Col } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { CrmPerformanceStat } from '@/types/crm';

interface Props {
  stats: CrmPerformanceStat[];
  loading?: boolean;
}

export function PerformanceCard({ stats, loading }: Props) {
  return (
    <Row gutter={[16, 16]}>
      {stats.map(s => (
        <Col xs={24} sm={12} lg={8} key={s.employee_id}>
          <Card
            size="small"
            className="card-shadow"
            loading={loading}
            title={<span className="flex items-center gap-2"><UserOutlined />{s.employee_name}</span>}
          >
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Leads</span>
                <span className="font-semibold">{s.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Converted</span>
                <Tag color="success">{s.converted}</Tag>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active</span>
                <Tag color="blue">{s.active}</Tag>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Lost</span>
                <Tag color="red">{s.lost}</Tag>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Conversion Rate</span>
                  <span className="font-semibold text-green-600">{s.conversion_rate}%</span>
                </div>
                <Progress
                  percent={s.conversion_rate}
                  showInfo={false}
                  strokeColor="#52c41a"
                  size="small"
                />
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
