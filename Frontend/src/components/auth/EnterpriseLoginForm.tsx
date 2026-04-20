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
  emailOtpSchema,
  EnterpriseEmailFormData,
  EnterprisePasswordFormData,
  EmailOtpFormData,
} from '@/lib/validations/auth';
import { verifyEnterpriseEmail, verifyOtp, verifyPassword } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useBrandingStore } from '@/stores/brandingStore';
import { Enterprise } from '@/types';

type Step = 'email' | 'verify';
type LoginMethod = 'otp' | 'password';

export function EnterpriseLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [enterpriseData, setEnterpriseData] = useState<Enterprise | null>(null);
  const { login } = useAuthStore();

  const emailForm = useForm<EnterpriseEmailFormData>({
    resolver: zodResolver(enterpriseEmailSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<EmailOtpFormData>({
    resolver: zodResolver(emailOtpSchema),
    defaultValues: { email_id: '', otp: '' },
  });

  const passwordForm = useForm<EnterprisePasswordFormData>({
    resolver: zodResolver(enterprisePasswordSchema),
    defaultValues: { email_id: '', password: '' },
  });

  const handleLoginSuccess = (loginData: any) => {
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
      subscription_status: loginData.user.subscriptionStatus,
      plan_id: loginData.user.planId,
      subscription_start_date: loginData.user.subscriptionStartDate,
    };
    login(mappedUser, 'enterprise', loginData.token);
    message.success('Login successful!');
    const isActive = mappedUser.plan_id && mappedUser.expiry_date &&
      new Date(mappedUser.expiry_date) >= new Date() &&
      mappedUser.subscription_status === 'active';
    router.push(isActive ? '/dashboard' : '/activate');
  };

  const handleEmailSubmit = async (data: EnterpriseEmailFormData) => {
    setLoading(true);
    try {
      const response = await verifyEnterpriseEmail(data.email);

      if (response.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emailData = response.data as any;
        setEnterpriseData({
          business_name: emailData.businessName || emailData.business_name,
          email: emailData.email,
        } as Enterprise);
        if (emailData.branding) {
          useBrandingStore.getState().setBranding(emailData.branding);
        }
        setVerifiedEmail(data.email);
        otpForm.setValue('email_id', data.email);
        passwordForm.setValue('email_id', data.email);
        setCurrentStep('verify');
        message.success('OTP sent to your email.');
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

  const handleOtpSubmit = async (data: EmailOtpFormData) => {
    setLoading(true);
    try {
      const response = await verifyOtp(data.email_id, data.otp);
      if (response.data) {
        handleLoginSuccess((response.data as any));
      } else {
        message.error(response.message || 'Invalid OTP');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: EnterprisePasswordFormData) => {
    setLoading(true);
    try {
      const response = await verifyPassword(data.email_id, data.password);
      if (response.data) {
        handleLoginSuccess((response.data as any));
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

  const handleResendOtp = async () => {
    try {
      await verifyEnterpriseEmail(verifiedEmail);
      message.success('OTP resent to your email.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleBack = () => {
    setCurrentStep('email');
    setVerifiedEmail('');
    setEnterpriseData(null);
    setLoginMethod('otp');
  };

  const switchToPassword = () => {
    setLoginMethod('password');
    passwordForm.setValue('email_id', verifiedEmail);
  };

  const switchToOtp = async () => {
    setLoginMethod('otp');
    otpForm.setValue('email_id', verifiedEmail);
    try {
      await verifyEnterpriseEmail(verifiedEmail);
      message.success('OTP sent to your email.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to send OTP');
    }
  };

  return (
    <div>
      <Steps
        current={currentStep === 'email' ? 0 : 1}
        size="small"
        className="mb-6"
        items={[
          { title: 'Email', icon: <MailOutlined /> },
          { title: loginMethod === 'otp' ? 'OTP' : 'Password', icon: loginMethod === 'otp' ? <SafetyOutlined /> : <LockOutlined /> },
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

      {currentStep === 'verify' && loginMethod === 'otp' && (
        <Form layout="vertical" onFinish={otpForm.handleSubmit(handleOtpSubmit)}>
          {enterpriseData && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600">Logging in as</p>
              <p className="font-semibold text-gray-800">{enterpriseData.business_name}</p>
              <p className="text-sm text-gray-500">{verifiedEmail}</p>
            </div>
          )}

          <Form.Item
            label="Enter OTP"
            validateStatus={otpForm.formState.errors.otp ? 'error' : ''}
            help={otpForm.formState.errors.otp?.message}
          >
            <Controller
              name="otp"
              control={otpForm.control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<SafetyOutlined className="text-gray-400" />}
                  placeholder="Enter 6-digit OTP sent to your email"
                  size="large"
                  maxLength={6}
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
            <div className="flex justify-between items-center mt-3">
              <Button type="link" size="small" onClick={handleResendOtp}>
                Resend OTP
              </Button>
              <Button type="link" size="small" onClick={switchToPassword}>
                <LockOutlined /> Login with Password
              </Button>
            </div>
          </Form.Item>
        </Form>
      )}

      {currentStep === 'verify' && loginMethod === 'password' && (
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
            <div className="text-center mt-3">
              <Button type="link" size="small" onClick={switchToOtp}>
                <SafetyOutlined /> Login with OTP
              </Button>
            </div>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
