'use client';

import { Modal, Form, Input, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { sendEmail, SendEmailPayload } from '@/lib/api/email';

const { TextArea } = Input;

export interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
}

export function SendEmailModal({
  open,
  onClose,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
}: SendEmailModalProps) {
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: (payload: SendEmailPayload) => sendEmail(payload),
    onSuccess: () => {
      message.success('Email sent successfully');
      form.resetFields();
      onClose();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message || 'Failed to send email. Please check SMTP configuration.';
      message.error(msg);
    },
  });

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      mutation.mutate({
        to: values.to,
        subject: values.subject,
        body: values.body,
        cc: values.cc || undefined,
      });
    } catch {
      // validation errors shown by form
    }
  };

  return (
    <Modal
      title="Send Email"
      open={open}
      onOk={handleSend}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="Send"
      confirmLoading={mutation.isPending}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          to: defaultTo,
          subject: defaultSubject,
          body: defaultBody,
        }}
        className="mt-4"
      >
        <Form.Item
          name="to"
          label="To"
          rules={[
            { required: true, message: 'Please enter recipient email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="recipient@example.com" />
        </Form.Item>

        <Form.Item name="cc" label="CC">
          <Input placeholder="cc@example.com (optional)" />
        </Form.Item>

        <Form.Item
          name="subject"
          label="Subject"
          rules={[{ required: true, message: 'Please enter a subject' }]}
        >
          <Input placeholder="Email subject" />
        </Form.Item>

        <Form.Item
          name="body"
          label="Message"
          rules={[{ required: true, message: 'Please enter a message' }]}
        >
          <TextArea rows={8} placeholder="Type your message here..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
