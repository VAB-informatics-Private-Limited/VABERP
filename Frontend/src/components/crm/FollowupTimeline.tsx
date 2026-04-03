'use client';

import { Timeline, Tag, Empty, Spin } from 'antd';
import { PhoneOutlined, MailOutlined, TeamOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { CrmFollowup } from '@/types/crm';
import { LeadStatusBadge } from './LeadStatusBadge';
import dayjs from 'dayjs';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Call:      <PhoneOutlined />,
  Email:     <MailOutlined />,
  Meeting:   <TeamOutlined />,
  Visit:     <EnvironmentOutlined />,
  WhatsApp:  <PhoneOutlined />,
};

interface Props {
  followups: CrmFollowup[];
  loading?: boolean;
}

export function FollowupTimeline({ followups, loading }: Props) {
  if (loading) return <div className="flex justify-center py-6"><Spin /></div>;
  if (!followups.length) return <Empty description="No follow-ups yet" />;

  return (
    <Timeline
      items={followups.map(f => ({
        dot: <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xs">{TYPE_ICONS[f.followup_type] || <PhoneOutlined />}</div>,
        children: (
          <div className="pb-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Tag color="blue">{f.followup_type}</Tag>
              {f.status && <LeadStatusBadge status={f.status} />}
              <span className="text-xs text-gray-400">{dayjs(f.followup_date).format('DD MMM YYYY, hh:mm A')}</span>
            </div>
            {f.notes && <p className="text-sm text-gray-600 mb-1">{f.notes}</p>}
            {f.next_followup_date && (
              <p className="text-xs text-orange-500">
                Next: {dayjs(f.next_followup_date).format('DD MMM YYYY')}
                {f.next_followup_type && ` (${f.next_followup_type})`}
              </p>
            )}
            {f.created_by_name && <p className="text-xs text-gray-400">By {f.created_by_name}</p>}
          </div>
        ),
      }))}
    />
  );
}
