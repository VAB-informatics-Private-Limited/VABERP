'use client';

import { useState, useEffect } from 'react';
import { Typography, Button, message, Card, Steps } from 'antd';
import { MailOutlined, MobileOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { OtpInput } from '@/components/auth/OtpInput';
import { verifyEmailOtp, verifyMobileOtp } from '@/lib/api';

const { Title, Text } = Typography;

type Step = 'email' | 'mobile' | 'complete';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [verificationData, setVerificationData] = useState<{
    email: string;
    mobile: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('pendingVerification');
    if (stored) {
      setVerificationData(JSON.parse(stored));
    } else {
      router.push('/register');
    }
  }, [router]);

  const handleEmailVerify = async () => {
    if (emailOtp.length !== 6) {
      message.error('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyEmailOtp({
        email_id: verificationData!.email,
        otp: emailOtp,
      });

      if (response.status === 'success') {
        message.success('Email verified successfully!');
        setCurrentStep('mobile');
      } else {
        message.error(response.message || 'Invalid OTP');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileVerify = async () => {
    if (mobileOtp.length !== 4) {
      message.error('Please enter 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyMobileOtp({
        mobile_number: verificationData!.mobile,
        otp: mobileOtp,
      });

      if (response.status === 'success') {
        message.success('Mobile verified successfully!');
        setCurrentStep('complete');
        sessionStorage.removeItem('pendingVerification');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        message.error(response.message || 'Invalid OTP');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!verificationData) {
    return null;
  }

  const stepItems = [
    { title: 'Email', icon: <MailOutlined /> },
    { title: 'Mobile', icon: <MobileOutlined /> },
    { title: 'Done', icon: <CheckCircleOutlined /> },
  ];

  const getCurrentStepIndex = () => {
    if (currentStep === 'email') return 0;
    if (currentStep === 'mobile') return 1;
    return 2;
  };

  return (
    <div className="login-card">
      <div className="text-center mb-6">
        <Title level={3} className="!mb-2">
          Verify Your Account
        </Title>
        <Text type="secondary">Enter the OTP sent to your email and mobile</Text>
      </div>

      <Steps
        current={getCurrentStepIndex()}
        size="small"
        className="mb-8"
        items={stepItems}
      />

      {currentStep === 'email' && (
        <Card className="text-center">
          <MailOutlined className="text-4xl text-primary mb-4" />
          <Title level={5} className="!mb-2">
            Verify Email
          </Title>
          <Text type="secondary" className="block mb-4">
            Enter the 6-digit OTP sent to<br />
            <strong>{verificationData.email}</strong>
          </Text>

          <div className="mb-6">
            <OtpInput
              length={6}
              value={emailOtp}
              onChange={setEmailOtp}
              disabled={loading}
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleEmailVerify}
            disabled={emailOtp.length !== 6}
          >
            Verify Email
          </Button>

          <Button type="link" className="mt-4">
            Resend OTP
          </Button>
        </Card>
      )}

      {currentStep === 'mobile' && (
        <Card className="text-center">
          <MobileOutlined className="text-4xl text-primary mb-4" />
          <Title level={5} className="!mb-2">
            Verify Mobile
          </Title>
          <Text type="secondary" className="block mb-4">
            Enter the 4-digit OTP sent to<br />
            <strong>+91 {verificationData.mobile}</strong>
          </Text>

          <div className="mb-6">
            <OtpInput
              length={4}
              value={mobileOtp}
              onChange={setMobileOtp}
              disabled={loading}
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleMobileVerify}
            disabled={mobileOtp.length !== 4}
          >
            Verify Mobile
          </Button>

          <Button type="link" className="mt-4">
            Resend OTP
          </Button>
        </Card>
      )}

      {currentStep === 'complete' && (
        <Card className="text-center">
          <CheckCircleOutlined className="text-6xl text-green-500 mb-4" />
          <Title level={4} className="!mb-2 !text-green-600">
            Verification Complete!
          </Title>
          <Text type="secondary">
            Your account has been verified. Redirecting to login...
          </Text>
        </Card>
      )}
    </div>
  );
}
