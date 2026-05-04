'use client';

import { useEffect, useState } from 'react';
import { Form, Input, Button, message, Row, Col, Select, Typography } from 'antd';
import {
  EnvironmentOutlined,
  IdcardOutlined,
  GlobalOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { completeRegistrationSchema, CompleteRegistrationFormData } from '@/lib/validations/auth';
import { completeRegistration } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Enterprise } from '@/types';

const { Title, Text } = Typography;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userType = useAuthStore((s) => s.userType);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteRegistrationFormData>({
    resolver: zodResolver(completeRegistrationSchema),
    defaultValues: {
      businessAddress: '',
      businessState: '',
      businessCity: '',
      pincode: '',
      gstNumber: '',
      cinNumber: '',
      contactPerson: '',
      website: '',
    },
  });

  // Gate the page: must be a logged-in enterprise in approved_pending_completion state.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user || userType !== 'enterprise') {
      router.replace('/login');
      return;
    }
    const status = (user as Enterprise).status;
    if (status === 'active') {
      router.replace('/dashboard');
    } else if (status === 'pending_review') {
      router.replace('/pending-review');
    } else if (status === 'rejected') {
      router.replace('/registration-rejected');
    }
  }, [_hasHydrated, user, userType, router]);

  const onSubmit = async (data: CompleteRegistrationFormData) => {
    setLoading(true);
    try {
      await completeRegistration({
        ...data,
        website: data.website || undefined,
      });
      message.success('Registration complete! Welcome to VAB Enterprise.');
      // Force a fresh login fetch on dashboard load
      setTimeout(() => router.replace('/dashboard'), 800);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg[0] : msg || 'Failed to submit registration.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-card"
      style={{ maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px 28px' }}
    >
      <div className="text-center mb-4 flex-shrink-0">
        <Title level={4} className="!mb-1 !text-gray-900 !text-[20px]">
          Complete Your Registration
        </Title>
        <Text type="secondary" className="!text-[12.5px]">
          Just a few more details to activate your account.
        </Text>
      </div>

      <div className="overflow-y-auto flex-1 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)} size="middle">
          <Form.Item
            label="Business Address"
            validateStatus={errors.businessAddress ? 'error' : ''}
            help={errors.businessAddress?.message}
            required
            className="!mb-3"
          >
            <Controller
              name="businessAddress"
              control={control}
              render={({ field }) => (
                <Input.TextArea {...field} placeholder="Enter full address" rows={2} />
              )}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                label="State"
                validateStatus={errors.businessState ? 'error' : ''}
                help={errors.businessState?.message}
                required
                className="!mb-3"
              >
                <Controller
                  name="businessState"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select"
                      showSearch
                      optionFilterProp="children"
                    >
                      {INDIAN_STATES.map((state) => (
                        <Select.Option key={state} value={state}>{state}</Select.Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="City"
                validateStatus={errors.businessCity ? 'error' : ''}
                help={errors.businessCity?.message}
                required
                className="!mb-3"
              >
                <Controller
                  name="businessCity"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      prefix={<EnvironmentOutlined className="text-gray-400" />}
                      placeholder="City"
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Pincode"
                validateStatus={errors.pincode ? 'error' : ''}
                help={errors.pincode?.message}
                required
                className="!mb-3"
              >
                <Controller
                  name="pincode"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="6-digit" maxLength={6} />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="GST Number"
                validateStatus={errors.gstNumber ? 'error' : ''}
                help={errors.gstNumber?.message}
                className="!mb-3"
              >
                <Controller
                  name="gstNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      prefix={<IdcardOutlined className="text-gray-400" />}
                      placeholder="Optional"
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="CIN Number"
                validateStatus={errors.cinNumber ? 'error' : ''}
                help={errors.cinNumber?.message}
                className="!mb-3"
              >
                <Controller
                  name="cinNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      prefix={<IdcardOutlined className="text-gray-400" />}
                      placeholder="Optional"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Contact Person"
                validateStatus={errors.contactPerson ? 'error' : ''}
                help={errors.contactPerson?.message}
                className="!mb-3"
              >
                <Controller
                  name="contactPerson"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      prefix={<UserOutlined className="text-gray-400" />}
                      placeholder="Optional"
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Website"
                validateStatus={errors.website ? 'error' : ''}
                help={errors.website?.message}
                className="!mb-3"
              >
                <Controller
                  name="website"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      prefix={<GlobalOutlined className="text-gray-400" />}
                      placeholder="https://… (optional)"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 mt-3">
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Activate My Account
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
