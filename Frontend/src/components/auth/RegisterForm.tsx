'use client';

import { useState } from 'react';
import { Form, Input, Button, Select, message } from 'antd';
import {
  ShopOutlined,
  MailOutlined,
  PhoneOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quickSignupSchema, QuickSignupFormData } from '@/lib/validations/auth';
import { quickSignup } from '@/lib/api';

// Sentinel value used only inside the dropdown to mean "let me type my own"
const OTHER_SENTINEL = '__other__';

const INDUSTRIES = [
  'Automotive',
  'Pharmaceuticals',
  'Textiles & Apparel',
  'Food & Beverage',
  'Chemicals',
  'Electronics',
  'Engineering & Industrial Machinery',
  'Steel & Metals',
  'Plastics & Rubber',
  'Cement & Construction Materials',
  'Paper & Packaging',
  'Renewable Energy',
  'Aerospace',
  'Defense',
  'FMCG',
  'Heavy Machinery',
  'Electrical Equipment',
  'Furniture',
  'Leather Goods',
  'Agriculture & Agri-tech',
];

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isOther, setIsOther] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<QuickSignupFormData>({
    resolver: zodResolver(quickSignupSchema),
    defaultValues: {
      businessName: '',
      businessEmail: '',
      businessMobile: '',
      industry: '',
    },
  });

  const onSubmit = async (data: QuickSignupFormData) => {
    setLoading(true);
    try {
      await quickSignup(data);

      // Stash for the OTP verify screen
      sessionStorage.setItem('pendingVerification', JSON.stringify({
        email: data.businessEmail,
        mobile: data.businessMobile,
      }));

      message.success('Registered! Check your email for the OTP.');
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
              inputMode="numeric"
              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                // Allow control keys, but block any non-digit character
                const allow = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                if (allow.includes(e.key) || e.ctrlKey || e.metaKey) return;
                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
              }}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Industry"
        validateStatus={errors.industry ? 'error' : ''}
        help={errors.industry?.message}
        required
        className="!mb-3"
      >
        <Controller
          name="industry"
          control={control}
          render={({ field }) => {
            // Compute what the Select shows: when Other is active the dropdown
            // shows the "Other" entry; otherwise it shows whatever string the
            // form holds (which matches a known industry).
            const selectValue = isOther
              ? OTHER_SENTINEL
              : (field.value || undefined);

            return (
              <>
                <Select
                  value={selectValue}
                  onChange={(v) => {
                    if (v === OTHER_SENTINEL) {
                      setIsOther(true);
                      // clear the form value so Zod's min(2) enforces the user
                      // actually types something in the Other input below
                      field.onChange('');
                    } else {
                      setIsOther(false);
                      field.onChange(v);
                    }
                  }}
                  onBlur={field.onBlur}
                  placeholder="Select your manufacturing domain"
                  showSearch
                  optionFilterProp="children"
                  suffixIcon={<AppstoreOutlined className="text-gray-400" />}
                  options={[
                    ...INDUSTRIES.map((i) => ({ label: i, value: i })),
                    { label: 'Other (specify below)', value: OTHER_SENTINEL },
                  ]}
                />
                {isOther && (
                  <Input
                    className="!mt-2"
                    placeholder="Specify your industry"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    maxLength={80}
                  />
                )}
              </>
            );
          }}
        />
      </Form.Item>

      <Form.Item className="mb-0 mt-3">
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Register Business
        </Button>
      </Form.Item>

      <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
        After you verify your email, our partners will reach out to you. Login credentials will be sent on approval.
      </p>
    </Form>
  );
}
