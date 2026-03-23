'use client';

import { Timeline, Tag, Empty, Spin } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Followup, INTEREST_STATUS_OPTIONS } from '@/types/enquiry';

interface FollowupTimelineProps {
  followups: Followup[];
  loading: boolean;
}

export function FollowupTimeline({ followups, loading }: FollowupTimelineProps) {
  const getStatusColor = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.label || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spin />
      </div>
    );
  }

  if (!followups || followups.length === 0) {
    return <Empty description="No follow-up history" />;
  }

  const items = followups.map((followup) => ({
    color: getStatusColor(followup.interest_status),
    children: (
      <div className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Tag color={getStatusColor(followup.interest_status)}>
            {getStatusLabel(followup.interest_status)}
          </Tag>
          <span className="text-gray-500 text-sm flex items-center gap-1">
            <ClockCircleOutlined />
            {followup.followup_date} {followup.followup_time && `at ${followup.followup_time}`}
          </span>
        </div>
        {followup.remarks && (
          <p className="text-gray-700 my-1">{followup.remarks}</p>
        )}
        {followup.next_followup_date && (
          <p className="text-blue-600 text-sm">
            Next follow-up: {followup.next_followup_date}
          </p>
        )}
        {followup.employee_name && (
          <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
            <UserOutlined />
            {followup.employee_name}
          </p>
        )}
      </div>
    ),
  }));

  return <Timeline items={items} />;
}
