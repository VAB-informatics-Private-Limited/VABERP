'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Tag, Space, message } from 'antd';
import {
  CheckCircleOutlined,
  CalendarOutlined,
  PhoneOutlined,
  WarningFilled,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TodayFollowup } from '@/types/enquiry';
import { FollowupForm } from '@/components/enquiries/FollowupForm';
import { submitFollowupOutcome } from '@/lib/api/enquiries';
import { useAuthStore } from '@/stores/authStore';

interface OverdueFollowupsModalProps {
  overdueItems: TodayFollowup[];
}

export function OverdueFollowupsModal({ overdueItems }: OverdueFollowupsModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [open, setOpen] = useState(false);
  const [actionedIds, setActionedIds] = useState<Set<number>>(new Set());
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    followup: TodayFollowup | null;
    mode: 'complete' | 'reschedule';
  }>({ open: false, followup: null, mode: 'complete' });

  const activeItems = useMemo(
    () => overdueItems.filter((item) => !actionedIds.has(item.id)),
    [overdueItems, actionedIds]
  );

  useEffect(() => {
    if (overdueItems.length > 0) {
      setOpen(true);
    }
  }, [overdueItems]);

  useEffect(() => {
    if (open && activeItems.length === 0 && actionedIds.size > 0) {
      setOpen(false);
    }
  }, [open, activeItems.length, actionedIds.size]);

  const outcomeMutation = useMutation({
    mutationFn: (data: { outcomeStatus: string; remarks?: string; nextFollowupDate?: string }) =>
      submitFollowupOutcome(actionModal.followup!.enquiry_id, data),
    onSuccess: (response) => {
      const actionedItem = actionModal.followup;
      const outcome = response?.data?.outcomeStatus;

      if (outcome === 'sale_closed') {
        message.success('Sale closed! Customer created successfully.');
        const customerId = response?.data?.customer?.id;
        if (customerId) {
          setActionModal({ open: false, followup: null, mode: 'complete' });
          setOpen(false);
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

      if (actionedItem) {
        setActionedIds((prev) => new Set(prev).add(actionedItem.id));
      }
      queryClient.invalidateQueries({ queryKey: ['today-followups'] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      setActionModal({ open: false, followup: null, mode: 'complete' });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to update follow-up');
    },
  });

  const getOverdueDays = (dateStr: string): number => {
    const dueDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={540}
        centered
        title={null}
        footer={null}
        closable
        styles={{
          body: { padding: 0 },
          content: { borderRadius: 16, overflow: 'hidden' },
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
              <WarningFilled className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold m-0 text-white">Overdue Follow-ups</h3>
              <p className="text-white/80 text-sm m-0 mt-0.5">
                {activeItems.length} pending {activeItems.length === 1 ? 'action' : 'actions'}
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="px-4 py-3 max-h-[420px] overflow-y-auto">
          {activeItems.map((item, index) => {
            const days = getOverdueDays(item.next_followup_date);
            return (
              <div
                key={item.id}
                className={`rounded-xl border border-gray-100 bg-white p-4 hover:shadow-md transition-shadow ${
                  index < activeItems.length - 1 ? 'mb-3' : ''
                }`}
              >
                {/* Top row: name + overdue tag */}
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <div className="font-semibold text-gray-800 text-[15px]">
                      {item.customer_name}
                    </div>
                    {item.business_name && (
                      <div className="text-xs text-gray-400 mt-0.5">{item.business_name}</div>
                    )}
                  </div>
                  <Tag
                    color={days > 7 ? 'red' : days > 3 ? 'orange' : 'gold'}
                    className="ml-2 font-medium !m-0"
                  >
                    {days}d overdue
                  </Tag>
                </div>

                {/* Info row */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <a
                    href={`tel:${item.customer_mobile}`}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <PhoneOutlined className="text-xs" />
                    {item.customer_mobile}
                  </a>
                  <span className="flex items-center gap-1">
                    <ClockCircleOutlined className="text-xs text-red-400" />
                    <span className="text-red-500">{item.next_followup_date}</span>
                  </span>
                  {item.employee_name && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <UserOutlined className="text-xs" />
                      {item.employee_name}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    className="bg-[#52c41a] hover:bg-[#73d13d] border-[#52c41a] hover:border-[#73d13d] rounded-lg"
                    onClick={() =>
                      setActionModal({ open: true, followup: item, mode: 'complete' })
                    }
                  >
                    Complete
                  </Button>
                  <Button
                    size="small"
                    icon={<CalendarOutlined />}
                    className="rounded-lg"
                    onClick={() =>
                      setActionModal({ open: true, followup: item, mode: 'reschedule' })
                    }
                  >
                    Reschedule
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <Button
            type="text"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setOpen(false)}
          >
            Dismiss for now
          </Button>
        </div>
      </Modal>

      {/* Action sub-modal */}
      <Modal
        title={`Update — ${actionModal.followup?.customer_name}`}
        open={actionModal.open}
        onCancel={() => setActionModal({ open: false, followup: null, mode: 'complete' })}
        footer={null}
        maskClosable={false}
        width={620}
        centered
        zIndex={1100}
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
