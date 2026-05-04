'use client';

import { Typography, Button } from 'antd';
import { CheckCircleFilled, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function PendingReviewPage() {
  return (
    <div className="login-card text-center" style={{ maxWidth: '440px' }}>
      <div
        className="mx-auto mb-5 flex items-center justify-center rounded-full"
        style={{ width: 64, height: 64, background: 'rgba(22, 163, 74, 0.10)' }}
      >
        <CheckCircleFilled style={{ fontSize: 34, color: '#16a34a' }} />
      </div>

      <Title level={3} className="!mb-2 !text-gray-900">
        Thank You for Registering
      </Title>
      <Text type="secondary" className="block mb-6 text-[13.5px]">
        Your email has been verified. <strong>Our partners will contact you shortly</strong> to walk
        you through the platform and set up your account.
      </Text>

      <div
        className="text-left rounded-xl p-4 mb-5"
        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
      >
        <p className="text-[12.5px] font-semibold text-gray-900 mb-2">What happens next?</p>
        <ul className="text-[12px] text-gray-500 leading-relaxed space-y-2 list-none p-0 m-0">
          <li className="flex gap-2">
            <PhoneOutlined style={{ color: '#1E3A5F', marginTop: 3 }} />
            <span>One of our partners will call you on the mobile number you registered with.</span>
          </li>
          <li className="flex gap-2">
            <MailOutlined style={{ color: '#1E3A5F', marginTop: 3 }} />
            <span>Once approved, your login credentials will be emailed to you.</span>
          </li>
          <li className="flex gap-2">
            <CheckCircleFilled style={{ color: '#16a34a', marginTop: 3 }} />
            <span>Log in and complete your business details to activate your account.</span>
          </li>
        </ul>
      </div>

      <Link href="/" style={{ textDecoration: 'none' }}>
        <Button block size="large">Back to home</Button>
      </Link>

      <p className="mt-4 text-[11.5px] text-gray-400">
        Questions? <Link href="/" style={{ color: '#1E3A5F', fontWeight: 600 }}>Contact support</Link>
      </p>
    </div>
  );
}
