'use client';

import { Typography, Button } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;

export default function RegistrationRejectedPage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="login-card text-center" style={{ maxWidth: '420px' }}>
      <div
        className="mx-auto mb-5 flex items-center justify-center rounded-full"
        style={{ width: 64, height: 64, background: 'rgba(220, 38, 38, 0.08)' }}
      >
        <CloseCircleOutlined style={{ fontSize: 32, color: '#dc2626' }} />
      </div>

      <Title level={3} className="!mb-2 !text-gray-900">
        Registration Not Approved
      </Title>
      <Text type="secondary" className="block mb-6 text-[13.5px]">
        Unfortunately we were unable to approve your account at this time. If you believe this
        was a mistake, please reach out to our support team.
      </Text>

      <Button block size="large" onClick={handleLogout}>
        Back to login
      </Button>
    </div>
  );
}
