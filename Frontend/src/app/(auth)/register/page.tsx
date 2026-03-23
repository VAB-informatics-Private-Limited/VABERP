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
      style={{ maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '32px 40px' }}
    >
      {/* Close button */}
      <Link
        href="/"
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <CloseOutlined style={{ fontSize: 14 }} />
      </Link>

      {/* Header */}
      <div className="text-center mb-5 flex-shrink-0">
        <div className="flex flex-col items-center mb-3">
          <img src="/logo-icon.png" alt="VAB Informatics" className="w-10 h-10 object-contain mb-1.5" />
          <div className="text-center leading-tight">
            <div className="font-bold text-gray-900 text-base tracking-tight">VAB Informatics</div>
            <div className="text-gray-400 text-[9px] tracking-widest uppercase">Private Limited</div>
          </div>
        </div>
        <Title level={4} className="!mb-1 !text-gray-900">
          Register Your Business
        </Title>
        <Text type="secondary" className="text-sm">
          Create an account to get started with VAB Enterprise
        </Text>
      </div>

      {/* Scrollable form area */}
      <div className="overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
        <RegisterForm />
      </div>

      {/* Footer */}
      <div className="mt-4 text-center flex-shrink-0 pt-3 border-t border-gray-100">
        <Text type="secondary" className="text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </Text>
      </div>
    </div>
  );
}
