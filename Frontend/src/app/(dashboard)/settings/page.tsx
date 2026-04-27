'use client';

import { Typography, Card, Form, Input, Button, Row, Col, Spin, message, Descriptions, Tag } from 'antd';
import { SaveOutlined, EditOutlined, SettingOutlined, TagsOutlined, MailOutlined, AuditOutlined, ToolOutlined, DashboardOutlined, PrinterOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/api/settings';
import { useAuthStore } from '@/stores/authStore';
import { MOBILE_RULE, PINCODE_RULE, GSTIN_RULE } from '@/lib/validations/shared';
import { SubscriptionCard } from '@/components/settings/SubscriptionCard';

const { Title } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['business-profile', enterpriseId],
    queryFn: () => getBusinessProfile(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, string | undefined>) =>
      updateBusinessProfile(values),
    onSuccess: () => {
      message.success('Business profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['business-profile', enterpriseId] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      message.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to update business profile');
    },
  });

  const profile = data?.data;

  const handleEdit = () => {
    form.setFieldsValue(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setIsEditing(false);
  };

  const handleSubmit = (values: Record<string, string>) => {
    updateMutation.mutate(values);
  };

  const settingsCards = [
    {
      title: 'Print Template',
      description: 'Configure company logo, header layout and style for all printed documents',
      icon: <PrinterOutlined className="text-3xl text-red-500" />,
      path: '/settings/print-template',
    },
    {
      title: 'Lead Sources',
      description: 'Manage enquiry sources like Website, Referral, etc.',
      icon: <TagsOutlined className="text-3xl text-blue-500" />,
      path: '/settings/sources',
    },
    {
      title: 'Interest Status',
      description: 'Configure pipeline stages for enquiries',
      icon: <SettingOutlined className="text-3xl text-green-500" />,
      path: '/settings/status',
    },
    {
      title: 'Email Templates',
      description: 'Manage email templates for notifications',
      icon: <MailOutlined className="text-3xl text-purple-500" />,
      path: '/settings/templates',
    },
    {
      title: 'Stage Master',
      description: 'Define manufacturing stages like Assembly, Testing, Packing',
      icon: <ToolOutlined className="text-3xl text-cyan-500" />,
      path: '/settings/stage-master',
    },
    {
      title: 'Unit Master',
      description: 'Define units of measure like Pcs, Kg, Meters, Sets',
      icon: <DashboardOutlined className="text-3xl text-teal-500" />,
      path: '/settings/unit-master',
    },
    {
      title: 'Audit Logs',
      description: 'View all system activity and changes',
      icon: <AuditOutlined className="text-3xl text-orange-500" />,
      path: '/settings/audit-logs',
    },
  ];

  return (
    <div>
      <Title level={4} className="mb-6">
        Settings
      </Title>

      <SubscriptionCard />

      <Card
        title="Business Profile"
        className="card-shadow mb-6"
        extra={
          !isLoading && !isEditing && (
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              Edit
            </Button>
          )
        }
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-8"><Spin /></div>
        ) : isEditing ? (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="business_name"
                  label="Business Name"
                  rules={[{ required: true, message: 'Please enter business name' }]}
                >
                  <Input placeholder="Enter business name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter valid email' },
                  ]}
                >
                  <Input placeholder="Enter email" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="mobile"
                  label="Mobile"
                  rules={[
                    { required: true, message: 'Please enter mobile' },
                    MOBILE_RULE,
                  ]}
                >
                  <Input placeholder="10-digit mobile" maxLength={10} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="website" label="Website">
                  <Input placeholder="Enter website URL" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item name="address" label="Address">
                  <Input.TextArea rows={2} placeholder="Enter address" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="city" label="City">
                  <Input placeholder="Enter city" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="state" label="State">
                  <Input placeholder="Enter state" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="pincode" label="Pincode" rules={[PINCODE_RULE]}>
                  <Input placeholder="6-digit PIN" maxLength={6} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="gst_number" label="GST Number" rules={[GSTIN_RULE]}>
                  <Input
                    placeholder="e.g. 27AAPFU0939F1ZV"
                    maxLength={15}
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="cin_number" label="CIN Number">
                  <Input
                    placeholder="Enter CIN number"
                    maxLength={21}
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div className="flex justify-end gap-2">
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </Form>
        ) : (
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Business Name">
              <span className="font-medium">{profile?.business_name || '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={profile?.status === 'active' ? 'success' : 'error'}>
                {profile?.status?.toUpperCase() || '-'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Email">{profile?.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Mobile">{profile?.mobile || '-'}</Descriptions.Item>
            <Descriptions.Item label="Website">{profile?.website || '-'}</Descriptions.Item>
            <Descriptions.Item label="Expiry Date">{profile?.expiry_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              {[profile?.address, profile?.city, profile?.state, profile?.pincode]
                .filter(Boolean)
                .join(', ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="GST Number">{profile?.gst_number || '-'}</Descriptions.Item>
            <Descriptions.Item label="CIN Number">{profile?.cin_number || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>


      <Title level={5} className="mb-4">
        Configuration
      </Title>
      <Row gutter={[16, 16]}>
        {settingsCards.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.path}>
            <Card
              className="card-shadow cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(card.path)}
            >
              <div className="flex items-start gap-4">
                <div>{card.icon}</div>
                <div>
                  <div className="font-medium text-lg">{card.title}</div>
                  <div className="text-gray-500 text-sm mt-1">{card.description}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
