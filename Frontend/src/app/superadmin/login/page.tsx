'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useSuperAdminStore } from '@/stores/superAdminStore';
import { superAdminLogin } from '@/lib/api/super-admin';

const { Title, Text } = Typography;

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useSuperAdminStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/superadmin/dashboard');
    }
  }, [isAuthenticated, router]);

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    try {
      const res = await superAdminLogin(values.email, values.password);
      login(res.data.user, res.data.token);
      router.replace('/superadmin/dashboard');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center mb-4">
            <img
              src="/logo-icon.png"
              alt="VAB Informatics"
              className="w-12 h-12 object-contain mb-2"
            />
            <div className="font-bold text-gray-900 text-lg">VAB Informatics</div>
          </div>
          <Title level={3} className="!mb-1">
            Super Admin
          </Title>
          <Text type="secondary" className="text-sm">
            Platform administration panel
          </Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Email is required' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              className="bg-slate-700 hover:bg-slate-600 border-slate-700"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
