'use client';
import React, { useState } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Select, DatePicker, Space, Tabs, Result,
} from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getWasteAnalyticsSummary, getWasteByCategory, getWasteBySource,
  getWasteFinancials, getWasteAging, getWasteDisposalMethods,
} from '@/lib/api/waste';
import { useAuthStore, usePermissions } from '@/stores/authStore';

const { RangePicker } = DatePicker;
const { Option } = Select;

const CLASS_COLOR: Record<string, string> = {
  recyclable: 'green', hazardous: 'red', general: 'default', 'e-waste': 'orange', organic: 'cyan',
};

export default function WasteAnalyticsPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canAccess = userType === 'enterprise' || hasPermission('waste_management', 'waste_analytics', 'view');

  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [agingDays, setAgingDays] = useState(30);

  const from = dateRange?.[0];
  const to = dateRange?.[1];
  const params = { from, to };

  const { data: summary } = useQuery({ queryKey: ['waste-summary', from, to], queryFn: () => getWasteAnalyticsSummary(params) });
  const { data: byCategory = [] } = useQuery({ queryKey: ['waste-by-category', from, to], queryFn: () => getWasteByCategory(params) });
  const { data: bySource = [] } = useQuery({ queryKey: ['waste-by-source', from, to], queryFn: () => getWasteBySource(params) });
  const { data: financials = [] } = useQuery({ queryKey: ['waste-financials', from, to], queryFn: () => getWasteFinancials(params) });
  const { data: aging = [] } = useQuery({ queryKey: ['waste-aging', agingDays], queryFn: () => getWasteAging({ days: agingDays }) });
  const { data: methods = [] } = useQuery({ queryKey: ['waste-methods', from, to], queryFn: () => getWasteDisposalMethods(params) });

  if (!canAccess) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to view Waste Analytics." />;
  }

  const catColumns = [
    { title: 'Category', dataIndex: 'category_name' },
    { title: 'Classification', dataIndex: 'classification', render: (v: string) => <Tag color={CLASS_COLOR[v]}>{v}</Tag> },
    { title: 'Generated', render: (_: any, r: any) => `${parseFloat(r.total_generated || '0').toLocaleString()} ${r.unit}` },
    { title: 'Disposed', render: (_: any, r: any) => `${parseFloat(r.total_disposed || '0').toLocaleString()} ${r.unit}` },
    { title: 'Remaining', render: (_: any, r: any) => `${parseFloat(r.total_available || '0').toLocaleString()} ${r.unit}` },
    { title: 'Batches', dataIndex: 'batch_count' },
    {
      title: 'Disposal %',
      render: (_: any, r: any) => {
        const gen = parseFloat(r.total_generated || '0');
        const dis = parseFloat(r.total_disposed || '0');
        if (!gen) return '—';
        const pct = Math.round((dis / gen) * 100);
        return <span className={pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-orange-500' : 'text-red-500'}>{pct}%</span>;
      },
    },
  ];

  const sourceColumns = [
    { title: 'Source', dataIndex: 'source_name' },
    { title: 'Type', dataIndex: 'source_type', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Generated', render: (_: any, r: any) => `${parseFloat(r.total_generated || '0').toLocaleString()} ${r.unit}` },
    { title: 'Disposed', render: (_: any, r: any) => `${parseFloat(r.total_disposed || '0').toLocaleString()} ${r.unit}` },
    { title: 'Remaining', render: (_: any, r: any) => `${parseFloat(r.total_remaining || '0').toLocaleString()} ${r.unit}` },
  ];

  const finColumns = [
    { title: 'Month', dataIndex: 'month', render: (v: string) => v ? dayjs(v).format('MMM YYYY') : '—' },
    { title: 'Revenue', dataIndex: 'revenue', render: (v: string) => <span className="text-green-600 font-medium">₹{parseFloat(v || '0').toLocaleString()}</span> },
    { title: 'Cost', dataIndex: 'cost', render: (v: string) => <span className="text-red-500 font-medium">₹{parseFloat(v || '0').toLocaleString()}</span> },
    { title: 'Net', dataIndex: 'net_value', render: (v: string) => { const n = parseFloat(v || '0'); return <span className={n >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>₹{n.toLocaleString()}</span>; } },
    { title: 'Transactions', dataIndex: 'transactions' },
    { title: 'Quantity', render: (_: any, r: any) => `${parseFloat(r.quantity || '0').toLocaleString()} kg` },
  ];

  const agingColumns = [
    { title: 'Batch', dataIndex: 'batch_no', render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    { title: 'Category', dataIndex: 'category_name' },
    { title: 'Classification', dataIndex: 'classification', render: (v: string) => <Tag color={CLASS_COLOR[v]}>{v}</Tag> },
    { title: 'Source', dataIndex: 'source_name', render: (v?: string) => v ?? '—' },
    { title: 'Qty Remaining', render: (_: any, r: any) => `${parseFloat(r.quantity_available || '0').toLocaleString()} ${r.unit}` },
    { title: 'Storage Date', dataIndex: 'storage_date', render: (v: string) => dayjs(v).format('DD MMM YYYY') },
    { title: 'Days in Stock', dataIndex: 'days_in_stock', render: (v: number) => <span className={v > 90 ? 'text-red-500 font-bold' : v > 30 ? 'text-orange-500' : ''}>{v} days</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'expired' ? 'red' : v === 'quarantined' ? 'purple' : 'default'}>{v}</Tag> },
  ];

  const methodColumns = [
    { title: 'Method', dataIndex: 'disposal_method', render: (v: string) => v.replace(/_/g,' ').toUpperCase() },
    { title: 'Type', dataIndex: 'transaction_type', render: (v: string) => <Tag color={v === 'sale' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Transactions', dataIndex: 'transaction_count' },
    { title: 'Total Qty', render: (_: any, r: any) => `${parseFloat(r.total_quantity || '0').toLocaleString()} kg` },
    { title: 'Revenue', dataIndex: 'total_revenue', render: (v: string) => <span className="text-green-600">₹{parseFloat(v || '0').toLocaleString()}</span> },
    { title: 'Cost', dataIndex: 'total_cost', render: (v: string) => <span className="text-red-500">₹{parseFloat(v || '0').toLocaleString()}</span> },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wastage Analytics</h1>
        <RangePicker onChange={(_, s) => setDateRange(s[0] && s[1] ? [s[0], s[1]] : null)} />
      </div>

      {/* Summary KPIs */}
      <Row gutter={16} className="mb-6">
        {[
          { title: 'Total Generated', value: `${(summary?.totalGenerated ?? 0).toLocaleString()} kg`, color: '#1677ff' },
          { title: 'Total Disposed', value: `${(summary?.totalDisposed ?? 0).toLocaleString()} kg`, color: '#52c41a' },
          { title: 'Total Available', value: `${(summary?.totalAvailable ?? 0).toLocaleString()} kg`, color: '#fa8c16' },
          { title: 'Revenue', value: `₹${(summary?.totalRevenue ?? 0).toLocaleString()}`, color: '#52c41a' },
          { title: 'Disposal Cost', value: `₹${(summary?.totalCost ?? 0).toLocaleString()}`, color: '#ff4d4f' },
          { title: 'Net Value', value: `₹${(summary?.netValue ?? 0).toLocaleString()}`, color: (summary?.netValue ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' },
        ].map(s => (
          <Col key={s.title} xs={12} md={4}>
            <Card size="small"><Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontSize: 16 }} /></Card>
          </Col>
        ))}
      </Row>

      <Tabs items={[
        {
          key: 'category', label: 'By Category',
          children: <Table dataSource={byCategory} columns={catColumns} rowKey="category_name" pagination={false} size="small" />,
        },
        {
          key: 'source', label: 'By Source',
          children: <Table dataSource={bySource} columns={sourceColumns} rowKey={(r: any) => `${r.source_name}-${r.period}`} pagination={false} size="small" />,
        },
        {
          key: 'financials', label: 'Financials',
          children: <Table dataSource={financials} columns={finColumns} rowKey={(r: any) => r.month} pagination={false} size="small" />,
        },
        {
          key: 'methods', label: 'Disposal Methods',
          children: <Table dataSource={methods} columns={methodColumns} rowKey="disposal_method" pagination={false} size="small" />,
        },
        {
          key: 'aging', label: 'Aging Report',
          children: (
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm text-gray-500">Show batches older than:</span>
                <Select value={agingDays} onChange={setAgingDays} style={{ width: 120 }}>
                  <Option value={7}>7 days</Option><Option value={14}>14 days</Option>
                  <Option value={30}>30 days</Option><Option value={60}>60 days</Option><Option value={90}>90 days</Option>
                </Select>
              </div>
              <Table dataSource={aging} columns={agingColumns} rowKey="id" pagination={{ pageSize: 20 }} size="small" />
            </div>
          ),
        },
      ]} />
    </div>
  );
}
