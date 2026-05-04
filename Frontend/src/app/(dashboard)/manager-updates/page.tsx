'use client';

import { Typography, Card, Tag, Avatar, Empty, Spin, List, Badge } from 'antd';
import {
  BellOutlined, UserOutlined, TagOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getUpdatesFromManager } from '@/lib/api/team-updates';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

const CATEGORY_COLOR: Record<string, string> = {
  announcement: 'blue',
  task_update: 'green',
  reminder: 'orange',
  general: 'default',
};
const CATEGORY_LABEL: Record<string, string> = {
  announcement: 'Announcement',
  task_update: 'Task Update',
  reminder: 'Reminder',
  general: 'General',
};

export default function ManagerUpdatesPage() {
  const { userType, user } = useAuthStore();
  const reportingTo = (user as any)?.reportingTo;

  const { data, isLoading } = useQuery({
    queryKey: ['updates-from-manager'],
    queryFn: getUpdatesFromManager,
    enabled: userType === 'employee' && !!reportingTo,
    refetchInterval: 60000,
  });

  const updates = data?.data || [];
  const manager = data?.manager;
  const managerName = manager ? [manager.firstName, manager.lastName].filter(Boolean).join(' ') : null;
  const managerInitials = manager
    ? [manager.firstName?.[0], manager.lastName?.[0]].filter(Boolean).join('').toUpperCase()
    : '?';

  if (!reportingTo) {
    return (
      <div>
        <Title level={4} className="!mb-6 flex items-center gap-2">
          <BellOutlined style={{ color: 'var(--color-primary)' }} /> Manager Updates
        </Title>
        <Card className="card-shadow">
          <Empty
            image={<UserOutlined style={{ fontSize: 48, color: '#d1d5db' }} />}
            description={<span className="text-gray-400">You have no reporting manager assigned yet.</span>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={4} className="!mb-1 flex items-center gap-2">
            <BellOutlined style={{ color: 'var(--color-primary)' }} /> Manager Updates
          </Title>
          <Text className="text-gray-500 text-sm">
            Updates and announcements from your reporting manager
          </Text>
        </div>
        {updates.length > 0 && (
          <Badge count={updates.length} color="var(--color-primary)">
            <div className="text-xs text-gray-500 pr-2">{updates.length} update{updates.length !== 1 ? 's' : ''}</div>
          </Badge>
        )}
      </div>

      {/* Manager Info Card */}
      {manager && (
        <Card className="card-shadow mb-6" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="flex items-center gap-4">
            <Avatar size={52} style={{ backgroundColor: 'var(--color-primary)', flexShrink: 0 }}>
              {managerInitials}
            </Avatar>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Your Reporting Manager</div>
              <div className="font-semibold text-gray-800 text-base">{managerName}</div>
              <div className="text-gray-500 text-sm">{manager.email}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Updates Feed */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : updates.length === 0 ? (
        <Card className="card-shadow">
          <Empty
            image={<BellOutlined style={{ fontSize: 48, color: '#d1d5db' }} />}
            description={
              <span className="text-gray-400">
                No updates from your manager yet. Check back later.
              </span>
            }
          />
        </Card>
      ) : (
        <Card className="card-shadow">
          <List
            dataSource={updates}
            renderItem={(upd) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: 'var(--color-primary)' }}>
                      {managerInitials}
                    </Avatar>
                  }
                  title={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{upd.title}</span>
                      <Tag color={CATEGORY_COLOR[upd.category] || 'default'} style={{ fontSize: 11 }}>
                        <TagOutlined /> {CATEGORY_LABEL[upd.category] || upd.category}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph className="!mb-2 text-gray-700">{upd.content}</Paragraph>
                      <div className="flex items-center gap-3">
                        <Text className="text-xs text-gray-400">
                          {dayjs(upd.createdDate).fromNow()} · {dayjs(upd.createdDate).format('DD MMM YYYY, h:mm A')}
                        </Text>
                        {managerName && (
                          <Text className="text-xs text-brand">— {managerName}</Text>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
