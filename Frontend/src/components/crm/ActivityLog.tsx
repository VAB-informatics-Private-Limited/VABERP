'use client';

import { Timeline, Tag, Empty, Spin } from 'antd';
import {
  UserAddOutlined, UserSwitchOutlined, SwapOutlined,
  PhoneOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined,
} from '@ant-design/icons';
import { CrmActivity } from '@/types/crm';
import dayjs from 'dayjs';

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  lead_created:    { label: 'Lead Created',    color: 'blue',    icon: <UserAddOutlined /> },
  lead_assigned:   { label: 'Assigned',        color: 'purple',  icon: <UserSwitchOutlined /> },
  lead_reassigned: { label: 'Reassigned',      color: 'orange',  icon: <UserSwitchOutlined /> },
  status_changed:  { label: 'Status Changed',  color: 'cyan',    icon: <SwapOutlined /> },
  followup_added:  { label: 'Follow-up Logged',color: 'geekblue',icon: <PhoneOutlined /> },
  lead_updated:    { label: 'Lead Updated',    color: 'default', icon: <EditOutlined /> },
  converted:       { label: 'Converted',       color: 'success', icon: <CheckCircleOutlined /> },
  lost:            { label: 'Marked Lost',     color: 'red',     icon: <CloseCircleOutlined /> },
};

interface Props {
  activities: CrmActivity[];
  loading?: boolean;
}

export function ActivityLog({ activities, loading }: Props) {
  if (loading) return <div className="flex justify-center py-6"><Spin /></div>;
  if (!activities.length) return <Empty description="No activity yet" />;

  return (
    <Timeline
      items={activities.map(a => {
        const cfg = ACTION_CONFIG[a.action] || { label: a.action, color: 'default', icon: <EditOutlined /> };
        return {
          dot: <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-xs" style={{ color: cfg.color === 'default' ? '#999' : undefined }}>{cfg.icon}</div>,
          children: (
            <div className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag color={cfg.color}>{cfg.label}</Tag>
                <span className="text-xs text-gray-400">{dayjs(a.created_date).format('DD MMM YYYY, hh:mm A')}</span>
              </div>
              {a.description && <p className="text-sm text-gray-600 mb-1">{a.description}</p>}
              {a.performed_by_name && <p className="text-xs text-gray-400">By {a.performed_by_name}</p>}
            </div>
          ),
        };
      })}
    />
  );
}
