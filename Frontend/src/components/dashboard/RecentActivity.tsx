'use client';

import { Card, Timeline, Tag, Empty } from 'antd';
import {
  PhoneOutlined,
  UserAddOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

interface ActivityItem {
  id: number;
  type: 'enquiry' | 'customer' | 'quotation' | 'sale';
  title: string;
  description: string;
  time: string;
}

const getIcon = (type: ActivityItem['type']) => {
  const icons = {
    enquiry: <PhoneOutlined />,
    customer: <UserAddOutlined />,
    quotation: <FileTextOutlined />,
    sale: <CheckCircleOutlined />,
  };
  return icons[type];
};

const getColor = (type: ActivityItem['type']) => {
  const colors = {
    enquiry: 'blue',
    customer: 'green',
    quotation: 'purple',
    sale: 'gold',
  };
  return colors[type];
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

interface RecentActivityProps {
  activities?: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ activities, loading = false }: RecentActivityProps) {
  const items = activities || [];

  return (
    <Card
      title="Recent Activity"
      className="card-shadow h-full"
      loading={loading}
    >
      {items.length === 0 ? (
        <Empty description="No recent activity" />
      ) : (
        <Timeline
          items={items.map((activity) => ({
            dot: (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `var(--ant-${getColor(activity.type)}-1, #e6f7ff)` }}
              >
                {getIcon(activity.type)}
              </div>
            ),
            children: (
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{activity.title}</span>
                  <Tag color={getColor(activity.type)} className="!text-xs">
                    {activity.type}
                  </Tag>
                </div>
                <p className="text-gray-500 text-sm mb-1">{activity.description}</p>
                <p className="text-gray-400 text-xs">{formatTimeAgo(activity.time)}</p>
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
}
