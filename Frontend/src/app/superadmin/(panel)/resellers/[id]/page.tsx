'use client';

import { useState } from 'react';
import { use } from 'react';
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
  getResellerWallet,
  creditResellerWallet,
  assignPlanToReseller,
  lockReseller,
  unlockReseller,
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

interface Plan {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  commissionPercentage: number;
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

export default function ResellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  const { data: plansData } = useQuery({
    queryKey: ['reseller-plans'],
    queryFn: getResellerPlans,
  });

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['reseller-wallet', resellerId],
    queryFn: () => getResellerWallet(resellerId),
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
      setAssignPlanModalOpen(false);
      assignPlanForm.resetFields();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to assign plan'),
  });

  const reseller = resellerData?.data;
  const pricing: PricingRow[] = pricingData?.data ?? [];
  const report = reportData?.data;
  const plans: Plan[] = plansData?.data ?? [];
  const walletBalance: number = walletData?.data?.balance ?? 0;
  const walletTxs: WalletTx[] = walletData?.data?.transactions ?? [];

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
                valueStyle={{ color: '#2563eb' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs
        items={[
          {
            key: 'pricing',
            label: 'Plan Pricing',
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<SaveOutlined />} onClick={() => { form.resetFields(); setPricingModalOpen(true); }}>
                    Set Price
                  </Button>
                }
              >
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
                title="Reseller Subscription"
                extra={
                  <Button type="primary" icon={<CrownOutlined />} onClick={() => { assignPlanForm.resetFields(); setAssignPlanModalOpen(true); }}>
                    Assign Plan
                  </Button>
                }
              >
                <Row gutter={24}>
                  <Col xs={24} sm={8}>
                    <div className="text-slate-500 text-xs mb-1 uppercase">Current Plan</div>
                    <div className="font-medium">{(reseller as any).planId ? `Plan #${(reseller as any).planId}` : <span className="text-slate-400">No plan</span>}</div>
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
                    {(reseller as any).planId && (reseller as any).expiryDate ? (
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
        title="Set Plan Pricing"
        open={pricingModalOpen}
        onCancel={() => { setPricingModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={pricingMutation.isPending}
        okText="Save"
      >
        <Form form={form} layout="vertical" onFinish={(v) => pricingMutation.mutate(v)} className="mt-4">
          <Form.Item name="planId" label="Select Plan" rules={[{ required: true }]}>
            <Select placeholder="Choose plan">
              {plans.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(Number(p.price))})
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
        title="Assign Subscription Plan to Reseller"
        open={assignPlanModalOpen}
        onCancel={() => { setAssignPlanModalOpen(false); assignPlanForm.resetFields(); }}
        onOk={() => assignPlanForm.submit()}
        confirmLoading={assignPlanMutation.isPending}
        okText="Assign Plan"
      >
        <Form form={assignPlanForm} layout="vertical" onFinish={(v) => assignPlanMutation.mutate(v.planId)} className="mt-4">
          <p className="text-slate-600 text-sm mb-4">
            Directly assign a subscription plan to this reseller without wallet deduction. The reseller will get portal access until the plan expires.
          </p>
          <Form.Item name="planId" label="Select Plan" rules={[{ required: true }]}>
            <Select placeholder="Choose plan">
              {plans.map((p) => (
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
