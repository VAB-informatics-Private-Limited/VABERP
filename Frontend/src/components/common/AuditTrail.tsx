'use client';

import { Timeline, Tag, Spin, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/lib/api/audit-logs';
import type { AuditLog } from '@/lib/api/audit-logs';

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  status_change: 'orange',
  convert: 'purple',
  payment: 'cyan',
  approve: 'lime',
  issue: 'gold',
  receive: 'geekblue',
};

interface AuditTrailProps {
  entityType: string;
  entityId: number;
}

export function AuditTrail({ entityType, entityId }: AuditTrailProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-trail', entityType, entityId],
    queryFn: () => getAuditLogs({ entityType, entityId, pageSize: 50 }),
    enabled: !!entityType && !!entityId,
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Spin /></div>;
  }

  if (!data?.data?.length) {
    return <Empty description="No activity recorded" />;
  }

  return (
    <Timeline
      items={data.data.map((log: AuditLog) => ({
        color: ACTION_COLORS[log.action] || 'gray',
        children: (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag color={ACTION_COLORS[log.action] || 'default'} className="text-xs">
                {log.action.replace('_', ' ').toUpperCase()}
              </Tag>
              <span className="text-xs text-gray-400">
                {new Date(log.created_date).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-sm">{log.description || `${log.action} by ${log.user_name || 'System'}`}</div>
            {log.user_name && <div className="text-xs text-gray-500">by {log.user_name}</div>}
          </div>
        ),
      }))}
    />
  );
}
