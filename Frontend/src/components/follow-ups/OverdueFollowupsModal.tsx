'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Modal, Button, Tag, message, Input, DatePicker, Form, Alert, Divider,
} from 'antd';
import {
  CheckCircleOutlined, CalendarOutlined, PhoneOutlined, WarningFilled,
  UserOutlined, ClockCircleOutlined, CloseCircleOutlined,
  ArrowRightOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TodayFollowup } from '@/types/enquiry';
import { submitFollowupOutcome } from '@/lib/api/enquiries';
import dayjs from 'dayjs';

interface OverdueFollowupsModalProps {
  overdueItems: TodayFollowup[];
}

const OUTCOMES = [
  {
    value: 'follow_up',
    label: 'Schedule Follow-up',
    icon: <CalendarOutlined />,
    description: 'Plan the next call',
    color: '#1677ff',
    bg: '#e6f4ff',
  },
  {
    value: 'not_available',
    label: 'Not Available',
    icon: <ClockCircleOutlined />,
    description: 'Try again later',
    color: '#d46b08',
    bg: '#fff7e6',
  },
  {
    value: 'not_interested',
    label: 'Not Interested',
    icon: <CloseCircleOutlined />,
    description: 'Close this enquiry',
    color: '#cf1322',
    bg: '#fff1f0',
  },
];

export function OverdueFollowupsModal({ overdueItems }: OverdueFollowupsModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [actionedIds, setActionedIds] = useState<Set<number>>(new Set());
  const [actionItem, setActionItem] = useState<TodayFollowup | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string>('follow_up');
  const [form] = Form.useForm();

  const activeItems = useMemo(
    () => overdueItems.filter((item) => !actionedIds.has(item.id)),
    [overdueItems, actionedIds],
  );

  useEffect(() => {
    if (overdueItems.length > 0) setOpen(true);
  }, [overdueItems]);

  useEffect(() => {
    if (open && activeItems.length === 0 && actionedIds.size > 0) setOpen(false);
  }, [open, activeItems.length, actionedIds.size]);

  const openAction = (item: TodayFollowup) => {
    setActionItem(item);
    setSelectedOutcome('follow_up');
    form.resetFields();
  };

  const closeAction = () => {
    setActionItem(null);
    form.resetFields();
  };

  const outcomeMutation = useMutation({
    mutationFn: (data: { outcomeStatus: string; remarks?: string; nextFollowupDate?: string }) =>
      submitFollowupOutcome(actionItem!.enquiry_id, data),
    onSuccess: (response) => {
      const actioned = actionItem;
      const outcome = response?.data?.outcomeStatus;
      const msgs: Record<string, string> = {
        not_interested: 'Enquiry closed',
        follow_up: 'Follow-up rescheduled',
        not_available: 'Saved - will retry later',
      };
      message.success((outcome && msgs[outcome]) || 'Updated');

      if (actioned) setActionedIds((prev) => new Set(prev).add(actioned.id));
      queryClient.invalidateQueries({ queryKey: ['today-followups'] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      closeAction();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update';
      if (msg.includes('already been converted') && actionItem) {
        message.info(`${actionItem.customer_name} already converted to customer.`);
        setActionedIds((prev) => new Set(prev).add(actionItem.id));
        closeAction();
      } else {
        message.error(msg);
      }
    },
  });

  const handleSubmit = (values: any) => {
    outcomeMutation.mutate({
      outcomeStatus: selectedOutcome,
      remarks: values.remarks,
      nextFollowupDate: values.next_followup_date?.format('YYYY-MM-DD'),
    });
  };

  const getOverdueDays = (dateStr: string): number => {
    const dateOnly = dateStr ? dateStr.split('T')[0] : dateStr;
    const due = new Date(dateOnly + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
  };

  const selectedConfig = OUTCOMES.find((o) => o.value === selectedOutcome);
  const needsDate = selectedOutcome === 'follow_up';
  const optionalDate = selectedOutcome === 'not_available';

  return (
    <>
      {/* ── Main overdue list modal ──────────────────────────────── */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={520}
        centered
        title={null}
        footer={null}
        closable
        styles={{
          body: { padding: 0 },
          content: { borderRadius: 14, overflow: 'hidden' },
        }}
      >
        {/* Header */}
        <div style={{
          background: '#ff4d4f',
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WarningFilled style={{ fontSize: 18, color: '#fff' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              Overdue Follow-ups
            </span>
          </div>
          <Tag style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            color: '#fff', fontWeight: 700, borderRadius: 12, fontSize: 13,
          }}>
            {activeItems.length}
          </Tag>
        </div>

        {/* List */}
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {activeItems.map((item, idx) => {
            const days = getOverdueDays(item.next_followup_date);
            return (
              <div key={item.id}>
                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Left: Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.customer_name}
                      </span>
                      <Tag
                        color={days > 7 ? 'red' : days > 3 ? 'volcano' : 'orange'}
                        style={{ borderRadius: 10, fontSize: 11, lineHeight: '18px', padding: '0 8px', flexShrink: 0 }}
                      >
                        {days}d
                      </Tag>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#888' }}>
                      <a href={`tel:${item.customer_mobile}`} style={{ color: '#1677ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <PhoneOutlined style={{ fontSize: 11 }} />
                        {item.customer_mobile}
                      </a>
                      {item.employee_name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <UserOutlined style={{ fontSize: 11 }} />
                          {item.employee_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Button
                      size="small"
                      type="primary"
                      style={{ borderRadius: 6, fontSize: 12, height: 28 }}
                      onClick={() => openAction(item)}
                    >
                      Action
                    </Button>
                    <Button
                      size="small"
                      style={{ borderRadius: 6, fontSize: 12, height: 28 }}
                      onClick={() => router.push(`/enquiries/${item.enquiry_id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
                {idx < activeItems.length - 1 && (
                  <div style={{ borderBottom: '1px solid #f5f5f5', margin: '0 20px' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <Button size="small" type="text" style={{ color: '#999' }} onClick={() => setOpen(false)}>
            Dismiss
          </Button>
        </div>
      </Modal>

      {/* ── Action sub-modal ─────────────────────────────────────── */}
      <Modal
        open={!!actionItem}
        onCancel={closeAction}
        footer={null}
        maskClosable={false}
        width={480}
        centered
        title={null}
        zIndex={1100}
        styles={{
          body: { padding: 0 },
          content: { borderRadius: 14, overflow: 'hidden' },
        }}
      >
        {actionItem && (
          <>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Follow-up action
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
                    {actionItem.customer_name}
                  </span>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12 }}>
                    <a href={`tel:${actionItem.customer_mobile}`} style={{ color: '#1677ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <PhoneOutlined style={{ fontSize: 11 }} />
                      {actionItem.customer_mobile}
                    </a>
                  </div>
                </div>
                <Tag color="red" style={{ borderRadius: 10, fontWeight: 600, fontSize: 12 }}>
                  {getOverdueDays(actionItem.next_followup_date)}d overdue
                </Tag>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 10 }}>
                Outcome
              </div>

              {/* Outcome buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {OUTCOMES.map((opt) => {
                  const active = selectedOutcome === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedOutcome(opt.value)}
                      style={{
                        flex: 1, textAlign: 'center', cursor: 'pointer',
                        padding: '10px 8px', borderRadius: 10,
                        border: `2px solid ${active ? opt.color : '#eee'}`,
                        background: active ? opt.bg : '#fafafa',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 18, color: active ? opt.color : '#bbb', marginBottom: 4 }}>
                        {opt.icon}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: active ? opt.color : '#888', lineHeight: 1.2 }}>
                        {opt.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedOutcome === 'not_interested' && (
                <Alert
                  type="warning"
                  showIcon
                  message="This will close the enquiry permanently."
                  style={{ marginBottom: 12, borderRadius: 8, fontSize: 12 }}
                />
              )}

              <Form form={form} layout="vertical" onFinish={handleSubmit} size="small">
                <Form.Item name="remarks" label="Notes" style={{ marginBottom: 10 }}>
                  <Input.TextArea
                    rows={2}
                    placeholder={
                      selectedOutcome === 'not_interested' ? 'Reason (optional)...'
                      : selectedOutcome === 'not_available' ? 'e.g. Phone off, will retry...'
                      : 'What was discussed?...'
                    }
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                {(needsDate || optionalDate) && (
                  <Form.Item
                    name="next_followup_date"
                    label="Next Follow-up Date"
                    rules={needsDate ? [{ required: true, message: 'Pick a date' }] : []}
                    style={{ marginBottom: 10 }}
                  >
                    <DatePicker
                      style={{ width: '100%', borderRadius: 8 }}
                      format="DD MMM YYYY"
                      disabledDate={(d) => d && d < dayjs().startOf('day')}
                    />
                  </Form.Item>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Button style={{ flex: 1, borderRadius: 8 }} onClick={closeAction} disabled={outcomeMutation.isPending}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={outcomeMutation.isPending}
                    danger={selectedOutcome === 'not_interested'}
                    style={{
                      flex: 2, borderRadius: 8,
                      ...(selectedOutcome !== 'not_interested' ? { background: selectedConfig?.color, borderColor: selectedConfig?.color } : {}),
                    }}
                  >
                    {selectedOutcome === 'not_interested' ? 'Close Enquiry'
                      : selectedOutcome === 'follow_up' ? 'Schedule'
                      : 'Save'}
                  </Button>
                </div>
              </Form>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
