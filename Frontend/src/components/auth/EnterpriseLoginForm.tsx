'use client';

import { useState } from 'react';
import { Form, Input, Button, message, Steps } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  enterpriseEmailSchema,
  enterprisePasswordSchema,
  EnterpriseEmailFormData,
  EnterprisePasswordFormData,
} from '@/lib/validations/auth';
import { verifyEnterpriseEmail, verifyPassword } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Enterprise } from '@/types';

type Step = 'email' | 'password';

export function EnterpriseLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [enterpriseData, setEnterpriseData] = useState<Enterprise | null>(null);
  const { login } = useAuthStore();

  const emailForm = useForm<EnterpriseEmailFormData>({
    resolver: zodResolver(enterpriseEmailSchema),
    defaultValues: { email: '' },
  });

  const passwordForm = useForm<EnterprisePasswordFormData>({
    resolver: zodResolver(enterprisePasswordSchema),
    defaultValues: { email_id: '', password: '' },
  });

  const handleEmailSubmit = async (data: EnterpriseEmailFormData) => {
    setLoading(true);
    try {
      const response = await verifyEnterpriseEmail(data.email);

      if (response.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emailData = response.data as any;
        // Map backend camelCase to frontend snake_case
        setEnterpriseData({
          business_name: emailData.businessName || emailData.business_name,
          email: emailData.email,
        } as Enterprise);
        setVerifiedEmail(data.email);
        passwordForm.setValue('email_id', data.email);
        setCurrentStep('password');
        message.success('Email verified! Please enter your password.');
      } else {
        message.error(response.message || 'Email not found');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: EnterprisePasswordFormData) => {
    setLoading(true);
    try {
      const response = await verifyPassword(data.email_id, data.password);

      if (response.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loginData = response.data as any;
        // Map backend camelCase response to frontend snake_case Enterprise type
        const mappedUser: Enterprise = {
          enterprise_id: loginData.user.id,
          business_name: loginData.user.businessName,
          email: loginData.user.email,
          mobile: loginData.user.mobile,
          address: loginData.user.address,
          state: loginData.user.state,
          city: loginData.user.city,
          pincode: loginData.user.pincode,
          gst_number: loginData.user.gstNumber,
          cin_number: loginData.user.cinNumber,
          licencekey: loginData.user.licencekey,
          expiry_date: loginData.user.expiryDate,
          email_status: loginData.user.emailStatus ?? 0,
          mobile_status: loginData.user.mobileStatus ?? 0,
          status: loginData.user.status,
        };
        login(mappedUser, 'enterprise', loginData.token);
        message.success(response.message || 'Login successful!');
        router.push('/dashboard');
      } else {
        message.error(response.message || 'Invalid password');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep('email');
    setVerifiedEmail('');
    setEnterpriseData(null);
  };

  return (
    <div>
      <Steps
        current={currentStep === 'email' ? 0 : 1}
        size="small"
        className="mb-6"
        items={[
          { title: 'Email', icon: <MailOutlined /> },
          { title: 'Password', icon: <LockOutlined /> },
        ]}
      />

      {currentStep === 'email' && (
        <Form layout="vertical" onFinish={emailForm.handleSubmit(handleEmailSubmit)}>
          <Form.Item
            label="Business Email"
            validateStatus={emailForm.formState.errors.email ? 'error' : ''}
            help={emailForm.formState.errors.email?.message}
          >
            <Controller
              name="email"
              control={emailForm.control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="Enter your business email"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-6">
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Continue
            </Button>
          </Form.Item>
        </Form>
      )}

      {currentStep === 'password' && (
        <Form layout="vertical" onFinish={passwordForm.handleSubmit(handlePasswordSubmit)}>
          {enterpriseData && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600">Logging in as</p>
              <p className="font-semibold text-gray-800">{enterpriseData.business_name}</p>
              <p className="text-sm text-gray-500">{verifiedEmail}</p>
            </div>
          )}

          <Form.Item
            label="Password"
            validateStatus={passwordForm.formState.errors.password ? 'error' : ''}
            help={passwordForm.formState.errors.password?.message}
          >
            <Controller
              name="password"
              control={passwordForm.control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Enter your password"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-6">
            <div className="flex gap-3">
              <Button onClick={handleBack} size="large" className="flex-1">
                Back
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} size="large" className="flex-1">
                Sign In
              </Button>
            </div>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
