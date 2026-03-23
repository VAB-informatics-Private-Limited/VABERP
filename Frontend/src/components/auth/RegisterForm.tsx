'use client';

import { useState } from 'react';
import { Form, Input, Button, message, Row, Col, Select } from 'antd';
import {
  ShopOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, RegistrationFormData } from '@/lib/validations/auth';
import { registerEnterprise } from '@/lib/api';

// Indian states for dropdown
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      businessName: '',
      businessEmail: '',
      businessMobile: '',
      businessAddress: '',
      businessState: '',
      businessCity: '',
      pincode: '',
      gstNumber: '',
      cinNumber: '',
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setLoading(true);
    try {
      const response = await registerEnterprise(data);

      // Store email for OTP verification
      sessionStorage.setItem('pendingVerification', JSON.stringify({
        email: data.businessEmail,
        mobile: data.businessMobile,
      }));

      const tempPassword = (response.data as Record<string, string>)?.tempPassword;
      if (tempPassword) {
        message.success(`Registration successful! Your temporary password is: ${tempPassword}`, 10);
      } else {
        message.success('Registration successful! Please verify your email and mobile.');
      }

      router.push('/verify-otp');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg[0] : msg || 'Registration failed. Please try again.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} size="middle">
      <Form.Item
        label="Business Name"
        validateStatus={errors.businessName ? 'error' : ''}
        help={errors.businessName?.message}
        required
        className="!mb-3"
      >
        <Controller
          name="businessName"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              prefix={<ShopOutlined className="text-gray-400" />}
              placeholder="Enter business name"
            />
          )}
        />
      </Form.Item>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            label="Business Email"
            validateStatus={errors.businessEmail ? 'error' : ''}
            help={errors.businessEmail?.message}
            required
            className="!mb-3"
          >
            <Controller
              name="businessEmail"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="email@company.com"
                />
              )}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Mobile Number"
            validateStatus={errors.businessMobile ? 'error' : ''}
            help={errors.businessMobile?.message}
            required
            className="!mb-3"
          >
            <Controller
              name="businessMobile"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<PhoneOutlined className="text-gray-400" />}
                  placeholder="10-digit mobile"
                  maxLength={10}
                />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

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
            <Input.TextArea
              {...field}
              placeholder="Enter full address"
              rows={2}
            />
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
                  placeholder="Select state"
                  showSearch
                  optionFilterProp="children"
                >
                  {INDIAN_STATES.map((state) => (
                    <Select.Option key={state} value={state}>
                      {state}
                    </Select.Option>
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
                <Input
                  {...field}
                  placeholder="6-digit"
                  maxLength={6}
                />
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

      <Form.Item className="mb-0 mt-4">
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Register Business
        </Button>
      </Form.Item>
    </Form>
  );
}
