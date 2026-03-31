'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useResellerStore } from '@/stores/resellerStore';
import { updateMyProfile, changeMyPassword } from '@/lib/api/reseller-client';

const { Title } = Typography;

export default function ResellerProfilePage() {
  const { reseller, updateReseller } = useResellerStore();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleProfileSave = async (values: { name: string; mobile: string; companyName?: string }) => {
    setProfileLoading(true);
    try {
      await updateMyProfile({ name: values.name, mobile: values.mobile, companyName: values.companyName });
      updateReseller({ name: values.name });
      message.success('Profile updated successfully');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await changeMyPassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <UserOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Profile Settings</Title>
      </div>

      <Card title="Profile Information" className="mb-6">
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={{
            name: reseller?.name ?? '',
            mobile: '',
            companyName: reseller?.companyName ?? '',
          }}
          onFinish={handleProfileSave}
          requiredMark={false}
        >
          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input prefix={<UserOutlined />} placeholder="Your full name" />
          </Form.Item>
          <Form.Item label="Mobile" name="mobile">
            <Input placeholder="Mobile number" />
          </Form.Item>
          <Form.Item label="Company Name" name="companyName">
            <Input placeholder="Your company name (optional)" />
          </Form.Item>
          <Form.Item label="Email">
            <Input value={reseller?.email ?? ''} disabled />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={profileLoading}>
            Save Changes
          </Button>
        </Form>
      </Card>

      <Card title="Change Password">
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
          requiredMark={false}
        >
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: 'Current password is required' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Current password" />
          </Form.Item>
          <Divider />
          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[{ required: true, message: 'New password is required' }, { min: 6, message: 'Minimum 6 characters' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="New password" />
          </Form.Item>
          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            rules={[{ required: true, message: 'Please confirm new password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={passwordLoading}>
            Change Password
          </Button>
        </Form>
      </Card>
    </div>
  );
}
