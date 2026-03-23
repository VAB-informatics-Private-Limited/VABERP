'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Input,
  Button,
  Space,
  Popconfirm,
  message,
  Typography,
  Drawer,
  Form,
  Select,
  InputNumber,
  Divider,
} from 'antd';
import { SearchOutlined, EyeOutlined, StopOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import {
  getAllEnterprises,
  updateEnterpriseStatus,
  createEnterprise,
  getSubscriptionPlans,
} from '@/lib/api/super-admin';

const { Title } = Typography;

interface Enterprise {
  id: number;
  businessName: string;
  email: string;
  mobile: string;
  status: string;
  expiryDate: string | null;
  createdDate: string;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  durationDays: number;
}

const statusColors: Record<string, string> = {
  active: 'green',
  blocked: 'red',
  pending: 'orange',
  inactive: 'default',
};

function getSubscriptionBadge(enterprise: Enterprise) {
  if (enterprise.status === 'pending') {
    return <Tag color="orange">Pending Approval</Tag>;
  }
  if (!enterprise.expiryDate) {
    return <Tag color="default">No Plan</Tag>;
  }
  const now = new Date();
  const expiry = new Date(enterprise.expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) {
    return <Tag color="red">Expired</Tag>;
  }
  if (daysLeft <= 7) {
    return <Tag color="gold">Expiring Soon</Tag>;
  }
  return <Tag color="green">Active ({daysLeft}d)</Tag>;
}

export default function EnterprisesPage() {
  const router = useRouter();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [filtered, setFiltered] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadEnterprises();
    getSubscriptionPlans()
      .then((res) => setPlans(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      enterprises.filter(
        (e) =>
          e.businessName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      )
    );
  }, [search, enterprises]);

  async function loadEnterprises() {
    setLoading(true);
    try {
      const res = await getAllEnterprises();
      setEnterprises(res.data);
      setFiltered(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(record: Enterprise) {
    const newStatus = record.status === 'blocked' ? 'active' : 'blocked';
    try {
      await updateEnterpriseStatus(record.id, newStatus);
      message.success(`Enterprise ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
      setEnterprises((prev) =>
        prev.map((e) => (e.id === record.id ? { ...e, status: newStatus } : e))
      );
    } catch {
      message.error('Failed to update status');
    }
  }

  async function handleCreateEnterprise(values: Record<string, any>) {
    setSubmitting(true);
    try {
      const res = await createEnterprise({
        businessName: values.businessName,
        email: values.email,
        mobile: values.mobile,
        contactPerson: values.contactPerson,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        gstNumber: values.gstNumber,
        cinNumber: values.cinNumber,
        website: values.website,
        planId: values.planId,
        paymentAmount: values.paymentAmount,
        paymentMethod: values.paymentMethod,
        paymentReference: values.paymentReference,
        paymentNotes: values.paymentNotes,
      });
      message.success(
        `Enterprise created. Temporary password: ${res.data.temporaryPassword}`,
        10
      );
      setDrawerOpen(false);
      form.resetFields();
      loadEnterprises();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Failed to create enterprise');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      title: 'Business Name',
      dataIndex: 'businessName',
      key: 'businessName',
      sorter: (a: Enterprise, b: Enterprise) => a.businessName.localeCompare(b.businessName),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Mobile', dataIndex: 'mobile', key: 'mobile' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] ?? 'default'}>{status}</Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Blocked', value: 'blocked' },
        { text: 'Pending', value: 'pending' },
      ],
      onFilter: (value: any, record: Enterprise) => record.status === value,
    },
    {
      title: 'Subscription',
      key: 'subscription',
      render: (_: any, record: Enterprise) => getSubscriptionBadge(record),
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Joined',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Enterprise) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/superadmin/enterprises/${record.id}`)}
          >
            View
          </Button>
          <Popconfirm
            title={`${record.status === 'blocked' ? 'Unblock' : 'Block'} this enterprise?`}
            onConfirm={() => handleToggleStatus(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: record.status !== 'blocked' }}
          >
            <Button
              size="small"
              icon={record.status === 'blocked' ? <CheckOutlined /> : <StopOutlined />}
              danger={record.status !== 'blocked'}
              type={record.status === 'blocked' ? 'default' : 'default'}
            >
              {record.status === 'blocked' ? 'Unblock' : 'Block'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Title level={4} className="!mb-0">
          Enterprises
        </Title>
        <Space>
          <Input
            placeholder="Search by name or email"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDrawerOpen(true)}
          >
            Add Enterprise
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      <Drawer
        title="Add New Enterprise"
        width={720}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          form.resetFields();
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setDrawerOpen(false); form.resetFields(); }}>
              Cancel
            </Button>
            <Button type="primary" loading={submitting} onClick={() => form.submit()}>
              Create Enterprise
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateEnterprise}>
          <Divider orientation="left" orientationMargin={0}>
            Business Information
          </Divider>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="businessName" label="Business Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="mobile" label="Mobile" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="contactPerson" label="Contact Person">
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Address" className="col-span-2">
              <Input />
            </Form.Item>
            <Form.Item name="city" label="City">
              <Input />
            </Form.Item>
            <Form.Item name="state" label="State">
              <Input />
            </Form.Item>
            <Form.Item name="pincode" label="Pincode">
              <Input />
            </Form.Item>
            <Form.Item name="gstNumber" label="GST Number">
              <Input />
            </Form.Item>
            <Form.Item name="cinNumber" label="CIN Number">
              <Input />
            </Form.Item>
            <Form.Item name="website" label="Website">
              <Input />
            </Form.Item>
          </div>

          <Divider orientation="left" orientationMargin={0}>
            Subscription &amp; Payment
          </Divider>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="planId" label="Subscription Plan" rules={[{ required: true }]}>
              <Select placeholder="Select a plan">
                {plans.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price} / {p.durationDays} days
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="paymentAmount" label="Payment Amount (₹)" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
              <Select placeholder="Select method">
                <Select.Option value="UPI">UPI</Select.Option>
                <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                <Select.Option value="Cheque">Cheque</Select.Option>
                <Select.Option value="Card">Card</Select.Option>
                <Select.Option value="Cash">Cash</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="paymentReference" label="Reference Number">
              <Input />
            </Form.Item>
            <Form.Item name="paymentNotes" label="Notes" className="col-span-2">
              <Input.TextArea rows={2} />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
