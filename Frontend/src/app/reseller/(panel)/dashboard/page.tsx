'use client';

import { Card, Row, Col, Statistic, Table, Tag, Typography, Spin, Progress, Tooltip, Badge } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  WalletOutlined,
  TrophyOutlined,
  UserOutlined,
  CalendarOutlined,
  MinusCircleOutlined,
  RiseOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getMyReport,
  getMySubscriptions,
  getMyCommissions,
  getMyWallet,
  getMyUsage,
} from '@/lib/api/reseller-client';

const { Title, Text } = Typography;

function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-slate-400 text-xs">—</span>;
  const expiry = new Date(date);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (expiry < now) return <span className="text-red-500 text-xs font-medium">Expired {expiry.toLocaleDateString('en-IN')}</span>;
  if (daysLeft <= 15) return (
    <Tooltip title={`${daysLeft} days remaining`}>
      <span className="text-orange-500 text-xs font-medium">{expiry.toLocaleDateString('en-IN')} <Badge count={`${daysLeft}d`} style={{ backgroundColor: '#f97316', fontSize: 10 }} /></span>
    </Tooltip>
  );
  return <span className="text-green-600 text-xs">{expiry.toLocaleDateString('en-IN')}</span>;
}

interface TenantRow {
  id: number;
  businessName: string;
  email: string;
  planName: string | null;
  planPrice: number | null;
  subscriptionStatus: 'active' | 'expired' | 'none';
  expiryDate: string | null;
  subscriptionStartDate: string | null;
  employeeCount: number;
  activeEmployees: number;
  totalBilled: number;
  totalCommission: number;
}

interface CommissionRow {
  id: number;
  billedAmount: number;
  resellerPrice: number;
  commission: number;
  createdDate: string;
  businessName: string;
  planName: string;
}

export default function ResellerDashboardPage() {
  const { data: reportData, isLoading: reportLoading } = useQuery({ queryKey: ['my-report'], queryFn: getMyReport });
  const { data: subsData, isLoading: subsLoading } = useQuery({ queryKey: ['reseller-subscriptions'], queryFn: getMySubscriptions });
  const { data: commData, isLoading: commLoading } = useQuery({ queryKey: ['reseller-commissions'], queryFn: getMyCommissions });
  const { data: walletData, isLoading: walletLoading } = useQuery({ queryKey: ['reseller-wallet'], queryFn: getMyWallet });
  const { data: usageData, isLoading: usageLoading } = useQuery({ queryKey: ['reseller-usage'], queryFn: getMyUsage });

  const isLoading = reportLoading || subsLoading || commLoading || walletLoading || usageLoading;

  const report = reportData?.data ?? { totalTenants: 0, activeSubscriptions: 0, expiredSubscriptions: 0, totalRevenue: 0 };
  const subs: Array<{ id: number; businessName: string; email: string; planName: string | null; planPrice: number | null; subscriptionStatus: 'active' | 'expired' | 'none'; expiryDate: string | null; subscriptionStartDate: string | null }> = subsData?.data ?? [];
  const commRows: CommissionRow[] = commData?.data ?? [];
  const commSummary = commData?.summary ?? { totalCommission: 0, totalBilled: 0, transactionCount: 0 };
  const walletBalance: number = walletData?.data?.balance ?? 0;
  const usageRows: Array<{ id: number; employeeCount: number; activeEmployees: number }> = usageData?.data ?? [];

  // Build usage map by tenant id
  const usageMap = new Map(usageRows.map((u) => [u.id, u]));

  // Build commission map by businessName (aggregate)
  const commByTenant = new Map<string, { totalBilled: number; totalCommission: number }>();
  for (const c of commRows) {
    const prev = commByTenant.get(c.businessName) ?? { totalBilled: 0, totalCommission: 0 };
    commByTenant.set(c.businessName, {
      totalBilled: prev.totalBilled + c.billedAmount,
      totalCommission: prev.totalCommission + c.commission,
    });
  }

  // Merge into unified tenant rows
  const tenants: TenantRow[] = subs.map((s) => {
    const usage = usageMap.get(s.id);
    const comm = commByTenant.get(s.businessName);
    return {
      id: s.id,
      businessName: s.businessName,
      email: s.email,
      planName: s.planName,
      planPrice: s.planPrice,
      subscriptionStatus: s.subscriptionStatus,
      expiryDate: s.expiryDate,
      subscriptionStartDate: s.subscriptionStartDate,
      employeeCount: usage?.employeeCount ?? 0,
      activeEmployees: usage?.activeEmployees ?? 0,
      totalBilled: comm?.totalBilled ?? 0,
      totalCommission: comm?.totalCommission ?? 0,
    };
  });

  const recentComms = [...commRows].slice(0, 8);

  const tenantColumns = [
    {
      title: 'Tenant',
      key: 'tenant',
      width: 200,
      render: (_: unknown, r: TenantRow) => (
        <div>
          <div className="font-semibold text-sm flex items-center gap-1">
            <ShopOutlined className="text-slate-400 text-xs" />
            {r.businessName}
          </div>
          <div className="text-xs text-slate-400">{r.email}</div>
        </div>
      ),
    },
    {
      title: 'Plan',
      key: 'plan',
      width: 160,
      render: (_: unknown, r: TenantRow) =>
        r.planName ? (
          <div>
            <div className="text-sm font-medium">{r.planName}</div>
            {r.planPrice != null && <div className="text-xs text-slate-400">{fmt(r.planPrice)}</div>}
          </div>
        ) : (
          <span className="text-slate-400 text-xs">No plan</span>
        ),
    },
    {
      title: 'Subscription',
      key: 'subscription',
      width: 160,
      render: (_: unknown, r: TenantRow) => (
        <div className="space-y-1">
          {r.subscriptionStatus === 'active' && <Tag color="green" icon={<CheckCircleOutlined />} className="text-xs">Active</Tag>}
          {r.subscriptionStatus === 'expired' && <Tag color="red" icon={<CloseCircleOutlined />} className="text-xs">Expired</Tag>}
          {r.subscriptionStatus === 'none' && <Tag color="default" icon={<MinusCircleOutlined />} className="text-xs">No Plan</Tag>}
          <div><ExpiryBadge date={r.expiryDate} /></div>
        </div>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Expired', value: 'expired' },
        { text: 'No Plan', value: 'none' },
      ],
      onFilter: (value: unknown, r: TenantRow) => r.subscriptionStatus === value,
    },
    {
      title: 'Employees',
      key: 'employees',
      width: 140,
      render: (_: unknown, r: TenantRow) => {
        const pct = r.employeeCount > 0 ? Math.round((r.activeEmployees / r.employeeCount) * 100) : 0;
        return (
          <div>
            <div className="flex items-center gap-2 text-sm">
              <UserOutlined className="text-slate-400 text-xs" />
              <span className="font-medium text-green-600">{r.activeEmployees}</span>
              <span className="text-slate-400 text-xs">/ {r.employeeCount}</span>
            </div>
            {r.employeeCount > 0 && (
              <Progress percent={pct} size="small" showInfo={false} strokeColor="#16a34a" className="!mb-0" style={{ width: 80 }} />
            )}
          </div>
        );
      },
      sorter: (a: TenantRow, b: TenantRow) => a.employeeCount - b.employeeCount,
    },
    {
      title: 'Revenue Billed',
      key: 'billed',
      width: 120,
      render: (_: unknown, r: TenantRow) =>
        r.totalBilled > 0 ? (
          <span className="text-sm font-medium text-indigo-600">{fmt(r.totalBilled)}</span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        ),
      sorter: (a: TenantRow, b: TenantRow) => a.totalBilled - b.totalBilled,
    },
    {
      title: 'Your Earnings',
      key: 'commission',
      width: 120,
      render: (_: unknown, r: TenantRow) =>
        r.totalCommission > 0 ? (
          <span className="text-sm font-semibold text-green-600">{fmt(r.totalCommission)}</span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        ),
      sorter: (a: TenantRow, b: TenantRow) => a.totalCommission - b.totalCommission,
    },
    {
      title: 'Since',
      dataIndex: 'subscriptionStartDate',
      key: 'since',
      width: 100,
      render: (d: string | null) =>
        d ? <span className="text-xs text-slate-400">{new Date(d).toLocaleDateString('en-IN')}</span> : <span className="text-slate-300 text-xs">—</span>,
    },
  ];

  const recentCommColumns = [
    {
      title: 'Tenant',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (name: string) => <span className="font-medium text-sm">{name}</span>,
    },
    {
      title: 'Plan',
      dataIndex: 'planName',
      key: 'planName',
      render: (name: string) => <span className="text-sm text-slate-600">{name}</span>,
    },
    {
      title: 'Billed',
      dataIndex: 'billedAmount',
      key: 'billedAmount',
      render: (v: number) => <span className="text-sm text-indigo-600">{fmt(v)}</span>,
    },
    {
      title: 'Your Price',
      dataIndex: 'resellerPrice',
      key: 'resellerPrice',
      render: (v: number) => <span className="text-sm text-slate-400">{fmt(v)}</span>,
    },
    {
      title: 'Earned',
      dataIndex: 'commission',
      key: 'commission',
      render: (v: number) => (
        <span className={`text-sm font-semibold ${v > 0 ? 'text-green-600' : 'text-slate-400'}`}>
          {fmt(v)}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => <span className="text-xs text-slate-400">{new Date(d).toLocaleDateString('en-IN')}</span>,
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  }

  const expiringCount = tenants.filter((t) => {
    if (!t.expiryDate || t.subscriptionStatus !== 'active') return false;
    const days = Math.ceil((new Date(t.expiryDate).getTime() - Date.now()) / 86400000);
    return days <= 15;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title level={3} className="!mb-0">Dashboard</Title>
        {expiringCount > 0 && (
          <Tag color="orange" icon={<CalendarOutlined />} className="text-sm">
            {expiringCount} subscription{expiringCount > 1 ? 's' : ''} expiring soon
          </Tag>
        )}
      </div>

      {/* KPI Row */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <Card className="h-full">
            <Statistic
              title="Total Tenants"
              value={report.totalTenants}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#2563eb', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="h-full">
            <Statistic
              title="Active"
              value={report.activeSubscriptions}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#16a34a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="h-full">
            <Statistic
              title="Expired"
              value={report.expiredSubscriptions}
              prefix={<CloseCircleOutlined className="text-red-500" />}
              valueStyle={{ color: '#dc2626', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="h-full">
            <Statistic
              title="Total Revenue"
              value={report.totalRevenue}
              formatter={(v) => fmt(Number(v))}
              prefix={<RiseOutlined className="text-indigo-500" />}
              valueStyle={{ color: '#4f46e5', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="h-full">
            <Statistic
              title="Commission Earned"
              value={commSummary.totalCommission}
              formatter={(v) => fmt(Number(v))}
              prefix={<TrophyOutlined className="text-yellow-500" />}
              valueStyle={{ color: '#d97706', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card className="h-full">
            <Statistic
              title="Wallet Balance"
              value={walletBalance}
              formatter={(v) => fmt(Number(v))}
              prefix={<WalletOutlined className="text-emerald-500" />}
              valueStyle={{ color: '#059669', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tenant Activity Table */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-blue-500" />
            <span>Tenant Activity Overview</span>
            <Text type="secondary" className="!text-xs font-normal ml-1">
              ({tenants.length} tenant{tenants.length !== 1 ? 's' : ''})
            </Text>
          </div>
        }
        extra={
          <Text type="secondary" className="text-xs">
            Plan · Subscription · Employees · Earnings per tenant
          </Text>
        }
      >
        <Table
          columns={tenantColumns}
          dataSource={tenants}
          rowKey="id"
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 900 }}
          rowClassName={(r: TenantRow) =>
            r.subscriptionStatus === 'expired' ? 'bg-red-50' : ''
          }
          locale={{ emptyText: 'No tenants yet. Create your first tenant from the Tenants page.' }}
        />
      </Card>

      {/* Recent Commissions */}
      {recentComms.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <DollarOutlined className="text-green-500" />
              <span>Recent Earnings</span>
            </div>
          }
          extra={
            <div className="flex items-center gap-4">
              <Text type="secondary" className="text-xs">
                Total {commSummary.transactionCount} transactions
              </Text>
              <a href="/reseller/commissions" className="text-xs text-blue-500 hover:underline">
                View all →
              </a>
            </div>
          }
        >
          <Table
            columns={recentCommColumns}
            dataSource={recentComms}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Empty state for commissions */}
      {recentComms.length === 0 && tenants.length > 0 && (
        <Card>
          <div className="text-center py-8 text-slate-400">
            <TrophyOutlined className="text-4xl mb-3 block" />
            <div className="font-medium">No earnings yet</div>
            <div className="text-sm mt-1">Assign plans to your tenants to start earning commissions.</div>
          </div>
        </Card>
      )}
    </div>
  );
}
