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
import { SearchOutlined, EyeOutlined, StopOutlined, CheckOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import {
  getAllEnterprises,
  updateEnterpriseStatus,
  createEnterprise,
  getSubscriptionPlans,
  getEnterprise,
  updateEnterpriseProfile,
} from '@/lib/api/super-admin';
import { MOBILE_RULE } from '@/lib/validations/shared';

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

  // Edit drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm] = Form.useForm();

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

  async function openEdit(id: number) {
    setEditingId(id);
    setEditDrawerOpen(true);
    try {
      const res = await getEnterprise(id);
      const e = res.data;
      editForm.setFieldsValue({
        businessName: e.businessName,
        email: e.email,
        mobile: e.mobile,
        contactPerson: e.contactPerson,
        address: e.address,
        city: e.city,
        state: e.state,
        pincode: e.pincode,
        gstNumber: e.gstNumber,
        cinNumber: e.cinNumber,
        website: e.website,
      });
    } catch {
      message.error('Failed to load enterprise details');
    }
  }

  async function handleUpdateEnterprise(values: Record<string, any>) {
    if (!editingId) return;
    setEditSubmitting(true);
    try {
      await updateEnterpriseProfile(editingId, values);
      message.success('Enterprise updated successfully');
      setEditDrawerOpen(false);
      setEditingId(null);
      editForm.resetFields();
      loadEnterprises();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Failed to update enterprise');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleCreateEnterprise(values: Record<string, any>) {
    setSubmitting(true);
    try {
      const res = await createEnterprise({
        businessName: values.businessName,
        email: values.email,
        mobile: values.mobile,
        password: values.password,
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
      const wasGenerated = res.data?.passwordWasGenerated;
      message.success(
        wasGenerated
          ? `Enterprise created. Auto-generated password: ${res.data.temporaryPassword}`
          : 'Enterprise created with the password you provided.',
        10,
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
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record.id)}
          >
            Edit
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
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <Title level={4} className="!mb-0">
          Enterprises
        </Title>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name or email"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className="w-full sm:w-72"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDrawerOpen(true)}
            className="w-full sm:w-auto"
          >
            Add Enterprise
          </Button>
        </div>
      </div>

      <Card bodyStyle={{ padding: 12 }}>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, responsive: true }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Drawer
        title="Add New Enterprise"
        width="min(720px, 100vw)"
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

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="businessName" label="Business Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="mobile" label="Mobile" rules={[{ required: true, message: 'Please enter mobile' }, MOBILE_RULE]}>
              <Input placeholder="10-digit mobile" maxLength={10} />
            </Form.Item>
            <Form.Item name="contactPerson" label="Contact Person">
              <Input />
            </Form.Item>
            <Form.Item
              name="password"
              label="Login Password"
              rules={[
                { required: true, message: 'Please choose a password for the enterprise' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
              extra="The enterprise will use this password to log in."
              className="col-span-2"
            >
              <Input.Password placeholder="Enter a password (min 8 characters)" autoComplete="new-password" />
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
            Subscription
          </Divider>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="planId" label="Subscription Plan" rules={[{ required: true }]} className="col-span-2">
              <Select placeholder="Select a plan">
                {plans.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price} / {p.durationDays} days
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Drawer>

      {/* Edit Enterprise Drawer */}
      <Drawer
        title="Edit Enterprise"
        width="min(720px, 100vw)"
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingId(null);
          editForm.resetFields();
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setEditDrawerOpen(false); setEditingId(null); editForm.resetFields(); }}>
              Cancel
            </Button>
            <Button type="primary" loading={editSubmitting} onClick={() => editForm.submit()}>
              Save Changes
            </Button>
          </div>
        }
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateEnterprise}>
          <Divider orientation="left" orientationMargin={0}>
            Business Information
          </Divider>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="businessName" label="Business Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="mobile" label="Mobile" rules={[{ required: true, message: 'Please enter mobile' }, MOBILE_RULE]}>
              <Input placeholder="10-digit mobile" maxLength={10} />
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
              <Input maxLength={6} />
            </Form.Item>
            <Form.Item name="gstNumber" label="GST Number">
              <Input maxLength={15} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
            <Form.Item name="cinNumber" label="CIN Number">
              <Input maxLength={21} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
            <Form.Item name="website" label="Website">
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
