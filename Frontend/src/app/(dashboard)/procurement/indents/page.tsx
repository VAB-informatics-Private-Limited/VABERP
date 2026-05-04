'use client';

import { useState } from 'react';
import { Table, Tag, Card, Button, Typography, Space, Badge, Statistic, Row, Col } from 'antd';
import {
  EyeOutlined, FileTextOutlined, ShoppingCartOutlined, LinkOutlined,
  WarningOutlined, ClockCircleOutlined, CheckCircleOutlined,
  InboxOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getIndentList } from '@/lib/api/indents';
import { INDENT_STATUS_OPTIONS } from '@/types/indent';
import type { Indent, IndentPO } from '@/types/indent';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title, Text } = Typography;

export default function IndentsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [activeTab, setActiveTab] = useState<string>('all');

  const statusFilter = activeTab === 'all' ? undefined : activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ['indents', page, pageSize, statusFilter],
    queryFn: () => getIndentList({ page, pageSize, status: statusFilter }),
  });

  // Count queries for stat cards + tab badges
  const { data: pendingData } = useQuery({
    queryKey: ['indents-count-pending'],
    queryFn: () => getIndentList({ page: 1, pageSize: 1, status: 'pending' }),
    staleTime: 30000,
  });
  const { data: orderedData } = useQuery({
    queryKey: ['indents-count-ordered'],
    queryFn: () => getIndentList({ page: 1, pageSize: 1, status: 'fully_ordered' }),
    staleTime: 30000,
  });
  const { data: closedData } = useQuery({
    queryKey: ['indents-count-closed'],
    queryFn: () => getIndentList({ page: 1, pageSize: 1, status: 'closed' }),
    staleTime: 30000,
  });
  const { data: rejectedCountData } = useQuery({
    queryKey: ['indents-grn-rejected-count'],
    queryFn: () => getIndentList({ page: 1, pageSize: 1, status: 'grn_rejected' }),
    refetchInterval: 30000,
    staleTime: 0,
  });

  const pendingCount = pendingData?.totalRecords || 0;
  const orderedCount = orderedData?.totalRecords || 0;
  const closedCount = closedData?.totalRecords || 0;
  const rejectedCount = rejectedCountData?.totalRecords || 0;

  const columns = [
    {
      title: 'Indent',
      key: 'indent',
      width: 200,
      render: (_: unknown, record: Indent) => {
        const isInventory = record.source === 'inventory';
        const isReplacement = record.source === 'replacement' || record.is_replacement;
        return (
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-blue-600">
              <FileTextOutlined />
              {record.indent_number}
            </div>
            <div className="mt-1 flex gap-1 flex-wrap">
              {isReplacement ? (
                <Tag color="orange" style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>
                  🔄 Replacement
                </Tag>
              ) : (
                <Tag
                  color={isInventory ? 'purple' : 'blue'}
                  style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px' }}
                >
                  {isInventory ? 'Inventory Order' : 'Material Request'}
                </Tag>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {record.request_date ? dayjs(record.request_date).format('DD MMM YYYY') : '-'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'References',
      key: 'references',
      width: 180,
      render: (_: unknown, record: Indent) => (
        <Space direction="vertical" size={3}>
          {record.material_request_number ? (
            <Tag color="blue" icon={<LinkOutlined />} style={{ fontSize: 11 }}>
              {record.material_request_number}
            </Tag>
          ) : null}
          {record.order_number ? (
            <Tag color="purple" style={{ fontSize: 11 }}>
              SO: {record.order_number}
            </Tag>
          ) : null}
          {!record.material_request_number && !record.order_number && (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: Indent) => {
        const total = record.items?.length || 0;
        const pending = record.items?.filter((i) => i.status === 'pending').length || 0;
        const received = record.items?.filter((i) => i.received_quantity > 0).length || 0;
        return (
          <div className="text-center">
            <div className="font-semibold text-base">{total}</div>
            {pending > 0 && <div className="text-xs text-orange-500">{pending} pending</div>}
            {received > 0 && <div className="text-xs text-green-600">{received} received</div>}
          </div>
        );
      },
    },
    {
      title: 'Purchase Orders',
      key: 'purchase_orders',
      width: 180,
      render: (_: unknown, record: Indent) => {
        const pos = record.purchase_orders || [];
        if (pos.length === 0) return <span className="text-gray-400 text-sm">No PO yet</span>;
        return (
          <Space size={4} wrap>
            {pos.map((po: IndentPO) => (
              <Tag
                key={po.id}
                color={po.status === 'received' ? 'green' : po.status === 'approved' ? 'blue' : 'orange'}
                icon={<ShoppingCartOutlined />}
                style={{ cursor: 'pointer', fontSize: 11 }}
                onClick={(e) => { e.stopPropagation(); router.push(`/procurement/purchase-orders/${po.id}`); }}
              >
                {po.po_number}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'ETA',
      key: 'eta',
      width: 120,
      render: (_: unknown, record: Indent) => {
        const v = record.expected_delivery;
        if (!v) return <Text type="secondary" style={{ fontSize: 12 }}>Not set</Text>;
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        return (
          <div>
            <Text type={isOverdue ? 'danger' : undefined} style={{ fontSize: 12 }}>
              {dayjs(v).format('DD MMM YYYY')}
            </Text>
            {isOverdue && (
              <div style={{ fontSize: 10, color: '#ff4d4f', marginTop: 1 }}>
                <WarningOutlined /> Overdue
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Requested By',
      dataIndex: 'requested_by_name',
      key: 'requested_by',
      width: 130,
      render: (text: string) => (
        <Text style={{ fontSize: 12 }}>{text || <span className="text-gray-400">—</span>}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 160,
      render: (_: unknown, record: Indent) => {
        const opt = INDENT_STATUS_OPTIONS.find((o) => o.value === record.status);
        const hasRejected = record.items?.some(
          (i) => i.status === 'grn_rejected' ||
            (i.status === 'received' && i.received_quantity < i.shortage_quantity),
        );
        return (
          <Space direction="vertical" size={3}>
            <Tag color={opt?.color || 'default'} style={{ fontWeight: 500 }}>
              {opt?.label || record.status}
            </Tag>
            {hasRejected && (
              <Tag color="red" icon={<WarningOutlined />} style={{ fontSize: 11 }}>
                Items Rejected
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (_: unknown, record: Indent) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/procurement/indents/${record.id}`)}
        >
          View Indent
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          All
          {data?.totalRecords && activeTab === 'all' ? (
            <Badge count={data.totalRecords} showZero style={{ backgroundColor: '#8c8c8c', marginLeft: 6 }} />
          ) : null}
        </span>
      ),
    },
    {
      key: 'pending',
      label: (
        <span>
          Pending
          {pendingCount > 0 && (
            <Badge count={pendingCount} style={{ backgroundColor: '#fa8c16', marginLeft: 6 }} />
          )}
        </span>
      ),
    },
    { key: 'partially_ordered', label: 'Partially Ordered' },
    {
      key: 'fully_ordered',
      label: (
        <span>
          Fully Ordered
          {orderedCount > 0 && (
            <Badge count={orderedCount} style={{ backgroundColor: '#1677ff', marginLeft: 6 }} />
          )}
        </span>
      ),
    },
    {
      key: 'closed',
      label: (
        <span>
          Closed
          {closedCount > 0 && (
            <Badge count={closedCount} style={{ backgroundColor: '#52c41a', marginLeft: 6 }} />
          )}
        </span>
      ),
    },
    {
      key: 'grn_rejected',
      label: (
        <span className="flex items-center gap-1">
          <WarningOutlined style={{ color: '#ff4d4f' }} />
          GRN Rejected
          {rejectedCount > 0 && (
            <Badge count={rejectedCount} size="small" style={{ backgroundColor: '#ff4d4f', marginLeft: 4 }} />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Procurement Indents</Title>
        <ExportDropdown
          data={data?.data || []}
          disabled={!data?.data?.length}
          filename="indents"
          title="Procurement Indents"
          columns={[
            { key: 'indent_number', title: 'Indent #' },
            { key: 'material_request_number', title: 'MR Number' },
            { key: 'order_number', title: 'Sales Order' },
            { key: 'request_date', title: 'Date' },
            { key: 'requested_by_name', title: 'Requested By' },
            { key: 'status', title: 'Status' },
          ]}
        />
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card className="card-shadow" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#888' }}>Pending</span>}
              value={pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16', fontSize: 24, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#888' }}>Fully Ordered</span>}
              value={orderedCount}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1677ff', fontSize: 24, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#888' }}>Closed</span>}
              value={closedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#888' }}>GRN Rejected</span>}
              value={rejectedCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: rejectedCount > 0 ? '#ff4d4f' : '#52c41a', fontSize: 24, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table Card */}
      <Card className="card-shadow">
        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
          <Space size={0} style={{ display: 'flex', flexWrap: 'wrap' }}>
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? 'var(--color-primary)' : '#555',
                  borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {tab.label}
              </button>
            ))}
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 900 }}
          onRow={(record: Indent) => ({
            onClick: () => router.push(`/procurement/indents/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          rowClassName={(record: Indent) => {
            const hasRejection = record.items?.some(
              (i) => i.status === 'grn_rejected' ||
                (i.status === 'received' && i.received_quantity < i.shortage_quantity),
            );
            return hasRejection ? 'bg-red-50' : '';
          }}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalRecords || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total) => (
              <span style={{ fontSize: 12, color: '#888' }}>
                {total} indent{total !== 1 ? 's' : ''}
              </span>
            ),
          }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <InboxOutlined style={{ fontSize: 40, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
                <div style={{ color: '#888', fontSize: 14 }}>No indents found</div>
                {activeTab !== 'all' && (
                  <div style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>
                    Try switching to a different tab
                  </div>
                )}
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}
