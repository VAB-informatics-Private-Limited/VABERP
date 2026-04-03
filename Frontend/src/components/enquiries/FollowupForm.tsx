'use client';

import { Form, Input, Select, DatePicker, TimePicker, Button, Alert } from 'antd';
import { FollowupFormData, INTEREST_STATUS_OPTIONS } from '@/types/enquiry';
import dayjs from 'dayjs';
import { useState } from 'react';

const OUTCOME_OPTIONS = [
  { value: 'follow_up', label: 'Follow Up', color: 'cyan' },
  { value: 'not_available', label: 'Not Available', color: 'orange' },
  { value: 'not_interested', label: 'Not Interested', color: 'red' },
];

interface FollowupFormProps {
  enquiryId: number;
  onSubmit: (data: FollowupFormData) => void;
  onCancel: () => void;
  loading: boolean;
  mode?: 'log' | 'complete' | 'reschedule';
  /** When true, uses the outcome workflow with status-driven actions */
  useOutcome?: boolean;
  onOutcomeSubmit?: (data: { outcomeStatus: string; remarks?: string; nextFollowupDate?: string }) => void;
}

export function FollowupForm({
  enquiryId,
  onSubmit,
  onCancel,
  loading,
  mode = 'log',
  useOutcome = false,
  onOutcomeSubmit,
}: FollowupFormProps) {
  const [form] = Form.useForm();
  const [selectedOutcome, setSelectedOutcome] = useState<string>(
    mode === 'complete' ? 'not_interested' : mode === 'reschedule' ? 'follow_up' : ''
  );

  // ---- Outcome-based workflow ----
  if (useOutcome && onOutcomeSubmit) {
    const needsNextDate = selectedOutcome === 'follow_up';
    const optionalNextDate = selectedOutcome === 'not_available';
    const showNextDate = needsNextDate || optionalNextDate;
    const isClosed = selectedOutcome === 'not_interested';

    const handleOutcomeFinish = (values: any) => {
      onOutcomeSubmit({
        outcomeStatus: values.outcome_status,
        remarks: values.remarks,
        nextFollowupDate: values.next_followup_date?.format('YYYY-MM-DD'),
      });
    };

    const submitLabel =
      selectedOutcome === 'not_interested' ? 'Mark Not Interested'
      : selectedOutcome === 'follow_up' ? 'Schedule Follow-up'
      : selectedOutcome === 'not_available' ? 'Save & Continue'
      : 'Submit';

    return (
      <Form
        form={form}
        layout="vertical"
        onFinish={handleOutcomeFinish}
        initialValues={{ outcome_status: selectedOutcome || undefined }}
      >
        <Form.Item
          name="outcome_status"
          label="Call Outcome"
          rules={[{ required: true, message: 'Please select the call outcome' }]}
        >
          <Select
            placeholder="What happened on the call?"
            onChange={(val) => {
              setSelectedOutcome(val);
              if (val === 'not_interested') {
                form.setFieldValue('next_followup_date', undefined);
              }
            }}
          >
            {OUTCOME_OPTIONS.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedOutcome === 'not_interested' && (
          <Alert
            type="warning"
            showIcon
            message="This will close the enquiry. No further follow-ups will be scheduled."
            className="mb-4"
          />
        )}

        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea
            placeholder={
              selectedOutcome === 'not_interested' ? 'Reason for not interested (optional)'
              : 'Call notes (optional)'
            }
            rows={4}
          />
        </Form.Item>

        {showNextDate && (
          <Form.Item
            name="next_followup_date"
            label="Next Follow-up Date"
            rules={needsNextDate ? [{ required: true, message: 'Next follow-up date is required' }] : []}
          >
            <DatePicker
              className="w-full"
              format="DD-MM-YYYY"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            danger={selectedOutcome === 'not_interested'}
          >
            {submitLabel}
          </Button>
        </div>
      </Form>
    );
  }

  // ---- Legacy mode (log from enquiry detail page) ----
  const handleFinish = (values: {
    followup_date: dayjs.Dayjs;
    followup_time?: dayjs.Dayjs;
    interest_status: string;
    remarks?: string;
    next_followup_date?: dayjs.Dayjs;
  }) => {
    const formData: FollowupFormData = {
      enquiry_id: enquiryId,
      followup_date: values.followup_date.format('YYYY-MM-DD'),
      followup_time: values.followup_time?.format('HH:mm'),
      interest_status: values.interest_status as FollowupFormData['interest_status'],
      remarks: values.remarks,
      next_followup_date: values.next_followup_date?.format('YYYY-MM-DD'),
    };
    onSubmit(formData);
  };

  const getInitialValues = () => {
    if (mode === 'complete') {
      return { followup_date: dayjs(), interest_status: 'not_interested' };
    }
    if (mode === 'reschedule') {
      return { followup_date: dayjs(), interest_status: 'follow_up' };
    }
    return { followup_date: dayjs(), interest_status: 'follow_up' };
  };

  const submitLabel = mode === 'complete' ? 'Mark as Complete' : mode === 'reschedule' ? 'Reschedule' : 'Add Follow-up';

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={getInitialValues()}
    >
      <Form.Item
        name="followup_date"
        label="Follow-up Date"
        rules={[{ required: true, message: 'Please select date' }]}
      >
        <DatePicker className="w-full" format="DD-MM-YYYY" />
      </Form.Item>

      {mode !== 'complete' && (
        <Form.Item name="followup_time" label="Follow-up Time">
          <TimePicker className="w-full" format="HH:mm" />
        </Form.Item>
      )}

      <Form.Item
        name="interest_status"
        label="Updated Status"
        rules={[{ required: true, message: 'Please select status' }]}
      >
        <Select>
          {INTEREST_STATUS_OPTIONS.map((status) => (
            <Select.Option key={status.value} value={status.value}>
              {status.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="remarks" label="Remarks">
        <Input.TextArea placeholder={mode === 'complete' ? 'Completion notes (optional)' : 'Enter follow-up remarks'} rows={4} />
      </Form.Item>

      {mode !== 'complete' && (
        <Form.Item
          name="next_followup_date"
          label="Next Follow-up Date"
          rules={mode === 'reschedule' ? [{ required: true, message: 'Please select next follow-up date' }] : []}
        >
          <DatePicker className="w-full" format="DD-MM-YYYY" disabledDate={(current) => current && current < dayjs().startOf('day')} />
        </Form.Item>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          className={mode === 'complete' ? 'bg-[#52c41a] hover:bg-[#73d13d] border-[#52c41a] hover:border-[#73d13d]' : ''}
        >
          {submitLabel}
        </Button>
      </div>
    </Form>
  );
}
