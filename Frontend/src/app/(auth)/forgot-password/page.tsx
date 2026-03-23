'use client';

import { useState } from 'react';
import { Form, Input, Button, message, Typography, Result } from 'antd';
import { MailOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordResetSchema, PasswordResetFormData } from '@/lib/validations/auth';
import { resetPassword } from '@/lib/api';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email_id: '',
      oldpassword: '',
      confirmpassword: '',
    },
  });

  const onSubmit = async (data: PasswordResetFormData) => {
    setLoading(true);
    try {
      await resetPassword(data);
      setSuccess(true);
      message.success('Password updated successfully!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg[0] : msg || 'Password reset failed';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-card">
        <Result
          icon={<CheckCircleOutlined className="text-green-500" />}
          status="success"
          title="Password Updated!"
          subTitle="Your password has been successfully updated. You can now login with your new password."
          extra={
            <Link href="/login">
              <Button type="primary" size="large">
                Go to Login
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="login-card">
      <div className="text-center mb-8">
        <Title level={3} className="!mb-2">
          Reset Password
        </Title>
        <Text type="secondary">Enter your email and current password to reset</Text>
      </div>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          label="Email"
          validateStatus={errors.email_id ? 'error' : ''}
          help={errors.email_id?.message}
        >
          <Controller
            name="email_id"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="Enter your email"
                size="large"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Current Password"
          validateStatus={errors.oldpassword ? 'error' : ''}
          help={errors.oldpassword?.message}
        >
          <Controller
            name="oldpassword"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Enter current password"
                size="large"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="New Password"
          validateStatus={errors.confirmpassword ? 'error' : ''}
          help={errors.confirmpassword?.message}
        >
          <Controller
            name="confirmpassword"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Enter new password"
                size="large"
              />
            )}
          />
        </Form.Item>

        <Form.Item className="mb-0 mt-6">
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Reset Password
          </Button>
        </Form.Item>
      </Form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-primary hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
