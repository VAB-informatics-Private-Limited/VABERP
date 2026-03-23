'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
  Row,
  Col,
  Space,
  Popconfirm,
  message,
  Tabs,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import {
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getEnterpriseSubscriptions,
  assignSubscriptionPlan,
} from '@/lib/api/super-admin';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  maxEmployees: number;
  features: string | null;
  isActive: boolean;
  createdDate: string;
}

interface EnterpriseSubscription {
  id: number;
  businessName: string;
  email: string;
  expiryDate: string | null;
  daysRemaining: number | null;
  subscriptionStatus: string;
  accountStatus: string;
}

const planColors: Record<string, { card: string; badge: string }> = {
  Basic: { card: 'border-slate-300 bg-slate-50', badge: 'text-slate-600 bg-slate-100' },
  Pro: { card: 'border-blue-300 bg-blue-50', badge: 'text-blue-600 bg-blue-100' },
  Enterprise: { card: 'border-purple-300 bg-purple-50', badge: 'text-purple-600 bg-purple-100' },
};

function getDaysRemainingColor(days: number | null): string {
  if (days === null) return 'text-slate-400';
  if (days < 0) return 'text-red-600';
  if (days <= 7) return 'text-red-500';
  if (days <= 30) return 'text-orange-500';
  return 'text-green-600';
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [enterprises, setEnterprises] = useState<EnterpriseSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseSubscription | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [planForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('plans');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, entRes] = await Promise.all([
        getSubscriptionPlans(),
        getEnterpriseSubscriptions(),
      ]);
      setPlans(plansRes.data);
      setEnterprises(entRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreatePlan() {
    setEditingPlan(null);
    planForm.resetFields();
    setPlanModalOpen(true);
  }

  function openEditPlan(plan: Plan) {
    setEditingPlan(plan);
    const featuresArr = (() => {
      try {
        return plan.features ? JSON.parse(plan.features) : [];
      } catch {
        return [];
      }
    })();
    planForm.setFieldsValue({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      durationDays: plan.durationDays,
      maxEmployees: plan.maxEmployees,
      featuresText: featuresArr.join('\n'),
    });
    setPlanModalOpen(true);
  }

  async function handlePlanSubmit(values: {
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    maxEmployees: number;
    featuresText?: string;
  }) {
    setSubmitting(true);
    try {
      const featuresArr = values.featuresText
        ? values.featuresText.split('\n').map((f) => f.trim()).filter(Boolean)
        : [];
      const featuresJson = JSON.stringify(featuresArr);

      const body = {
        name: values.name,
        description: values.description,
        price: values.price,
        durationDays: values.durationDays,
        maxEmployees: values.maxEmployees,
        features: featuresJson,
      };

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, body);
        message.success('Plan updated');
      } else {
        await createSubscriptionPlan(body);
        message.success('Plan created');
      }
      setPlanModalOpen(false);
      loadData();
    } catch {
      message.error('Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePlan(id: number) {
    try {
      await deleteSubscriptionPlan(id);
      message.success('Plan deactivated');
      loadData();
    } catch {
      message.error('Failed to deactivate plan');
    }
  }

  function openAssignModal(enterprise: EnterpriseSubscription) {
    setSelectedEnterprise(enterprise);
    assignForm.resetFields();
    setAssignModalOpen(true);
  }

  async function handleAssign(values: { planId: number }) {
    if (!selectedEnterprise) return;
    setSubmitting(true);
    try {
      await assignSubscriptionPlan(selectedEnterprise.id, values.planId);
      message.success('Plan assigned successfully');
      setAssignModalOpen(false);
      loadData();
    } catch {
      message.error('Failed to assign plan');
    } finally {
      setSubmitting(false);
    }
  }

  const enterpriseColumns = [
    {
      title: 'Enterprise',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Days Remaining',
      dataIndex: 'daysRemaining',
      key: 'daysRemaining',
      render: (days: number | null) => (
        <span className={`font-semibold ${getDaysRemainingColor(days)}`}>
          {days === null ? '—' : days < 0 ? 'Expired' : `${days} days`}
        </span>
      ),
      sorter: (a: EnterpriseSubscription, b: EnterpriseSubscription) =>
        (a.daysRemaining ?? -9999) - (b.daysRemaining ?? -9999),
    },
    {
      title: 'Subscription Status',
      dataIndex: 'subscriptionStatus',
      key: 'subscriptionStatus',
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          expired: 'red',
          expiring_soon: 'orange',
          no_plan: 'default',
        };
        const labelMap: Record<string, string> = {
          active: 'Active',
          expired: 'Expired',
          expiring_soon: 'Expiring Soon',
          no_plan: 'No Plan',
        };
        return <Tag color={colorMap[s] ?? 'default'}>{labelMap[s] ?? s}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: EnterpriseSubscription) => (
        <Button
          size="small"
          type="primary"
          ghost
          onClick={() => openAssignModal(record)}
        >
          Assign Plan
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'plans',
      label: (
        <span>
          <CrownOutlined className="mr-1" />
          Plans
        </span>
      ),
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreatePlan}>
              Add Plan
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading plans...</div>
          ) : (
            <Row gutter={[16, 16]}>
              {plans.map((plan) => {
                const features = (() => {
                  try {
                    return plan.features ? (JSON.parse(plan.features) as string[]) : [];
                  } catch {
                    return [] as string[];
                  }
                })();
                const colors = planColors[plan.name] ?? {
                  card: 'border-slate-300 bg-white',
                  badge: 'text-slate-600 bg-slate-100',
                };

                return (
                  <Col key={plan.id} xs={24} sm={12} lg={8}>
                    <div className={`rounded-xl border-2 p-5 ${colors.card} h-full flex flex-col`}>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${colors.badge}`}
                        >
                          {plan.name}
                        </span>
                        <Space size="small">
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditPlan(plan)}
                          />
                          <Popconfirm
                            title="Deactivate this plan?"
                            onConfirm={() => handleDeletePlan(plan.id)}
                            okText="Yes"
                            cancelText="No"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" icon={<DeleteOutlined />} danger />
                          </Popconfirm>
                        </Space>
                      </div>

                      <div className="mb-2">
                        <span className="text-2xl font-bold text-slate-800">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-slate-500 text-sm"> / {plan.durationDays} days</span>
                      </div>

                      {plan.description && (
                        <p className="text-slate-500 text-sm mb-3">{plan.description}</p>
                      )}

                      <div className="text-sm text-slate-600 mb-3">
                        <span className="font-medium">Max Employees: </span>
                        {plan.maxEmployees === 0 ? 'Unlimited' : plan.maxEmployees}
                      </div>

                      {features.length > 0 && (
                        <ul className="mt-auto space-y-1">
                          {features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-green-500 mt-0.5">✓</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Col>
                );
              })}

              {plans.length === 0 && (
                <Col span={24}>
                  <div className="text-center py-12 text-slate-400">
                    No active plans. Create one to get started.
                  </div>
                </Col>
              )}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'enterprises',
      label: (
        <span>
          Enterprise Subscriptions
          <Badge
            count={enterprises.filter((e) => e.subscriptionStatus === 'expiring_soon').length}
            className="ml-2"
            color="orange"
          />
        </span>
      ),
      children: (
        <Table
          columns={enterpriseColumns}
          dataSource={enterprises}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-0">
          Subscriptions
        </Title>
        <p className="text-slate-500 text-sm mt-1">Manage subscription plans and enterprise subscriptions</p>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* Plan Create/Edit Modal */}
      <Modal
        title={editingPlan ? 'Edit Plan' : 'Create New Plan'}
        open={planModalOpen}
        onCancel={() => setPlanModalOpen(false)}
        footer={null}
        width={520}
      >
        <Form form={planForm} layout="vertical" onFinish={handlePlanSubmit} className="mt-4">
          <Form.Item name="name" label="Plan Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Basic, Pro, Enterprise" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Short description" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="price" label="Price / Month (₹)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="durationDays" label="Duration (days)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="maxEmployees"
            label="Max Employees (0 = unlimited)"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="featuresText"
            label="Features (one per line)"
          >
            <TextArea rows={5} placeholder={'Feature 1\nFeature 2\nFeature 3'} />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setPlanModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal
        title={`Assign Plan to ${selectedEnterprise?.businessName ?? ''}`}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        footer={null}
        width={420}
      >
        {selectedEnterprise && (
          <div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
              <div>
                <Text strong>Enterprise: </Text>
                <Text>{selectedEnterprise.businessName}</Text>
              </div>
              <div>
                <Text strong>Current Expiry: </Text>
                <Text>
                  {selectedEnterprise.expiryDate
                    ? new Date(selectedEnterprise.expiryDate).toLocaleDateString()
                    : 'No plan assigned'}
                </Text>
              </div>
            </div>

            <Form form={assignForm} layout="vertical" onFinish={handleAssign}>
              <Form.Item name="planId" label="Select Plan" rules={[{ required: true, message: 'Please select a plan' }]}>
                <Select placeholder="Choose a plan">
                  {plans.map((p) => (
                    <Option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} / {p.durationDays} days
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <p className="text-slate-500 text-sm mb-4">
                Assigning a plan will set the expiry date to today + plan duration.
              </p>

              <div className="flex justify-end gap-2">
                <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Confirm &amp; Assign
                </Button>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
