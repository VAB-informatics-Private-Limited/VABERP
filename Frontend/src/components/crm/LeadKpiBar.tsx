'use client';

import { Row, Col, Card, Statistic } from 'antd';
import { TeamOutlined, PhoneOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { CrmLead } from '@/types/crm';

interface Props {
  leads: CrmLead[];
  loading?: boolean;
}

export function LeadKpiBar({ leads, loading }: Props) {
  const total    = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const followUp = leads.filter(l => l.status === 'follow_up').length;
  const converted = leads.filter(l => l.status === 'converted').length;

  const cards = [
    { title: 'Total Leads',     value: total,     icon: <TeamOutlined />,         color: '#1677ff' },
    { title: 'New',             value: newLeads,  icon: <PhoneOutlined />,        color: '#722ed1' },
    { title: 'Follow-up Due',   value: followUp,  icon: <ClockCircleOutlined />,  color: '#fa8c16' },
    { title: 'Converted',       value: converted, icon: <CheckCircleOutlined />,  color: '#52c41a' },
  ];

  return (
    <Row gutter={[12, 12]} className="mb-4">
      {cards.map((c, i) => (
        <Col xs={12} sm={6} key={i}>
          <Card size="small" className="card-shadow" loading={loading}>
            <Statistic
              title={<span className="text-xs text-gray-500">{c.title}</span>}
              value={c.value}
              prefix={c.icon}
              valueStyle={{ color: c.color, fontSize: 22 }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
