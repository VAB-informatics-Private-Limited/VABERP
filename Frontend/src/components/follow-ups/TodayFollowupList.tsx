'use client';

import { Table, Button, Tag, Space, Card, Empty, Modal, message } from 'antd';
import { PhoneOutlined, EyeOutlined, CheckCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TodayFollowup, INTEREST_STATUS_OPTIONS } from '@/types/enquiry';
import { FollowupForm } from '@/components/enquiries/FollowupForm';
import { submitFollowupOutcome } from '@/lib/api/enquiries';
import type { ColumnsType } from 'antd/es/table';

interface TodayFollowupListProps {
  data: TodayFollowup[];
  loading: boolean;
}

export function TodayFollowupList({ data, loading }: TodayFollowupListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [actionModal, setActionModal] = useState<{
    open: boolean;
    followup: TodayFollowup | null;
    mode: 'complete' | 'reschedule';
  }>({
    open: false,
    followup: null,
    mode: 'complete',
  });

  const outcomeMutation = useMutation({
    mutationFn: (data: { outcomeStatus: string; remarks?: string; nextFollowupDate?: string }) =>
      submitFollowupOutcome(actionModal.followup!.enquiry_id, data),
    onSuccess: (response) => {
      const outcome = response?.data?.outcomeStatus;

      if (outcome === 'sale_closed') {
        message.success('Sale closed! Customer created successfully.');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['today-followups'] });
        queryClient.invalidateQueries({ queryKey: ['enquiries'] });
        const customerId = response?.data?.customer?.id;
        if (customerId) {
          setActionModal({ open: false, followup: null, mode: 'complete' });
          router.push(`/customers/${customerId}`);
          return;
        }
      } else if (outcome === 'not_interested') {
        message.success('Enquiry marked as not interested');
      } else if (outcome === 'follow_up') {
        message.success('Follow-up rescheduled successfully');
      } else {
        message.success('Follow-up updated successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['today-followups'] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      setActionModal({ open: false, followup: null, mode: 'complete' });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to update follow-up');
    },
  });

  const getStatusColor = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.label || status;
  };

  const columns: ColumnsType<TodayFollowup> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.customer_name}</div>
          {record.business_name && (
            <div className="text-gray-500 text-sm">{record.business_name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <a href={`tel:${record.customer_mobile}`} className="flex items-center gap-1">
          <PhoneOutlined />
          {record.customer_mobile}
        </a>
      ),
    },
    {
      title: 'Current Status',
      dataIndex: 'interest_status',
      key: 'interest_status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'next_followup_date',
      key: 'next_followup_date',
      render: (date) => {
        const isOverdue = new Date(date) < new Date(new Date().toDateString());
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {date}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      title: 'Last Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'Assigned To',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            className="bg-[#52c41a] hover:bg-[#73d13d] border-[#52c41a] hover:border-[#73d13d]"
            onClick={() => setActionModal({ open: true, followup: record, mode: 'complete' })}
          >
            Complete
          </Button>
          <Button
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => setActionModal({ open: true, followup: record, mode: 'reschedule' })}
          >
            Reschedule
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/enquiries/${record.enquiry_id}`)}
          />
        </Space>
      ),
    },
  ];

  if (!loading && (!data || data.length === 0)) {
    return (
      <Card className="card-shadow">
        <Empty description="No follow-ups scheduled" />
      </Card>
    );
  }

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} follow-ups`,
        }}
        scroll={{ x: 1000 }}
      />

      <Modal
        title={`Update — ${actionModal.followup?.customer_name}`}
        open={actionModal.open}
        onCancel={() => setActionModal({ open: false, followup: null, mode: 'complete' })}
        footer={null}
        maskClosable={false}
        width={620}
        centered
      >
        {actionModal.followup && (
          <FollowupForm
            enquiryId={actionModal.followup.enquiry_id}
            onSubmit={() => {}}
            onCancel={() => setActionModal({ open: false, followup: null, mode: 'complete' })}
            loading={outcomeMutation.isPending}
            mode={actionModal.mode}
            useOutcome
            onOutcomeSubmit={(data) => outcomeMutation.mutate(data)}
          />
        )}
      </Modal>
    </>
  );
}
