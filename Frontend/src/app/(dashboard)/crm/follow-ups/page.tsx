'use client';

import { Typography, Tabs, Card, List, Tag, Button, Empty, Spin } from 'antd';
import { ClockCircleOutlined, WarningOutlined, PhoneOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getTodayCrmFollowups, getOverdueCrmFollowups } from '@/lib/api/crm';
import { useAuthStore } from '@/stores/authStore';
import { LeadStatusBadge } from '@/components/crm/LeadStatusBadge';
import { CrmLead } from '@/types/crm';
import dayjs from 'dayjs';

const { Title } = Typography;

function LeadFollowupList({ leads, loading, router }: { leads: CrmLead[]; loading: boolean; router: ReturnType<typeof useRouter> }) {
  if (loading) return <div className="flex justify-center py-8"><Spin /></div>;
  if (!leads.length) return <Empty description="All clear!" />;

  return (
    <List
      dataSource={leads}
      renderItem={(lead) => (
        <List.Item
          actions={[
            <Button key="view" type="primary" size="small" onClick={() => router.push(`/crm/${lead.id}`)}>
              View
            </Button>,
          ]}
        >
          <List.Item.Meta
            title={
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-blue-600">{lead.lead_number}</span>
                <span>{lead.customer_name}</span>
                <LeadStatusBadge status={lead.status} />
              </div>
            }
            description={
              <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                {lead.mobile && <span><PhoneOutlined className="mr-1" />{lead.mobile}</span>}
                {lead.assigned_to_name && <span>Assigned to: {lead.assigned_to_name}</span>}
                {lead.next_followup_date && (
                  <span>Due: {dayjs(lead.next_followup_date).format('DD MMM YYYY')}</span>
                )}
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
}

export default function CrmFollowupsPage() {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const router = useRouter();

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['crm-followups-today', enterpriseId],
    queryFn: getTodayCrmFollowups,
    enabled: !!enterpriseId,
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['crm-followups-overdue', enterpriseId],
    queryFn: getOverdueCrmFollowups,
    enabled: !!enterpriseId,
  });

  const todayLeads   = todayData?.data || [];
  const overdueLeads = overdueData?.data || [];

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-1 flex items-center gap-2">
          <ClockCircleOutlined style={{ color: '#fa8c16' }} /> Follow-ups
        </Title>
        <p className="text-gray-500 text-sm">Track today&apos;s and overdue follow-ups</p>
      </div>

      <Tabs
        items={[
          {
            key: 'today',
            label: (
              <span>
                <ClockCircleOutlined className="mr-1" />
                Today ({todayLeads.length})
              </span>
            ),
            children: (
              <Card className="card-shadow">
                <LeadFollowupList leads={todayLeads} loading={todayLoading} router={router} />
              </Card>
            ),
          },
          {
            key: 'overdue',
            label: (
              <span className={overdueLeads.length > 0 ? 'text-red-500' : ''}>
                <WarningOutlined className="mr-1" />
                Overdue ({overdueLeads.length})
              </span>
            ),
            children: (
              <Card className="card-shadow">
                <LeadFollowupList leads={overdueLeads} loading={overdueLoading} router={router} />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
