'use client';

import { useState } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Switch,
  Typography, Space, Popconfirm, message, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CrownOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getResellerPlans,
  createResellerPlan,
  updateResellerPlan,
  deleteResellerPlan,
} from '@/lib/api/super-admin';

const { Title } = Typography;
const { TextArea } = Input;

interface ResellerPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  commissionPercentage: number;
  maxTenants: number | null;
  features: string | null;
  isActive: boolean;
  createdDate: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function ResellerPlansPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResellerPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['reseller-plans'], queryFn: getResellerPlans });
  const plans: ResellerPlan[] = data?.data ?? [];

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(plan: ResellerPlan) {
    setEditing(plan);
    form.setFieldsValue({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      durationDays: plan.durationDays,
      commissionPercentage: plan.commissionPercentage,
      maxTenants: plan.maxTenants,
      features: plan.features,
      isActive: plan.isActive,
    });
    setModalOpen(true);
  }

  async function handleSave(values: any) {
    setSaving(true);
    try {
      if (editing) {
        await updateResellerPlan(editing.id, values);
        message.success('Plan updated');
      } else {
        await createResellerPlan(values);
        message.success('Plan created');
      }
      queryClient.invalidateQueries({ queryKey: ['reseller-plans'] });
      setModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteResellerPlan(id);
      message.success('Plan deleted');
      queryClient.invalidateQueries({ queryKey: ['reseller-plans'] });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to delete plan');
    }
  }

  async function handleToggleActive(plan: ResellerPlan) {
    try {
      await updateResellerPlan(plan.id, { isActive: !plan.isActive });
      message.success(`Plan ${plan.isActive ? 'deactivated' : 'activated'}`);
      queryClient.invalidateQueries({ queryKey: ['reseller-plans'] });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to update');
    }
  }

  const columns = [
    {
      title: 'Plan Name',
      key: 'name',
      render: (_: any, r: ResellerPlan) => (
        <div>
          <div className="font-semibold">{r.name}</div>
          {r.description && <div className="text-xs text-slate-500 mt-0.5">{r.description}</div>}
        </div>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (v: number) => <span className="font-medium text-green-700">{formatCurrency(v)}</span>,
      sorter: (a: ResellerPlan, b: ResellerPlan) => a.price - b.price,
    },
    {
      title: 'Duration',
      dataIndex: 'durationDays',
      key: 'durationDays',
      render: (d: number) => <Tag color="blue">{d} days</Tag>,
    },
    {
      title: 'Commission %',
      dataIndex: 'commissionPercentage',
      key: 'commissionPercentage',
      render: (v: number) => (
        <span className="flex items-center gap-1 font-semibold text-indigo-600">
          <PercentageOutlined />
          {v}%
        </span>
      ),
      sorter: (a: ResellerPlan, b: ResellerPlan) => a.commissionPercentage - b.commissionPercentage,
    },
    {
      title: 'Max Tenants',
      dataIndex: 'maxTenants',
      key: 'maxTenants',
      render: (v: number | null) => v ? <Tag color="purple">{v}</Tag> : <span className="text-slate-400">Unlimited</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, plan: ResellerPlan) => (
        <Switch
          checked={active}
          size="small"
          onChange={() => handleToggleActive(plan)}
          checkedChildren="Active"
          unCheckedChildren="Off"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, plan: ResellerPlan) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(plan)} />
          </Tooltip>
          <Popconfirm
            title="Delete this plan?"
            description="This cannot be undone. Plans in use by resellers cannot be deleted."
            onConfirm={() => handleDelete(plan.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CrownOutlined className="text-2xl text-slate-600" />
          <Title level={3} className="!mb-0">Reseller Plans</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Plan
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={plans}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Reseller Plan' : 'Create Reseller Plan'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? 'Save Changes' : 'Create Plan'}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false} className="mt-4">
          <Form.Item name="name" label="Plan Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Silver Reseller, Gold Reseller" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Brief plan description" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="price" label="Price (₹)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} placeholder="0" />
            </Form.Item>
            <Form.Item name="durationDays" label="Duration (days)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} placeholder="30" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="commissionPercentage"
              label="Commission %"
              rules={[{ required: true }]}
              extra="% earned on tenant plan sales"
            >
              <InputNumber className="w-full" min={0} max={100} step={0.5} placeholder="0" addonAfter="%" />
            </Form.Item>
            <Form.Item name="maxTenants" label="Max Tenants" extra="Leave blank for unlimited">
              <InputNumber className="w-full" min={1} placeholder="Unlimited" />
            </Form.Item>
          </div>
          <Form.Item name="features" label="Features (JSON array or comma-separated)" extra='e.g. ["Priority support","Custom branding"]'>
            <TextArea rows={3} placeholder='["Feature 1", "Feature 2"]' />
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label="Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
