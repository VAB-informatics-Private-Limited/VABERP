'use client';

import { useState } from 'react';
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
  Statistic,
  Tabs,
  message,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  WalletOutlined,
  PlusOutlined,
  CrownOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LockOutlined,
  UnlockOutlined,
  TeamOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  getResellerDetail,
  getResellerPlanPricing,
  getResellerReport,
  setResellerPlanPricing,
  getResellerPlans,
  getSubscriptionPlans,
  getResellerWallet,
  creditResellerWallet,
  assignPlanToReseller,
  lockReseller,
  unlockReseller,
  getResellerTenants,
  getResellerEarnings,
} from '@/lib/api/super-admin';

const { Title, Text } = Typography;
const { Option } = Select;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

interface PricingRow {
  id: number;
  planId: number;
  planName: string;
  businessPrice: number;
  resellerPrice: number;
}

interface ResellerPlan {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  commissionPercentage: number;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number | string;
  durationDays: number;
}

interface WalletTx {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  createdDate: string;
}

interface Tenant {
  id: number;
  businessName: string;
  email: string;
  mobile: string;
  status: string;
  expiryDate: string | null;
  planId: number | null;
  planName: string | null;
  subscriptionStartDate: string | null;
  createdDate: string;
}

interface EarningRow {
  id: number;
  billedAmount: number;
  resellerPrice: number;
  commission: number;
  createdDate: string;
  businessName: string;
  planName: string;
}

export default function ResellerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const resellerId = parseInt(id, 10);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [assignPlanModalOpen, setAssignPlanModalOpen] = useState(false);
  const [lockingProfile, setLockingProfile] = useState(false);
  const [form] = Form.useForm();
  const [walletForm] = Form.useForm();
  const [assignPlanForm] = Form.useForm();

  const { data: resellerData, isLoading: resellerLoading } = useQuery({
    queryKey: ['reseller', resellerId],
    queryFn: () => getResellerDetail(resellerId),
  });

  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['reseller-pricing', resellerId],
    queryFn: () => getResellerPlanPricing(resellerId),
  });

  const { data: reportData } = useQuery({
    queryKey: ['reseller-report', resellerId],
    queryFn: () => getResellerReport(resellerId),
  });

  const { data: resellerPlansData } = useQuery({
    queryKey: ['reseller-plans'],
    queryFn: getResellerPlans,
  });

  const { data: subscriptionPlansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: getSubscriptionPlans,
  });

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['reseller-wallet', resellerId],
    queryFn: () => getResellerWallet(resellerId),
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['reseller-tenants', resellerId],
    queryFn: () => getResellerTenants(resellerId),
  });

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ['reseller-earnings', resellerId],
    queryFn: () => getResellerEarnings(resellerId),
  });

  const pricingMutation = useMutation({
    mutationFn: (body: { planId: number; resellerPrice: number }) =>
      setResellerPlanPricing(resellerId, body),
    onSuccess: () => {
      message.success('Pricing saved');
      queryClient.invalidateQueries({ queryKey: ['reseller-pricing', resellerId] });
      setPricingModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to save pricing'),
  });

  const walletMutation = useMutation({
    mutationFn: (body: { amount: number; description?: string }) =>
      creditResellerWallet(resellerId, body),
    onSuccess: (res) => {
      message.success(`Wallet credited. New balance: ${formatCurrency(res.data?.balance ?? 0)}`);
      queryClient.invalidateQueries({ queryKey: ['reseller-wallet', resellerId] });
      setWalletModalOpen(false);
      walletForm.resetFields();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to credit wallet'),
  });

  const assignPlanMutation = useMutation({
    mutationFn: (planId: number) => assignPlanToReseller(resellerId, planId),
    onSuccess: () => {
      message.success('Plan assigned to reseller successfully');
      queryClient.invalidateQueries({ queryKey: ['reseller', resellerId] });
      queryClient.invalidateQueries({ queryKey: ['reseller-report', resellerId] });
      setAssignPlanModalOpen(false);
      assignPlanForm.resetFields();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to assign plan'),
  });

  const reseller = resellerData?.data;
  const pricing: PricingRow[] = pricingData?.data ?? [];
  const report = reportData?.data;
  const resellerPlans: ResellerPlan[] = resellerPlansData?.data ?? [];
  const subscriptionPlans: SubscriptionPlan[] = subscriptionPlansData?.data ?? [];
  const currentResellerPlan = resellerPlans.find((p) => p.id === (reseller as any)?.resellerPlanId);
  const walletBalance: number = walletData?.data?.balance ?? 0;
  const walletTxs: WalletTx[] = walletData?.data?.transactions ?? [];
  const tenants: Tenant[] = tenantsData?.data ?? [];
  const earnings: EarningRow[] = earningsData?.data ?? [];
  const earningsSummary = earningsData?.summary ?? { totalCommission: 0, totalBilled: 0, transactionCount: 0 };

  if (resellerLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  if (!reseller) return <div>Reseller not found</div>;

  const pricingColumns = [
    { title: 'Plan', dataIndex: 'planName', key: 'planName' },
    {
      title: 'Business Price',
      dataIndex: 'businessPrice',
      key: 'businessPrice',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Reseller Price',
      dataIndex: 'resellerPrice',
      key: 'resellerPrice',
      render: (v: number) => <span className="font-semibold text-green-600">{formatCurrency(v)}</span>,
    },
    {
      title: 'Margin',
      key: 'margin',
      render: (_: any, r: PricingRow) => (
        <span className="text-blue-600">{formatCurrency(r.businessPrice - r.resellerPrice)}</span>
      ),
    },
  ];

  const walletTxColumns = [
    {
      title: 'Date',
      dataIndex: 'createdDate',
      key: 'date',
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => (
        <Tag color={t === 'credit' ? 'green' : 'red'} icon={t === 'credit' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
          {t === 'credit' ? 'Credit' : 'Debit'}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number, row: WalletTx) => (
        <span className={row.type === 'credit' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
          {row.type === 'credit' ? '+' : '-'}{formatCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (d: string | null) => d ?? '—',
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Back</Button>
        <div>
          <Title level={3} className="!mb-0">{reseller.name}</Title>
          {reseller.companyName && <Text type="secondary">{reseller.companyName}</Text>}
        </div>
        <Tag color={reseller.status === 'active' ? 'green' : 'red'} className="ml-2">
          {reseller.status.toUpperCase()}
        </Tag>
        {reseller.isLocked && <Tag color="orange" icon={<LockOutlined />}>Profile Locked</Tag>}
        <div className="ml-auto">
          <Popconfirm
            title={reseller.isLocked ? 'Unlock this reseller profile?' : 'Lock this reseller profile?'}
            description={
              reseller.isLocked
                ? 'This will restore full access for the reseller.'
                : 'The reseller will be able to view the portal but cannot perform any actions.'
            }
            onConfirm={async () => {
              setLockingProfile(true);
              try {
                if (reseller.isLocked) {
                  await unlockReseller(resellerId);
                  message.success('Reseller profile unlocked');
                } else {
                  await lockReseller(resellerId);
                  message.success('Reseller profile locked');
                }
                queryClient.invalidateQueries({ queryKey: ['reseller', resellerId] });
              } catch {
                message.error('Failed to update lock status');
              } finally {
                setLockingProfile(false);
              }
            }}
            okText="Confirm"
            cancelText="Cancel"
            okButtonProps={{ danger: !reseller.isLocked }}
          >
            <Button
              icon={reseller.isLocked ? <UnlockOutlined /> : <LockOutlined />}
              type={reseller.isLocked ? 'primary' : 'default'}
              danger={!reseller.isLocked}
              loading={lockingProfile}
              size="small"
            >
              {reseller.isLocked ? 'Unlock Profile' : 'Lock Profile'}
            </Button>
          </Popconfirm>
        </div>
      </div>

      {report && (
        <Row gutter={16} className="mb-6">
          <Col xs={12} md={6}>
            <Card><Statistic title="Total Tenants" value={report.totalTenants} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="Active Subscriptions" value={report.activeSubscriptions} valueStyle={{ color: '#16a34a' }} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="Expired" value={report.expiredSubscriptions} valueStyle={{ color: '#dc2626' }} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={report.totalRevenue}
                formatter={(v) => formatCurrency(Number(v))}
                valueStyle={{ color: 'var(--color-primary)' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs
        defaultActiveKey="tenants"
        items={[
          {
            key: 'tenants',
            label: <span><TeamOutlined /> Tenants</span>,
            children: (
              <Card title={`Tenants (${tenants.length})`} loading={tenantsLoading}>
                <Table
                  columns={[
                    {
                      title: 'Business Name',
                      dataIndex: 'businessName',
                      key: 'businessName',
                      render: (v: string) => <span className="font-medium">{v}</span>,
                    },
                    { title: 'Email', dataIndex: 'email', key: 'email' },
                    { title: 'Mobile', dataIndex: 'mobile', key: 'mobile' },
                    {
                      title: 'Plan',
                      dataIndex: 'planName',
                      key: 'planName',
                      render: (v: string | null) => v ?? <span className="text-slate-400">No plan</span>,
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (s: string) => (
                        <Tag color={s === 'active' ? 'green' : s === 'pending' ? 'orange' : 'red'}>
                          {s.toUpperCase()}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Expiry',
                      dataIndex: 'expiryDate',
                      key: 'expiryDate',
                      render: (d: string | null) =>
                        d ? (
                          <span className={new Date(d) < new Date() ? 'text-red-600' : 'text-green-600'}>
                            {new Date(d).toLocaleDateString('en-IN')}
                          </span>
                        ) : '—',
                    },
                    {
                      title: 'Joined',
                      dataIndex: 'createdDate',
                      key: 'createdDate',
                      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
                    },
                  ]}
                  dataSource={tenants}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'earnings',
            label: <span><DollarOutlined /> Earnings</span>,
            children: (
              <div>
                <Row gutter={16} className="mb-4">
                  <Col xs={12} md={8}>
                    <Card>
                      <Statistic
                        title="Total Billed"
                        value={earningsSummary.totalBilled}
                        formatter={(v) => formatCurrency(Number(v))}
                        valueStyle={{ color: 'var(--color-primary)' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={8}>
                    <Card>
                      <Statistic
                        title="Total Earnings (Commission)"
                        value={earningsSummary.totalCommission}
                        formatter={(v) => formatCurrency(Number(v))}
                        valueStyle={{ color: '#16a34a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={8}>
                    <Card>
                      <Statistic
                        title="Transactions"
                        value={earningsSummary.transactionCount}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card title="Earnings Breakdown" loading={earningsLoading}>
                  {earnings.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No earnings yet.</div>
                  ) : (
                    <Table
                      columns={[
                        {
                          title: 'Date',
                          dataIndex: 'createdDate',
                          key: 'date',
                          render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
                        },
                        {
                          title: 'Tenant',
                          dataIndex: 'businessName',
                          key: 'businessName',
                          render: (v: string) => <span className="font-medium">{v}</span>,
                        },
                        { title: 'Plan', dataIndex: 'planName', key: 'planName' },
                        {
                          title: 'Billed Amount',
                          dataIndex: 'billedAmount',
                          key: 'billedAmount',
                          render: (v: number) => formatCurrency(v),
                        },
                        {
                          title: 'Reseller Price',
                          dataIndex: 'resellerPrice',
                          key: 'resellerPrice',
                          render: (v: number) => formatCurrency(v),
                        },
                        {
                          title: 'Commission',
                          dataIndex: 'commission',
                          key: 'commission',
                          render: (v: number) => (
                            <span className="font-semibold text-green-600">{formatCurrency(v)}</span>
                          ),
                        },
                      ]}
                      dataSource={earnings}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'pricing',
            label: 'Enterprise Plan Pricing',
            children: (
              <Card
                title="Reseller's Discounted Pricing on Enterprise Plans"
                extra={
                  <Button type="primary" icon={<SaveOutlined />} onClick={() => { form.resetFields(); setPricingModalOpen(true); }}>
                    Set Price
                  </Button>
                }
              >
                <p className="text-slate-500 text-sm mb-3">
                  These are the discounted prices at which this reseller buys <strong>enterprise subscription plans</strong> to resell to their tenants. Margin = Business Price − Reseller Price.
                </p>
                <Table
                  columns={pricingColumns}
                  dataSource={pricing}
                  rowKey="id"
                  loading={pricingLoading}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'subscription',
            label: 'Subscription',
            children: (
              <Card
                title="Reseller Portal Subscription"
                extra={
                  <Button type="primary" icon={<CrownOutlined />} onClick={() => { assignPlanForm.resetFields(); setAssignPlanModalOpen(true); }}>
                    Assign Plan
                  </Button>
                }
              >
                <p className="text-slate-500 text-sm mb-4">
                  This is the plan the <strong>reseller</strong> uses to access their own portal. It is separate from the enterprise plans the reseller sells to their tenants.
                </p>
                <Row gutter={24}>
                  <Col xs={24} sm={8}>
                    <div className="text-slate-500 text-xs mb-1 uppercase">Current Plan</div>
                    <div className="font-medium">
                      {(reseller as any).resellerPlanId ? (
                        currentResellerPlan
                          ? <>
                              <div>{currentResellerPlan.name}</div>
                              <div className="text-xs text-slate-500">
                                {formatCurrency(Number(currentResellerPlan.price))} · {currentResellerPlan.durationDays} days · {currentResellerPlan.commissionPercentage}% commission
                              </div>
                            </>
                          : `Plan #${(reseller as any).resellerPlanId}`
                      ) : <span className="text-slate-400">No plan</span>}
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="text-slate-500 text-xs mb-1 uppercase">Expiry Date</div>
                    <div className="font-medium">
                      {(reseller as any).expiryDate ? (
                        <span className={new Date((reseller as any).expiryDate) < new Date() ? 'text-red-600' : 'text-green-600'}>
                          {new Date((reseller as any).expiryDate).toLocaleDateString('en-IN')}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="text-slate-500 text-xs mb-1 uppercase">Status</div>
                    {(reseller as any).resellerPlanId && (reseller as any).expiryDate ? (
                      new Date((reseller as any).expiryDate) >= new Date()
                        ? <Tag color="green">Active</Tag>
                        : <Tag color="red">Expired</Tag>
                    ) : <Tag color="default">No Plan</Tag>}
                  </Col>
                </Row>
              </Card>
            ),
          },
          {
            key: 'wallet',
            label: 'Wallet',
            children: (
              <div>
                <Row gutter={16} className="mb-4">
                  <Col xs={24} sm={8}>
                    <Card>
                      <Statistic
                        title="Wallet Balance"
                        value={walletBalance}
                        formatter={(v) => formatCurrency(Number(v))}
                        prefix={<WalletOutlined />}
                        valueStyle={{ color: '#16a34a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={16} className="flex items-center">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => { walletForm.resetFields(); setWalletModalOpen(true); }}
                    >
                      Credit Wallet
                    </Button>
                  </Col>
                </Row>

                <Card title="Transaction History" loading={walletLoading}>
                  {walletTxs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No transactions yet.</div>
                  ) : (
                    <Table columns={walletTxColumns} dataSource={walletTxs} rowKey="id" pagination={{ pageSize: 10 }} />
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'info',
            label: 'Reseller Info',
            children: (
              <Card>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <div className="mb-4">
                      <Text type="secondary" className="text-xs uppercase">Email</Text>
                      <div className="font-medium">{reseller.email}</div>
                    </div>
                    <div className="mb-4">
                      <Text type="secondary" className="text-xs uppercase">Mobile</Text>
                      <div className="font-medium">{reseller.mobile}</div>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div className="mb-4">
                      <Text type="secondary" className="text-xs uppercase">Company</Text>
                      <div className="font-medium">{reseller.companyName || '—'}</div>
                    </div>
                    <div className="mb-4">
                      <Text type="secondary" className="text-xs uppercase">Joined</Text>
                      <div className="font-medium">{new Date(reseller.createdDate).toLocaleDateString()}</div>
                    </div>
                  </Col>
                </Row>
              </Card>
            ),
          },
        ]}
      />

      {/* Set Plan Pricing Modal */}
      <Modal
        title="Set Enterprise Plan Pricing for Reseller"
        open={pricingModalOpen}
        onCancel={() => { setPricingModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={pricingMutation.isPending}
        okText="Save"
      >
        <p className="text-slate-600 text-sm mb-4">
          Set the discounted price at which this reseller can buy an <strong>enterprise subscription plan</strong> (to resell to their tenants). The difference between the business price and the reseller price is the reseller's margin.
        </p>
        <Form form={form} layout="vertical" onFinish={(v) => pricingMutation.mutate(v)} className="mt-4">
          <Form.Item name="planId" label="Select Enterprise Plan" rules={[{ required: true }]}>
            <Select placeholder="Choose enterprise plan">
              {subscriptionPlans.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name} — Business Price: {formatCurrency(Number(p.price))}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="resellerPrice" label="Reseller Price (must be less than business price)" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" prefix="₹" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Credit Wallet Modal */}
      <Modal
        title="Credit Reseller Wallet"
        open={walletModalOpen}
        onCancel={() => { setWalletModalOpen(false); walletForm.resetFields(); }}
        onOk={() => walletForm.submit()}
        confirmLoading={walletMutation.isPending}
        okText="Credit"
      >
        <Form form={walletForm} layout="vertical" onFinish={(v) => walletMutation.mutate(v)} className="mt-4">
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Enter amount' }, { type: 'number', min: 1 }]}>
            <InputNumber min={1} className="w-full" prefix="₹" placeholder="Enter amount to credit" />
          </Form.Item>
          <Form.Item name="description" label="Description (optional)">
            <Input placeholder="Reason for credit, e.g. Monthly top-up" />
          </Form.Item>
          <p className="text-slate-500 text-sm">Current balance: <strong>{formatCurrency(walletBalance)}</strong></p>
        </Form>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal
        title="Assign Reseller Portal Plan"
        open={assignPlanModalOpen}
        onCancel={() => { setAssignPlanModalOpen(false); assignPlanForm.resetFields(); }}
        onOk={() => assignPlanForm.submit()}
        confirmLoading={assignPlanMutation.isPending}
        okText="Assign Plan"
      >
        <Form form={assignPlanForm} layout="vertical" onFinish={(v) => assignPlanMutation.mutate(v.planId)} className="mt-4">
          <p className="text-slate-600 text-sm mb-4">
            Directly assign a <strong>reseller plan</strong> (portal access) to this reseller without wallet deduction. The reseller will keep portal access until the plan expires.
          </p>
          {resellerPlans.length === 0 && (
            <p className="text-amber-600 text-sm mb-3">
              No reseller plans are configured. Create one in Super Admin → Reseller Plans first.
            </p>
          )}
          <Form.Item name="planId" label="Select Reseller Plan" rules={[{ required: true }]}>
            <Select placeholder="Choose reseller plan">
              {resellerPlans.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name} — {p.durationDays} days — {formatCurrency(Number(p.price))} — {p.commissionPercentage}% commission
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
