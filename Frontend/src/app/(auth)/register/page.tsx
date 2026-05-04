'use client';

import Link from 'next/link';
import { Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { RegisterForm } from '@/components/auth/RegisterForm';

const { Title, Text } = Typography;

export default function RegisterPage() {
  return (
    <div
      className="login-card relative"
      style={{ maxWidth: '420px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: '22px 24px 18px' }}
    >
      {/* Close button */}
      <Link
        href="/"
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <CloseOutlined style={{ fontSize: 12 }} />
      </Link>

      {/* Header */}
      <div className="text-center mb-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 mb-2.5">
          <img src="/logo-icon.png" alt="VAB Informatics" className="w-7 h-7 object-contain" />
          <div className="leading-tight text-left">
            <div className="font-semibold text-gray-900 text-[13px] tracking-tight">VAB Informatics</div>
            <div className="text-gray-400 text-[8px] tracking-widest uppercase">Private Limited</div>
          </div>
        </div>
        <Title level={5} className="!mb-0.5 !text-gray-900 !text-[17px] !font-semibold">
          Register Your Business
        </Title>
        <Text type="secondary" className="!text-[12px]">
          Create an account to get started
        </Text>
      </div>

      {/* Scrollable form area */}
      <div className="overflow-y-auto flex-1 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        <RegisterForm />
      </div>

      {/* Footer */}
      <div className="mt-3 text-center flex-shrink-0 pt-2.5 border-t border-gray-100">
        <Text type="secondary" className="!text-[12px]">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </Text>
      </div>
    </div>
  );
}
