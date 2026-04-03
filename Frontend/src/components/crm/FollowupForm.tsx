'use client';

import { Modal, Form, Select, DatePicker, Input, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addLeadFollowup } from '@/lib/api/crm';
import { CRM_STATUS_OPTIONS, FOLLOWUP_TYPE_OPTIONS } from '@/types/crm';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  leadId: number | null;
  onClose: () => void;
}

export function FollowupForm({ open, leadId, onClose }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: any) => addLeadFollowup(leadId!, {
      followupType: values.followupType,
      followupDate: values.followupDate.toISOString(),
      status: values.status,
      notes: values.notes,
      nextFollowupDate: values.nextFollowupDate ? dayjs(values.nextFollowupDate).format('YYYY-MM-DD') : undefined,
      nextFollowupType: values.nextFollowupType,
    }),
    onSuccess: () => {
      message.success('Follow-up logged');
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['crm-followups', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      onClose();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to log follow-up'),
  });

  return (
    <Modal
      title="Log Follow-up"
      open={open}
      onOk={() => form.validateFields().then(v => mutation.mutate(v))}
      onCancel={() => { form.resetFields(); onClose(); }}
      confirmLoading={mutation.isPending}
      okText="Save"
      width={500}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="followupType" label="Type" rules={[{ required: true }]}>
          <Select options={FOLLOWUP_TYPE_OPTIONS} placeholder="Select type" />
        </Form.Item>
        <Form.Item name="followupDate" label="Date & Time" rules={[{ required: true }]}
          initialValue={dayjs()}>
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="status" label="Update Lead Status">
          <Select
            placeholder="Keep current status"
            allowClear
            options={CRM_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} placeholder="What was discussed?" />
        </Form.Item>
        <Form.Item name="nextFollowupDate" label="Next Follow-up Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="nextFollowupType" label="Next Follow-up Type">
          <Select options={FOLLOWUP_TYPE_OPTIONS} placeholder="Select type" allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
}
