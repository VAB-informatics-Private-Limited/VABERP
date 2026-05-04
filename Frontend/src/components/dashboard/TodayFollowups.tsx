'use client';

import { useMemo } from 'react';
import { Card, Tag, Empty, Button, Spin, Badge, Tabs } from 'antd';
import { PhoneOutlined, UserOutlined, ClockCircleOutlined, WarningOutlined, CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { getTodayFollowups } from '@/lib/api/enquiries';
import { useAuthStore } from '@/stores/authStore';
import type { TodayFollowup } from '@/types/enquiry';

type Bucket = 'overdue' | 'today' | 'upcoming';

const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    enquiry: 'blue',
    followup: 'orange',
    follow_up: 'orange',
    prospect: 'green',
    hot: 'volcano',
    quotationsent: 'purple',
    quotation_sent: 'purple',
    notinterested: 'red',
    not_interested: 'red',
    new_call: 'cyan',
  };
  return colors[status?.toLowerCase().replace(/\s+/g, '_')] || 'default';
};

export function TodayFollowups() {
  const router = useRouter();
  const { getEmployeeId, userType } = useAuthStore();
  const employeeId = getEmployeeId();

  const { data, isLoading } = useQuery({
    queryKey: ['pendingFollowups', employeeId, userType],
    queryFn: () => getTodayFollowups(undefined, userType === 'employee' ? employeeId || undefined : undefined),
    refetchInterval: 60000,
  });

  const followups: TodayFollowup[] = (data?.data as TodayFollowup[]) || [];

  const { overdue, today, upcoming } = useMemo(() => {
    const startOfToday = dayjs().startOf('day');
    const startOfTomorrow = startOfToday.add(1, 'day');
    const overdue: TodayFollowup[] = [];
    const today: TodayFollowup[] = [];
    const upcoming: TodayFollowup[] = [];
    followups.forEach((f) => {
      if (!f.next_followup_date) return;
      const d = dayjs(f.next_followup_date);
      if (d.isBefore(startOfToday)) overdue.push(f);
      else if (d.isBefore(startOfTomorrow)) today.push(f);
      else upcoming.push(f);
    });
    overdue.sort((a, b) => dayjs(a.next_followup_date).valueOf() - dayjs(b.next_followup_date).valueOf());
    today.sort((a, b) => dayjs(a.next_followup_date).valueOf() - dayjs(b.next_followup_date).valueOf());
    upcoming.sort((a, b) => dayjs(a.next_followup_date).valueOf() - dayjs(b.next_followup_date).valueOf());
    return { overdue, today, upcoming };
  }, [followups]);

  const total = overdue.length + today.length + upcoming.length;
  const defaultTab: Bucket = overdue.length > 0 ? 'overdue' : today.length > 0 ? 'today' : 'upcoming';

  const renderRow = (item: TodayFollowup, bucket: Bucket) => {
    const date = dayjs(item.next_followup_date);
    const diff = date.diff(dayjs().startOf('day'), 'day');
    const when =
      bucket === 'overdue' ? (
        <span className="text-red-600 font-medium">{Math.abs(diff)}d overdue</span>
      ) : bucket === 'today' ? (
        <span className="text-orange-600 font-medium">Today</span>
      ) : (
        <span className="text-blue-600 font-medium">in {diff}d</span>
      );

    return (
      <div
        key={item.id}
        className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded"
        onClick={() => router.push(`/enquiries/${item.enquiry_id || item.id}`)}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            bucket === 'overdue' ? 'bg-red-50 text-red-500' : bucket === 'today' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
          }`}
        >
          <UserOutlined />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-800 truncate">
              {item.customer_name || item.business_name || 'Unknown'}
            </span>
            {item.interest_status && (
              <Tag color={statusColor(item.interest_status)} className="!m-0">
                {item.interest_status}
              </Tag>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">
            {item.customer_mobile || '—'} · {date.format('DD MMM')} · {when}
          </div>
        </div>

        {item.customer_mobile && (
          <Button
            type="primary"
            size="small"
            icon={<PhoneOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `tel:${item.customer_mobile}`;
            }}
          >
            Call
          </Button>
        )}
      </div>
    );
  };

  const renderList = (items: TodayFollowup[], bucket: Bucket, emptyMsg: string) => {
    if (items.length === 0) return <Empty description={emptyMsg} image={Empty.PRESENTED_IMAGE_SIMPLE} className="!my-6" />;
    return <div>{items.slice(0, 8).map((i) => renderRow(i, bucket))}</div>;
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ClockCircleOutlined />
          <span>Pending Follow-ups</span>
          {total > 0 && <Badge count={total} style={{ background: 'var(--color-primary)' }} />}
        </div>
      }
      extra={<Button type="link" onClick={() => router.push('/follow-ups')}>View All</Button>}
      className="card-shadow h-full"
      styles={{ body: { padding: '8px 16px 16px' } }}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : total === 0 ? (
        <Empty description="No pending follow-ups" />
      ) : (
        <Tabs
          defaultActiveKey={defaultTab}
          size="small"
          items={[
            {
              key: 'overdue',
              label: (
                <span>
                  <WarningOutlined className="!text-red-500 mr-1" />
                  Overdue {overdue.length > 0 && <Badge count={overdue.length} size="small" style={{ background: '#ef4444' }} />}
                </span>
              ),
              children: renderList(overdue, 'overdue', 'No overdue follow-ups'),
            },
            {
              key: 'today',
              label: (
                <span>
                  <ClockCircleOutlined className="!text-orange-500 mr-1" />
                  Today {today.length > 0 && <Badge count={today.length} size="small" style={{ background: '#f97316' }} />}
                </span>
              ),
              children: renderList(today, 'today', 'No follow-ups scheduled for today'),
            },
            {
              key: 'upcoming',
              label: (
                <span>
                  <CalendarOutlined className="!text-blue-500 mr-1" />
                  Upcoming {upcoming.length > 0 && <Badge count={upcoming.length} size="small" style={{ background: '#3b82f6' }} />}
                </span>
              ),
              children: renderList(upcoming, 'upcoming', 'No upcoming follow-ups'),
            },
          ]}
        />
      )}
    </Card>
  );
}
