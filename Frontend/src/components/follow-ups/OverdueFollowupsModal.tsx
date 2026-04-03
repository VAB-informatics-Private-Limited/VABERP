'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Modal, Button, Tag, Space, message, Input, DatePicker, Form, Alert,
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
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';

interface OverdueFollowupsModalProps {
  overdueItems: TodayFollowup[];
}

const OUTCOMES = [
  {
    value: 'follow_up',
    label: 'Schedule Follow-up',
    icon: <CalendarOutlined />,
    description: 'Plan the next call or meeting',
    color: '#1677ff',
    bg: '#e6f4ff',
    border: '#91caff',
  },
  {
    value: 'not_available',
    label: 'Not Available',
    icon: <ClockCircleOutlined />,
    description: 'Customer didn\'t answer or was busy',
    color: '#d46b08',
    bg: '#fff7e6',
    border: '#ffd591',
  },
  {
    value: 'not_interested',
    label: 'Not Interested',
    icon: <CloseCircleOutlined />,
    description: 'Close enquiry — no further follow-ups',
    color: '#cf1322',
    bg: '#fff1f0',
    border: '#ffa39e',
  },
];

export function OverdueFollowupsModal({ overdueItems }: OverdueFollowupsModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [actionedIds, setActionedIds] = useState<Set<number>>(new Set());
  const [actionItem, setActionItem] = useState<TodayFollowup | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string>('not_interested');
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

  const openAction = (item: TodayFollowup, outcome: string) => {
    setActionItem(item);
    setSelectedOutcome(outcome);
    form.resetFields();
    form.setFieldsValue({ outcome_status: outcome });
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
        not_interested: 'Enquiry marked as not interested',
        follow_up: 'Follow-up rescheduled successfully',
        not_available: 'Saved — will try again later',
      };
      message.success((outcome && msgs[outcome]) || 'Updated successfully');

      if (actioned) setActionedIds((prev) => new Set(prev).add(actioned.id));
      queryClient.invalidateQueries({ queryKey: ['today-followups'] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      closeAction();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update follow-up';
      // If already converted, dismiss the item from the list automatically
      if (msg.includes('already been converted') && actionItem) {
        message.info(`${actionItem.customer_name} has already been converted to a customer.`);
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
    // Normalize ISO timestamp to date-only before parsing to avoid timezone shifts
    const dateOnly = dateStr ? dateStr.split('T')[0] : dateStr;
    const due = new Date(dateOnly + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
  };

  const selectedOutcomeConfig = OUTCOMES.find((o) => o.value === selectedOutcome);
  const needsNextDate = selectedOutcome === 'follow_up';
  const optionalNextDate = selectedOutcome === 'not_available';

  const submitLabel =
    selectedOutcome === 'not_interested' ? 'Mark as Not Interested'
    : selectedOutcome === 'follow_up' ? 'Schedule Follow-up'
    : 'Save & Continue';

  return (
    <>
      {/* ── Overdue list modal ─────────────────────────────────────────────── */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={560}
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
        <div style={{
          background: 'linear-gradient(135deg, #ff4d4f 0%, #fa8c16 100%)',
          padding: '20px 24px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <WarningFilled style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                Overdue Follow-ups
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                {activeItems.length} item{activeItems.length !== 1 ? 's' : ''} need{activeItems.length === 1 ? 's' : ''} your attention
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ padding: '12px 16px', maxHeight: 440, overflowY: 'auto' }}>
          {activeItems.map((item, index) => {
            const days = getOverdueDays(item.next_followup_date);
            const urgency = days > 7 ? 'red' : days > 3 ? 'orange' : 'gold';
            return (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: index < activeItems.length - 1 ? 10 : 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Name + overdue badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a1a' }}>
                      {item.customer_name}
                    </div>
                    {item.business_name && (
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {item.business_name}
                      </div>
                    )}
                  </div>
                  <Tag color={urgency} style={{ fontWeight: 600, borderRadius: 20, marginLeft: 8 }}>
                    {days === 0 ? 'Due today' : `${days}d overdue`}
                  </Tag>
                </div>

                {/* Contact row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, marginBottom: 12, flexWrap: 'wrap' }}>
                  <a
                    href={`tel:${item.customer_mobile}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1677ff', textDecoration: 'none' }}
                  >
                    <PhoneOutlined style={{ fontSize: 12 }} />
                    {item.customer_mobile}
                  </a>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ff4d4f' }}>
                    <ClockCircleOutlined style={{ fontSize: 12 }} />
                    {dayjs(item.next_followup_date.split('T')[0]).format('DD MMM YYYY')}
                  </span>
                  {item.employee_name && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#999' }}>
                      <UserOutlined style={{ fontSize: 12 }} />
                      {item.employee_name}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 8, flex: 1 }}
                    onClick={() => openAction(item, 'not_interested')}
                  >
                    Complete
                  </Button>
                  <Button
                    size="small"
                    icon={<FileTextOutlined />}
                    style={{ borderRadius: 8, flex: 1 }}
                    onClick={() => router.push(`/quotations/create?enquiryId=${item.enquiry_id}`)}
                  >
                    Create Quotation
                  </Button>
                  <Button
                    size="small"
                    icon={<ArrowRightOutlined />}
                    style={{ borderRadius: 8 }}
                    onClick={() => router.push(`/enquiries/${item.enquiry_id}`)}
                  >
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <Button type="text" style={{ color: '#999' }} onClick={() => setOpen(false)}>
            Dismiss for now
          </Button>
        </div>
      </Modal>

      {/* ── Action sub-modal ───────────────────────────────────────────────── */}
      <Modal
        open={!!actionItem}
        onCancel={closeAction}
        footer={null}
        maskClosable={false}
        width={540}
        centered
        title={null}
        zIndex={1100}
        styles={{
          body: { padding: 0 },
          content: { borderRadius: 16, overflow: 'hidden' },
        }}
      >
        {actionItem && (
          <>
            {/* Customer context header */}
            <div style={{
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              padding: '18px 24px',
            }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Updating follow-up for
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a' }}>
                    {actionItem.customer_name}
                  </div>
                  {actionItem.business_name && (
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                      {actionItem.business_name}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13 }}>
                    <a
                      href={`tel:${actionItem.customer_mobile}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1677ff' }}
                    >
                      <PhoneOutlined style={{ fontSize: 12 }} />
                      {actionItem.customer_mobile}
                    </a>
                    {actionItem.employee_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#888' }}>
                        <UserOutlined style={{ fontSize: 12 }} />
                        {actionItem.employee_name}
                      </span>
                    )}
                  </div>
                </div>
                <Tag color="red" style={{ fontWeight: 600, borderRadius: 20, marginLeft: 8, whiteSpace: 'nowrap' }}>
                  {getOverdueDays(actionItem.next_followup_date)}d overdue
                </Tag>
              </div>
            </div>

            {/* Form body */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>
                What was the outcome of this call?
              </div>

              {/* Outcome cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {OUTCOMES.map((opt) => {
                  const isSelected = selectedOutcome === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedOutcome(opt.value)}
                      style={{
                        border: `2px solid ${isSelected ? opt.color : '#e8e8e8'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        background: isSelected ? opt.bg : '#fff',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isSelected ? opt.color : '#f0f0f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 14,
                        color: isSelected ? '#fff' : '#999',
                        transition: 'all 0.15s',
                      }}>
                        {opt.icon}
                      </div>
                      <div>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: isSelected ? opt.color : '#333',
                          lineHeight: 1.3,
                        }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2, lineHeight: 1.3 }}>
                          {opt.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Contextual alert */}
              {selectedOutcome === 'not_interested' && (
                <Alert
                  type="warning"
                  showIcon
                  message="This will close the enquiry. No further follow-ups will be scheduled."
                  style={{ marginBottom: 14, borderRadius: 8 }}
                />
              )}

              {/* Remarks + date form */}
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item name="remarks" label="Call Notes" style={{ marginBottom: 12 }}>
                  <Input.TextArea
                    rows={3}
                    placeholder={
                      selectedOutcome === 'not_interested' ? 'Reason for disinterest (optional)…'
                      : selectedOutcome === 'not_available' ? 'e.g. Phone was off, will retry…'
                      : 'What was discussed on the call?…'
                    }
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                {(needsNextDate || optionalNextDate) && (
                  <Form.Item
                    name="next_followup_date"
                    label="Next Follow-up Date"
                    rules={needsNextDate ? [{ required: true, message: 'Please pick a date' }] : []}
                    style={{ marginBottom: 12 }}
                  >
                    <DatePicker
                      style={{ width: '100%', borderRadius: 8 }}
                      format="DD MMM YYYY"
                      disabledDate={(d) => d && d < dayjs().startOf('day')}
                    />
                  </Form.Item>
                )}

                {/* Submit row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Button
                    style={{ flex: 1, borderRadius: 8 }}
                    onClick={closeAction}
                    disabled={outcomeMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={outcomeMutation.isPending}
                    style={{
                      flex: 2,
                      borderRadius: 8,
                      background: selectedOutcomeConfig?.color,
                      borderColor: selectedOutcomeConfig?.color,
                    }}
                    danger={selectedOutcome === 'not_interested'}
                  >
                    {submitLabel}
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
