'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  DatePicker,
  Popconfirm,
  message,
  Typography,
  Space,
  Skeleton,
  Tabs,
  Segmented,
  Table,
  Progress,
  Spin,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  StopOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  WalletOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';
import dynamic from 'next/dynamic';
import {
  getEnterprise,
  updateEnterpriseStatus,
  updateEnterpriseExpiry,
  getEnterpriseFinancials,
  getEnterprisePayment,
  approveEnterprise,
  rejectEnterprise,
} from '@/lib/api/super-admin';

const { Title, Text } = Typography;

const DailyLineChart = dynamic(
  () => import('./FinancialCharts').then((m) => m.DailyLineChart),
  { ssr: false, loading: () => <div style={{ height: 260 }} className="flex items-center justify-center text-gray-400 text-sm">Loading chart...</div> }
);
const MonthlyBarChart = dynamic(
  () => import('./FinancialCharts').then((m) => m.MonthlyBarChart),
  { ssr: false, loading: () => <div style={{ height: 260 }} className="flex items-center justify-center text-gray-400 text-sm">Loading chart...</div> }
);

// ---- Types ----

interface Enterprise {
  id: number;
  businessName: string;
  email: string;
  mobile: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
  cinNumber: string | null;
  contactPerson: string | null;
  website: string | null;
  status: string;
  expiryDate: string | null;
  createdDate: string;
}

interface DailyDataPoint {
  date: string;
  revenue: number;
  cost: number;
}

interface MonthlyDataPoint {
  month: string;
  revenue: number;
  cost: number;
}

interface InvoiceStatusRow {
  status: string;
  count: number;
  amount: number;
}

interface RecentInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  grandTotal: number;
  status: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  totalCollected: number;
  outstandingBalance: number;
  totalInvoices: number;
  totalPurchaseOrders: number;
  totalSalesOrders: number;
}

interface FinancialsData {
  summary: FinancialSummary;
  dailyData: DailyDataPoint[];
  monthlyData: MonthlyDataPoint[];
  invoiceStatusBreakdown: InvoiceStatusRow[];
  recentInvoices: RecentInvoice[];
}

interface PlatformPayment {
  id: number;
  enterpriseId: number;
  planId: number;
  planName: string | null;
  planDurationDays: number | null;
  planPrice: number | null;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  status: string;
  createdDate: string;
}

// ---- Helpers ----

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const statusColors: Record<string, string> = {
  active: 'green',
  blocked: 'red',
  pending: 'orange',
  inactive: 'default',
};

const invoiceStatusColors: Record<string, string> = {
  fully_paid: 'green',
  partially_paid: 'blue',
  unpaid: 'orange',
  overdue: 'red',
  cancelled: 'default',
};

// ---- Summary Card ----

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  badgeColor?: string;
  subtitle?: string;
}

function SummaryCard({ title, value, icon, color, badge, badgeColor, subtitle }: SummaryCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 shadow-sm border"
      style={{ borderColor: `${color}30`, background: `${color}08` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
          style={{ background: color }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold text-gray-800">{value}</span>
        {badge && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full mb-0.5"
            style={{ background: `${badgeColor}20`, color: badgeColor }}
          >
            {badge}
          </span>
        )}
      </div>
      {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
    </div>
  );
}

// ---- Financials Tab ----

function FinancialsTab({ enterpriseId }: { enterpriseId: number }) {
  const [period, setPeriod] = useState<string>('30d');
  const [data, setData] = useState<FinancialsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchFinancials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEnterpriseFinancials(enterpriseId, period);
      setData(res.data);
    } catch {
      message.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [enterpriseId, period]);

  useEffect(() => {
    if (fetched) {
      fetchFinancials();
    }
  }, [period, fetched, fetchFinancials]);

  // Called when tab becomes visible for the first time
  useEffect(() => {
    if (!fetched) {
      setFetched(true);
      fetchFinancials();
    }
  }, [fetched, fetchFinancials]);

  const summary = data?.summary;

  const statusColumns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={invoiceStatusColors[s] ?? 'default'}>
          {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </Tag>
      ),
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => formatCurrency(v),
    },
  ];

  const recentInvoiceColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      render: (v: string) => new Date(v).toLocaleDateString('en-IN'),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      ellipsis: true,
    },
    {
      title: 'Amount',
      dataIndex: 'grandTotal',
      key: 'grandTotal',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={invoiceStatusColors[s] ?? 'default'}>
          {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <Text className="text-gray-600 font-medium">Financial Overview</Text>
        <Segmented
          value={period}
          onChange={(v) => setPeriod(v as string)}
          options={[
            { label: 'Last 30 Days', value: '30d' },
            { label: 'Last 90 Days', value: '90d' },
            { label: 'Last Year', value: '1y' },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      ) : !data ? null : (
        <>
          {/* Row 1: 4 summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              title="Total Revenue"
              value={formatCurrency(summary!.totalRevenue)}
              icon={<RiseOutlined />}
              color="#3b82f6"
            />
            <SummaryCard
              title="Total Costs"
              value={formatCurrency(summary!.totalCosts)}
              icon={<ShoppingCartOutlined />}
              color="#f97316"
            />
            <SummaryCard
              title="Gross Profit / Loss"
              value={formatCurrency(summary!.grossProfit)}
              icon={summary!.grossProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
              color={summary!.grossProfit >= 0 ? '#22c55e' : '#ef4444'}
              badge={summary!.grossProfit >= 0 ? 'PROFIT' : 'LOSS'}
              badgeColor={summary!.grossProfit >= 0 ? '#22c55e' : '#ef4444'}
            />
            <SummaryCard
              title="Cash Collected"
              value={formatCurrency(summary!.totalCollected)}
              icon={<WalletOutlined />}
              color="#0d9488"
            />
          </div>

          {/* Row 2: 3 cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <SummaryCard
              title="Outstanding Balance"
              value={formatCurrency(summary!.outstandingBalance)}
              icon={<DollarOutlined />}
              color="#ef4444"
              subtitle="Unpaid invoices"
            />
            <div className="rounded-xl p-4 shadow-sm border border-violet-100 bg-violet-50/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Profit Margin</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: summary!.profitMargin >= 0 ? '#7c3aed' : '#ef4444' }}
                >
                  {summary!.profitMargin.toFixed(1)}%
                </span>
              </div>
              <Progress
                percent={Math.min(Math.abs(summary!.profitMargin), 100)}
                showInfo={false}
                strokeColor={summary!.profitMargin >= 0 ? '#7c3aed' : '#ef4444'}
                trailColor="#e5e7eb"
                size="small"
              />
              <span className="text-xs text-gray-400 mt-1 block">
                {summary!.profitMargin >= 0 ? 'Positive margin' : 'Negative margin'}
              </span>
            </div>
            <div className="rounded-xl p-4 shadow-sm border border-gray-100 bg-gray-50/40">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-3">
                Activity
              </span>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <FileTextOutlined className="text-blue-500" />
                    Invoices
                  </span>
                  <span className="font-bold text-gray-800">{summary!.totalInvoices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <ShopOutlined className="text-green-500" />
                    Sales Orders
                  </span>
                  <span className="font-bold text-gray-800">{summary!.totalSalesOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <ShoppingCartOutlined className="text-orange-500" />
                    Purchase Orders
                  </span>
                  <span className="font-bold text-gray-800">{summary!.totalPurchaseOrders}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card
              title={<span className="text-sm font-semibold">Daily Revenue vs Costs</span>}
              size="small"
              className="shadow-sm"
            >
              <DailyLineChart data={data.dailyData} />
            </Card>

            <Card
              title={<span className="text-sm font-semibold">Monthly Overview</span>}
              size="small"
              className="shadow-sm"
            >
              <MonthlyBarChart data={data.monthlyData} />
            </Card>
          </div>

          {/* Row 4: Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card
              title={<span className="text-sm font-semibold">Invoice Status Breakdown</span>}
              size="small"
              className="shadow-sm"
            >
              <Table
                dataSource={data.invoiceStatusBreakdown}
                columns={statusColumns}
                rowKey="status"
                pagination={false}
                size="small"
              />
            </Card>

            <Card
              title={<span className="text-sm font-semibold">Recent Invoices</span>}
              size="small"
              className="shadow-sm"
            >
              <Table
                dataSource={data.recentInvoices}
                columns={recentInvoiceColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: true }}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function EnterpriseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [payment, setPayment] = useState<PlatformPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiryDate, setExpiryDate] = useState<Dayjs | null>(null);
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [approvingOrRejecting, setApprovingOrRejecting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  async function loadData() {
    setLoading(true);
    try {
      const [entRes, payRes] = await Promise.all([
        getEnterprise(id),
        getEnterprisePayment(id).catch(() => null),
      ]);
      setEnterprise(entRes.data);
      if (entRes.data.expiryDate) {
        setExpiryDate(dayjs(entRes.data.expiryDate));
      }
      setPayment(payRes?.data ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleApprove() {
    setApprovingOrRejecting(true);
    try {
      await approveEnterprise(id);
      message.success('Enterprise approved and activated');
      await loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Failed to approve');
    } finally {
      setApprovingOrRejecting(false);
    }
  }

  async function handleReject() {
    setApprovingOrRejecting(true);
    try {
      await rejectEnterprise(id);
      message.success('Enterprise rejected');
      await loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Failed to reject');
    } finally {
      setApprovingOrRejecting(false);
    }
  }

  async function handleSaveExpiry() {
    if (!expiryDate) return;
    setSavingExpiry(true);
    try {
      await updateEnterpriseExpiry(id, expiryDate.format('YYYY-MM-DD'));
      message.success('Expiry date updated');
      setEnterprise((prev) =>
        prev ? { ...prev, expiryDate: expiryDate.format('YYYY-MM-DD') } : prev
      );
    } catch {
      message.error('Failed to update expiry date');
    } finally {
      setSavingExpiry(false);
    }
  }

  async function handleToggleStatus() {
    if (!enterprise) return;
    const newStatus = enterprise.status === 'blocked' ? 'active' : 'blocked';
    setSavingStatus(true);
    try {
      await updateEnterpriseStatus(id, newStatus);
      message.success(`Enterprise ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
      setEnterprise((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      message.error('Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} className="mb-4">
          Back
        </Button>
        <Card>
          <Skeleton active />
        </Card>
      </div>
    );
  }

  if (!enterprise) {
    return <div>Enterprise not found.</div>;
  }

  const overviewContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card title="Enterprise Details" className="mb-4">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Business Name">{enterprise.businessName}</Descriptions.Item>
            <Descriptions.Item label="Email">{enterprise.email}</Descriptions.Item>
            <Descriptions.Item label="Mobile">{enterprise.mobile}</Descriptions.Item>
            <Descriptions.Item label="Contact Person">{enterprise.contactPerson || '—'}</Descriptions.Item>
            <Descriptions.Item label="Address">{enterprise.address || '—'}</Descriptions.Item>
            <Descriptions.Item label="City">{enterprise.city || '—'}</Descriptions.Item>
            <Descriptions.Item label="State">{enterprise.state || '—'}</Descriptions.Item>
            <Descriptions.Item label="Pincode">{enterprise.pincode || '—'}</Descriptions.Item>
            <Descriptions.Item label="GST Number">{enterprise.gstNumber || '—'}</Descriptions.Item>
            <Descriptions.Item label="CIN Number">{enterprise.cinNumber || '—'}</Descriptions.Item>
            <Descriptions.Item label="Website">{enterprise.website || '—'}</Descriptions.Item>
            <Descriptions.Item label="Joined">
              {new Date(enterprise.createdDate).toLocaleDateString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Subscription Expiry">
          <p className="text-sm text-gray-500 mb-3">
            Current:{' '}
            <strong>
              {enterprise.expiryDate
                ? new Date(enterprise.expiryDate).toLocaleDateString()
                : 'Not set'}
            </strong>
          </p>
          <Space direction="vertical" className="w-full">
            <DatePicker
              value={expiryDate}
              onChange={setExpiryDate}
              format="YYYY-MM-DD"
              className="w-full"
            />
            <Button
              type="primary"
              onClick={handleSaveExpiry}
              loading={savingExpiry}
              disabled={!expiryDate}
              block
            >
              Save Expiry Date
            </Button>
          </Space>
        </Card>

        <Card title="Account Status">
          <p className="text-sm text-gray-500 mb-3">
            Status: <Tag color={statusColors[enterprise.status] ?? 'default'}>{enterprise.status}</Tag>
          </p>
          <Popconfirm
            title={`${enterprise.status === 'blocked' ? 'Unblock' : 'Block'} this enterprise?`}
            description={
              enterprise.status === 'blocked'
                ? 'This will allow the enterprise to log in again.'
                : 'This will prevent the enterprise from logging in.'
            }
            onConfirm={handleToggleStatus}
            okText="Confirm"
            cancelText="Cancel"
            okButtonProps={{ danger: enterprise.status !== 'blocked' }}
          >
            <Button
              icon={enterprise.status === 'blocked' ? <CheckOutlined /> : <StopOutlined />}
              danger={enterprise.status !== 'blocked'}
              loading={savingStatus}
              block
            >
              {enterprise.status === 'blocked' ? 'Unblock Enterprise' : 'Block Enterprise'}
            </Button>
          </Popconfirm>
        </Card>

        {payment && (
          <Card title="Subscription &amp; Payment">
            {enterprise.status === 'pending' ? (
              <>
                <Alert
                  type="warning"
                  message="Pending Payment Verification"
                  description="Review the payment details below and approve or reject."
                  showIcon
                  className="mb-4"
                />
                <Descriptions column={1} size="small" className="mb-4">
                  <Descriptions.Item label="Plan">{payment.planName ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Duration">{payment.planDurationDays ? `${payment.planDurationDays} days` : '—'}</Descriptions.Item>
                  <Descriptions.Item label="Amount">₹{Number(payment.amount).toLocaleString('en-IN')}</Descriptions.Item>
                  <Descriptions.Item label="Method">{payment.paymentMethod}</Descriptions.Item>
                  <Descriptions.Item label="Reference">{payment.referenceNumber ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Notes">{payment.notes ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Recorded">
                    {new Date(payment.createdDate).toLocaleDateString()}
                  </Descriptions.Item>
                </Descriptions>
                <Space direction="vertical" className="w-full">
                  <Popconfirm
                    title="Approve this enterprise?"
                    description="This will activate the account and set the subscription expiry."
                    onConfirm={handleApprove}
                    okText="Approve"
                    cancelText="Cancel"
                  >
                    <Button
                      type="primary"
                      style={{ background: '#22c55e', borderColor: '#22c55e' }}
                      loading={approvingOrRejecting}
                      block
                    >
                      Approve Enterprise
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Reject this enterprise?"
                    description="This will block the account and mark the payment as rejected."
                    onConfirm={handleReject}
                    okText="Reject"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger loading={approvingOrRejecting} block>
                      Reject Enterprise
                    </Button>
                  </Popconfirm>
                </Space>
              </>
            ) : (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Payment Status">
                  <Tag color={payment.status === 'verified' ? 'green' : payment.status === 'rejected' ? 'red' : 'orange'}>
                    {payment.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Plan">{payment.planName ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Amount">₹{Number(payment.amount).toLocaleString('en-IN')}</Descriptions.Item>
                <Descriptions.Item label="Method">{payment.paymentMethod}</Descriptions.Item>
                <Descriptions.Item label="Reference">{payment.referenceNumber ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Date">
                  {new Date(payment.createdDate).toLocaleDateString()}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/superadmin/enterprises')}>
          Back
        </Button>
        <Title level={4} className="!mb-0">
          {enterprise.businessName}
        </Title>
        <Tag color={statusColors[enterprise.status] ?? 'default'}>{enterprise.status}</Tag>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: overviewContent,
          },
          {
            key: 'financials',
            label: 'Financials',
            children: activeTab === 'financials' ? <FinancialsTab enterpriseId={id} /> : null,
          },
        ]}
      />
    </div>
  );
}
