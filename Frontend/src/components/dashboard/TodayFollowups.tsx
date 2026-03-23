'use client';

import { Card, List, Tag, Empty, Button, Spin } from 'antd';
import { PhoneOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getTodayFollowups } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { FollowupItem } from '@/types';

export function TodayFollowups() {
  const { getEnterpriseId, getEmployeeId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const employeeId = getEmployeeId();

  const { data, isLoading } = useQuery({
    queryKey: ['todayFollowups', enterpriseId],
    queryFn: () =>
      getTodayFollowups({
        enterpriseId: enterpriseId!,
        employee_id: employeeId || undefined,
      }),
    enabled: !!enterpriseId,
  });

  const followups: FollowupItem[] = (data?.data as FollowupItem[]) || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      enquiry: 'blue',
      followup: 'orange',
      prospect: 'green',
      quotationsent: 'purple',
      notinterested: 'red',
    };
    return colors[status?.toLowerCase()] || 'default';
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ClockCircleOutlined />
          <span>Today&apos;s Follow-ups</span>
          {followups.length > 0 && (
            <Tag color="blue">{followups.length}</Tag>
          )}
        </div>
      }
      extra={<Button type="link">View All</Button>}
      className="card-shadow h-full"
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : followups.length === 0 ? (
        <Empty description="No follow-ups scheduled for today" />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={followups.slice(0, 5)}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="call" type="primary" size="small" icon={<PhoneOutlined />}>
                  Call
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserOutlined className="text-blue-500" />
                  </div>
                }
                title={
                  <div className="flex items-center gap-2">
                    <span>{item.contact_person || item.business_name}</span>
                    <Tag color={getStatusColor(item.interest_status)}>
                      {item.interest_status}
                    </Tag>
                  </div>
                }
                description={
                  <div className="text-gray-500 text-sm">
                    <span>{item.mobile}</span>
                    {item.remarks && <span className="ml-2">• {item.remarks}</span>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
