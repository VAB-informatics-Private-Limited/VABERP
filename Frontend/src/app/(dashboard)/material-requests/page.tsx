'use client';

import { Typography, Button, Card, Select, Space, Table, Tag, Alert, Badge, Tabs, Statistic, Row, Col, Tooltip, Progress, Avatar, Input, Divider } from 'antd';
import dayjs from 'dayjs';
import {
  ClearOutlined, EyeOutlined, ExclamationCircleOutlined, CheckCircleOutlined,
  ToolOutlined, InboxOutlined, ClockCircleOutlined,
  WarningOutlined, SendOutlined, CalendarOutlined, SearchOutlined, UserOutlined, FilterOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { getMaterialRequestList } from '@/lib/api/material-requests';
import { getPriorityItems } from '@/lib/api/inventory';
import { MR_STATUS_OPTIONS } from '@/types/material-request';
import type { MaterialRequest, MaterialRequestItem } from '@/types/material-request';
import type { ColumnsType } from 'antd/es/table';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title, Text } = Typography;

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  issued: 'blue',
};

const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type TabKey = 'all' | 'pending' | 'manufacturing' | 'approved' | 'fulfilled';

export default function MaterialRequestsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['material-requests', status],
    queryFn: () => getMaterialRequestList({ page: 1, pageSize: 500, status }),
  });

  const { data: priorityData } = useQuery({
    queryKey: ['priority-items'],
    queryFn: getPriorityItems,
    refetchInterval: 30000,
  });

  const allRequests = data?.data || [];

  const counts = useMemo(() => {
    const pending = allRequests.filter(r => r.status === 'pending');
    const manufacturing = allRequests.filter(r => r.sales_order_id || r.purpose?.toLowerCase().includes('manufacturing'));
    const mfgPending = manufacturing.filter(r => r.status === 'pending');
    const approved = allRequests.filter(r => ['approved', 'partially_approved'].includes(r.status));
    const fulfilled = allRequests.filter(r => r.status === 'fulfilled');
    const readyToIssue = allRequests.filter(r =>
      r.status === 'approved' && r.items?.some(i => i.status === 'approved' && i.quantity_issued < i.quantity_approved)
    );
    return { pending, manufacturing, mfgPending, approved, fulfilled, readyToIssue };
  }, [allRequests]);

  const filteredData = useMemo(() => {
    let base = allRequests;
    switch (activeTab) {
      case 'pending': base = base.filter(r => r.status === 'pending'); break;
      case 'manufacturing': base = base.filter(r => r.sales_order_id || r.purpose?.toLowerCase().includes('manufacturing')); break;
      case 'approved': base = base.filter(r => ['approved', 'partially_approved'].includes(r.status)); break;
      case 'fulfilled': base = base.filter(r => r.status === 'fulfilled'); break;
    }
    if (status) base = base.filter(r => r.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(r =>
        r.request_number?.toLowerCase().includes(q) ||
        r.requested_by_name?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.job_card_name?.toLowerCase().includes(q)
      );
    }
    return base;
  }, [allRequests, activeTab, status, search]);

  const getStatusColor = (s: string) => MR_STATUS_OPTIONS.find(o => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) => MR_STATUS_OPTIONS.find(o => o.value === s)?.label || s;
  const isManufacturingRequest = (r: MaterialRequest) => !!(r.sales_order_id || r.purpose?.toLowerCase().includes('manufacturing'));

  const statCards = [
    {
      title: 'Pending Approval',
      value: counts.pending.length,
      icon: <ClockCircleOutlined style={{ fontSize: 20 }} />,
      color: '#fa8c16',
      bg: '#fff7e6',
      tab: 'pending' as TabKey,
    },
    {
      title: 'From Manufacturing',
      value: counts.mfgPending.length,
      icon: <ToolOutlined style={{ fontSize: 20 }} />,
      color: '#722ed1',
      bg: '#f9f0ff',
      tab: 'manufacturing' as TabKey,
      badge: counts.mfgPending.length > 0 ? 'Action Required' : undefined,
    },
    {
      title: 'Ready to Issue',
      value: counts.readyToIssue.length,
      icon: <SendOutlined style={{ fontSize: 20 }} />,
      color: '#1677ff',
      bg: '#e6f4ff',
      tab: 'approved' as TabKey,
    },
    {
      title: 'Fulfilled',
      value: counts.fulfilled.length,
      icon: <CheckCircleOutlined style={{ fontSize: 20 }} />,
      color: '#52c41a',
      bg: '#f6ffed',
      tab: 'fulfilled' as TabKey,
    },
  ];

  const columns: ColumnsType<MaterialRequest> = [
    {
      title: 'Request #',
      dataIndex: 'request_number',
      key: 'request_number',
      width: 165,
      render: (text, record) => (
        <div>
          <Text strong style={{ color: '#1677ff', fontSize: 13 }}>{text}</Text>
          {record.job_card_name && (
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{record.job_card_name}</div>
          )}
          {isManufacturingRequest(record) && (
            <Tag color="purple" style={{ fontSize: 10, marginTop: 4, padding: '0 5px' }}>
              <ToolOutlined style={{ marginRight: 3 }} />Manufacturing
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'request_date',
      key: 'request_date',
      width: 110,
      render: (v) => v
        ? <Text style={{ fontSize: 12 }}>{new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'ETA',
      dataIndex: 'expected_delivery',
      key: 'expected_delivery',
      width: 130,
      render: (v: string) => {
        if (!v) return <Text type="secondary" style={{ fontSize: 12 }}>Not set</Text>;
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        const daysLeft = dayjs(v).diff(dayjs(), 'day');
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarOutlined style={{ fontSize: 11, color: isOverdue ? '#ff4d4f' : '#8c8c8c' }} />
              <Text style={{ fontSize: 12, color: isOverdue ? '#ff4d4f' : undefined, fontWeight: isOverdue ? 600 : undefined }}>
                {dayjs(v).format('DD MMM YYYY')}
              </Text>
            </div>
            {isOverdue
              ? <Text style={{ fontSize: 10, color: '#ff4d4f' }}>Overdue by {Math.abs(daysLeft)}d</Text>
              : daysLeft <= 3
                ? <Text style={{ fontSize: 10, color: '#fa8c16' }}>Due in {daysLeft}d</Text>
                : null
            }
          </div>
        );
      },
    },
    {
      title: 'Items',
      key: 'items_stock',
      width: 220,
      render: (_, record) => {
        const items = record.items || [];
        if (items.length === 0) return <Text type="secondary">—</Text>;
        const shortItems = items.filter(i => i.available_stock < i.quantity_requested);
        const allOk = shortItems.length === 0;

        const tooltipContent = (
          <div style={{ minWidth: 220 }}>
            {items.map((item, i) => {
              const isShort = item.available_stock < item.quantity_requested;
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{item.item_name}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#ccc', marginTop: 2 }}>
                    <span>Need: <strong style={{ color: '#fff' }}>{item.quantity_requested} {item.unit_of_measure || ''}</strong></span>
                    <span>Stock: <strong style={{ color: isShort ? '#ff7875' : '#95de64' }}>{item.available_stock} {item.unit_of_measure || ''}</strong></span>
                  </div>
                  {isShort && <div style={{ fontSize: 11, color: '#ff7875', marginTop: 1 }}>Short by {item.quantity_requested - item.available_stock}</div>}
                  <Progress
                    percent={Math.min(100, Math.round((item.available_stock / item.quantity_requested) * 100))}
                    size="small"
                    strokeColor={isShort ? '#ff4d4f' : '#52c41a'}
                    trailColor="rgba(255,255,255,0.15)"
                    showInfo={false}
                    style={{ margin: '3px 0 0' }}
                  />
                </div>
              );
            })}
          </div>
        );

        return (
          <Tooltip title={tooltipContent} placement="left" overlayStyle={{ maxWidth: 280 }}>
            <div style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <Text strong style={{ fontSize: 12 }}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
                {allOk
                  ? <Tag color="green" style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px', margin: 0 }}>✓ All in stock</Tag>
                  : <Tag color="red" style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px', margin: 0 }}>⚠ {shortItems.length} short</Tag>
                }
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {items.slice(0, 2).map((item, i) => {
                  const isShort = item.available_stock < item.quantity_requested;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: isShort ? '#ff4d4f' : '#52c41a',
                      }} />
                      <Text style={{ fontSize: 12, color: '#4b5563' }} ellipsis={{ tooltip: item.item_name }}>
                        {item.item_name}
                      </Text>
                    </div>
                  );
                })}
                {items.length > 2 && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>+{items.length - 2} more</Text>
                )}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 140,
      render: (v) => v
        ? <Text style={{ fontSize: 12, color: '#374151' }}>{v}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Requested By',
      dataIndex: 'requested_by_name',
      key: 'requested_by_name',
      width: 150,
      render: (v) => v ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size={26}
            style={{ background: getAvatarColor(v), fontSize: 11, fontWeight: 600, flexShrink: 0 }}
          >
            {v.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
          </Avatar>
          <Text style={{ fontSize: 12 }}>{v}</Text>
        </div>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (s, record) => {
        const hasShortage = record.items?.some(i => i.status === 'pending' && i.available_stock < i.quantity_requested);
        return (
          <div>
            <Tag color={getStatusColor(s)} style={{ fontWeight: 500 }}>{getStatusLabel(s)}</Tag>
            {s === 'pending' && hasShortage && (
              <div style={{ marginTop: 4 }}>
                <Tag color="red" style={{ fontSize: 10, padding: '0 5px' }}>
                  <WarningOutlined style={{ marginRight: 2 }} />Stock Issues
                </Tag>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const isPending = record.status === 'pending';
        const needsIssue = record.status === 'approved' && record.items?.some(i => i.status === 'approved' && i.quantity_issued < i.quantity_approved);
        if (isPending) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/material-requests/${record.id}`); }}
              style={{ borderRadius: 6 }}
            >
              Review
            </Button>
          );
        }
        if (needsIssue) {
          return (
            <Button
              size="small"
              icon={<SendOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/material-requests/${record.id}`); }}
              style={{ borderRadius: 6, borderColor: '#1677ff', color: '#1677ff' }}
            >
              Issue
            </Button>
          );
        }
        return (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => { e.stopPropagation(); router.push(`/material-requests/${record.id}`); }}
            style={{ borderRadius: 6 }}
          >
            View
          </Button>
        );
      },
    },
  ];

  const expandedRowRender = (record: MaterialRequest) => {
    const itemColumns: ColumnsType<MaterialRequestItem> = [
      {
        title: 'Material',
        key: 'product',
        render: (_, item) => (
          <div>
            <Text strong style={{ fontSize: 12 }}>{item.item_name}</Text>
            {item.raw_material_code && <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{item.raw_material_code}</div>}
          </div>
        ),
      },
      {
        title: 'Required Qty',
        dataIndex: 'quantity_requested',
        width: 110,
        align: 'center',
        render: (q: number, item: MaterialRequestItem) => (
          <Text strong style={{ fontSize: 12 }}>{q} {item.unit_of_measure || ''}</Text>
        ),
      },
      {
        title: 'Available Stock',
        dataIndex: 'available_stock',
        width: 130,
        align: 'center',
        render: (stock: number, item: MaterialRequestItem) => {
          const isShort = stock < item.quantity_requested;
          return (
            <div>
              <Text type={isShort ? 'danger' : 'success'} strong style={{ fontSize: 12 }}>{stock} {item.unit_of_measure || ''}</Text>
              {isShort && <div style={{ fontSize: 10, color: '#ef4444' }}>Short by {item.quantity_requested - stock}</div>}
            </div>
          );
        },
      },
      {
        title: 'Stock Status',
        key: 'stock_status',
        width: 110,
        align: 'center',
        render: (_: unknown, item: MaterialRequestItem) => {
          const isAvailable = item.available_stock >= item.quantity_requested;
          return isAvailable
            ? <Tag color="green" style={{ fontWeight: 500 }}>Available</Tag>
            : <Tag color="red" style={{ fontWeight: 500 }}><WarningOutlined /> Shortage</Tag>;
        },
      },
      {
        title: 'Approved',
        dataIndex: 'quantity_approved',
        width: 90,
        align: 'center',
        render: (q: number) => q > 0
          ? <Text strong style={{ color: '#16a34a', fontSize: 12 }}>{q}</Text>
          : <Text type="secondary">—</Text>,
      },
      {
        title: 'Issued',
        dataIndex: 'quantity_issued',
        width: 90,
        align: 'center',
        render: (q: number) => q > 0
          ? <Text strong style={{ color: '#1677ff', fontSize: 12 }}>{q}</Text>
          : <Text type="secondary">—</Text>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 100,
        align: 'center',
        render: (s: string) => <Tag color={ITEM_STATUS_COLORS[s] || 'default'} style={{ fontWeight: 500, fontSize: 11 }}>{s?.toUpperCase()}</Tag>,
      },
      {
        title: 'Notes',
        dataIndex: 'notes',
        width: 160,
        render: (notes: string) => notes
          ? <Text type="secondary" style={{ fontSize: 11 }}>{notes}</Text>
          : <Text type="secondary">—</Text>,
      },
    ];

    return (
      <div style={{ padding: '8px 0 8px 40px', background: '#fafafa' }}>
        <Table
          columns={itemColumns}
          dataSource={record.items || []}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
          rowClassName={(item) =>
            item.status === 'rejected' ? 'bg-red-50' :
            item.status === 'approved' ? 'bg-green-50' :
            item.available_stock < item.quantity_requested ? 'bg-yellow-50' : ''
          }
        />
      </div>
    );
  };

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#111827' }}>Material Requests</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Review requests from manufacturing, verify stock availability, and approve or issue materials
          </Text>
        </div>
        <ExportDropdown
          data={filteredData || []}
          disabled={!filteredData?.length}
          filename="material-requests"
          title="Material Requests"
          columns={[
            { key: 'request_number', title: 'Request #' },
            { key: 'request_date', title: 'Date' },
            { key: 'purpose', title: 'Purpose' },
            { key: 'requested_by_name', title: 'Requested By' },
            { key: 'status', title: 'Status' },
          ]}
        />
      </div>

      {/* Summary Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((card) => (
          <Col xs={12} sm={6} key={card.title}>
            <Card
              hoverable
              onClick={() => setActiveTab(card.tab)}
              styles={{ body: { padding: '16px 20px' } }}
              style={{
                borderRadius: 10,
                cursor: 'pointer',
                borderTop: `3px solid ${card.color}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: card.value > 0 ? card.color : '#9ca3af', lineHeight: 1 }}>
                    {card.value}
                  </div>
                  {card.badge && card.value > 0 && (
                    <Tag color="red" style={{ fontSize: 10, marginTop: 6, padding: '0 5px' }}>{card.badge}</Tag>
                  )}
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: card.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.color,
                }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Alerts */}
      {counts.mfgPending.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 12, borderRadius: 8 }}
          message={
            <span style={{ fontSize: 13 }}>
              <strong>{counts.mfgPending.length}</strong> manufacturing request{counts.mfgPending.length > 1 ? 's' : ''} pending your approval —
              the manufacturing team cannot proceed until reviewed.
            </span>
          }
          action={
            <Button size="small" type="primary" onClick={() => setActiveTab('manufacturing')}>
              Review Now
            </Button>
          }
        />
      )}
      {counts.readyToIssue.length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<InboxOutlined />}
          style={{ marginBottom: 12, borderRadius: 8 }}
          message={
            <span style={{ fontSize: 13 }}>
              <strong>{counts.readyToIssue.length}</strong> approved request{counts.readyToIssue.length > 1 ? 's' : ''} ready for material issuance
            </span>
          }
        />
      )}

      {/* Main Card */}
      <Card
        style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Tabs */}
        <div style={{ padding: '0 20px', borderBottom: '1px solid #f0f0f0' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as TabKey)}
            style={{ marginBottom: 0 }}
            items={[
              {
                key: 'all',
                label: (
                  <span style={{ fontSize: 13 }}>
                    <InboxOutlined style={{ marginRight: 5 }} />All Requests
                  </span>
                ),
              },
              {
                key: 'pending',
                label: (
                  <Badge count={counts.pending.length} size="small" offset={[6, 0]}>
                    <span style={{ fontSize: 13, paddingRight: counts.pending.length > 0 ? 10 : 0 }}>
                      <ClockCircleOutlined style={{ marginRight: 5 }} />Pending
                    </span>
                  </Badge>
                ),
              },
              {
                key: 'manufacturing',
                label: (
                  <Badge count={counts.mfgPending.length} size="small" offset={[6, 0]} color="purple">
                    <span style={{ fontSize: 13, paddingRight: counts.mfgPending.length > 0 ? 10 : 0 }}>
                      <ToolOutlined style={{ marginRight: 5 }} />Manufacturing
                    </span>
                  </Badge>
                ),
              },
              {
                key: 'approved',
                label: (
                  <span style={{ fontSize: 13 }}>
                    <CheckCircleOutlined style={{ marginRight: 5 }} />Approved
                  </span>
                ),
              },
              {
                key: 'fulfilled',
                label: (
                  <span style={{ fontSize: 13 }}>
                    <SendOutlined style={{ marginRight: 5 }} />Fulfilled
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Filter Bar */}
        <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderBottom: '1px solid #f5f5f5', background: '#fafafa' }}>
          <Input
            placeholder="Search by request #, requester, purpose…"
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280, borderRadius: 7 }}
          />
          <Select
            placeholder="Filter by status"
            value={status}
            onChange={(v) => setStatus(v)}
            style={{ width: 190, borderRadius: 7 }}
            allowClear
            suffixIcon={<FilterOutlined style={{ color: '#9ca3af' }} />}
          >
            {MR_STATUS_OPTIONS.map((s) => (
              <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
            ))}
          </Select>
          {(status || search) && (
            <Button
              icon={<ClearOutlined />}
              size="small"
              onClick={() => { setStatus(undefined); setSearch(''); }}
              type="link"
              style={{ padding: 0, color: '#6b7280' }}
            >
              Clear filters
            </Button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filteredData.length} request{filteredData.length !== 1 ? 's' : ''}
            </Text>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '0 0 4px' }}>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={isLoading}
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => (record.items?.length || 0) > 0,
            }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} requests`,
              style: { padding: '12px 20px' },
            }}
            onRow={(record) => ({
              onClick: () => router.push(`/material-requests/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            scroll={{ x: 1100 }}
            size="middle"
            rowClassName={(record) => {
              if (record.status === 'pending' && isManufacturingRequest(record)) return 'bg-purple-50';
              if (record.status === 'pending') return 'bg-orange-50';
              if (record.status === 'approved') return 'bg-green-50';
              return '';
            }}
            style={{ borderRadius: 0 }}
          />
        </div>
      </Card>
    </div>
  );
}
