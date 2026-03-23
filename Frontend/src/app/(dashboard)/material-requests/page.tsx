'use client';

import { Typography, Button, Card, Select, Space, Table, Tag, Alert, Badge, Tabs, Statistic, Row, Col, Tooltip } from 'antd';
import {
  ClearOutlined, EyeOutlined, ExclamationCircleOutlined, CheckCircleOutlined,
  FireOutlined, ToolOutlined, InboxOutlined, ClockCircleOutlined,
  WarningOutlined, SendOutlined,
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

type TabKey = 'all' | 'pending' | 'manufacturing' | 'approved' | 'fulfilled';

export default function MaterialRequestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['material-requests', page, pageSize, status],
    queryFn: () => getMaterialRequestList({ page, pageSize, status }),
  });

  const { data: priorityData } = useQuery({
    queryKey: ['priority-items'],
    queryFn: getPriorityItems,
    refetchInterval: 30000,
  });

  const urgentItems = (priorityData?.data || []).filter((p: any) => p.priority === 'urgent' || p.priority === 'high');
  const allRequests = data?.data || [];

  // Computed counts
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

  // Filter data by active tab
  const filteredData = useMemo(() => {
    switch (activeTab) {
      case 'pending': return allRequests.filter(r => r.status === 'pending');
      case 'manufacturing': return allRequests.filter(r => r.sales_order_id || r.purpose?.toLowerCase().includes('manufacturing'));
      case 'approved': return allRequests.filter(r => ['approved', 'partially_approved'].includes(r.status));
      case 'fulfilled': return allRequests.filter(r => r.status === 'fulfilled');
      default: return allRequests;
    }
  }, [allRequests, activeTab]);

  const getStatusColor = (s: string) => MR_STATUS_OPTIONS.find(o => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) => MR_STATUS_OPTIONS.find(o => o.value === s)?.label || s;

  const isManufacturingRequest = (r: MaterialRequest) => !!(r.sales_order_id || r.purpose?.toLowerCase().includes('manufacturing'));

  const columns: ColumnsType<MaterialRequest> = [
    {
      title: 'Request #',
      dataIndex: 'request_number',
      key: 'request_number',
      width: 140,
      render: (text, record) => (
        <div>
          <Text strong className="text-blue-600">{text}</Text>
          {record.job_card_name && (
            <div className="text-xs text-gray-600 font-medium mt-0.5">{record.job_card_name}</div>
          )}
          {isManufacturingRequest(record) && (
            <div><Tag color="purple" style={{ fontSize: 10 }} className="!mt-1"><ToolOutlined /> Manufacturing</Tag></div>
          )}
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'request_date',
      key: 'request_date',
      width: 110,
      render: (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
    },
    {
      title: 'Items & Stock Comparison',
      key: 'items_stock',
      render: (_, record) => {
        const items = record.items || [];
        if (items.length === 0) return <Text type="secondary">-</Text>;
        return (
          <div>
            {items.slice(0, 3).map((item, i) => {
              const isShort = item.available_stock < item.quantity_requested;
              return (
                <div key={i} className="py-0.5 flex items-center gap-2 flex-wrap">
                  <Text strong className="text-sm">{item.item_name}</Text>
                  <span className="text-xs text-gray-500">
                    Need: <strong>{item.quantity_requested}</strong>
                  </span>
                  <span className={`text-xs font-semibold ${isShort ? 'text-red-500' : 'text-green-600'}`}>
                    Stock: {item.available_stock}
                  </span>
                  {isShort && (
                    <Tag color="red" style={{ fontSize: 10 }} className="!m-0">
                      <WarningOutlined /> Short by {item.quantity_requested - item.available_stock}
                    </Tag>
                  )}
                  <Tag color={ITEM_STATUS_COLORS[item.status] || 'default'} style={{ fontSize: 10 }} className="!m-0">
                    {item.status?.toUpperCase()}
                  </Tag>
                </div>
              );
            })}
            {items.length > 3 && (
              <Text type="secondary" className="text-xs">+{items.length - 3} more items</Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 140,
      render: (v) => v || '-',
    },
    {
      title: 'Requested By',
      dataIndex: 'requested_by_name',
      key: 'requested_by_name',
      width: 130,
      render: (v) => v || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s, record) => {
        const hasShortage = record.items?.some(i => i.status === 'pending' && i.available_stock < i.quantity_requested);
        return (
          <div>
            <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>
            {s === 'pending' && hasShortage && (
              <div className="mt-1"><Tag color="red" style={{ fontSize: 10 }}><WarningOutlined /> Stock Issues</Tag></div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const isPending = record.status === 'pending';
        const needsIssue = record.status === 'approved' && record.items?.some(i => i.status === 'approved' && i.quantity_issued < i.quantity_approved);
        return (
          <Space direction="vertical" size={4}>
            {isPending ? (
              <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => router.push(`/material-requests/${record.id}`)}>
                Review
              </Button>
            ) : needsIssue ? (
              <Button size="small" icon={<SendOutlined />} className="border-blue-400 text-blue-600" onClick={() => router.push(`/material-requests/${record.id}`)}>
                Issue
              </Button>
            ) : (
              <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/material-requests/${record.id}`)}>
                View
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // Expandable row showing all items in detail with stock comparison
  const expandedRowRender = (record: MaterialRequest) => {
    const itemColumns: ColumnsType<MaterialRequestItem> = [
      {
        title: 'Material',
        key: 'product',
        render: (_, item) => (
          <div>
            <Text strong>{item.item_name}</Text>
            {item.raw_material_code && <div className="text-xs text-gray-400 font-mono">{item.raw_material_code}</div>}
          </div>
        ),
      },
      {
        title: 'Required Qty',
        dataIndex: 'quantity_requested',
        width: 110,
        align: 'center',
        render: (q: number, item: MaterialRequestItem) => <Text strong>{q} {item.unit_of_measure || ''}</Text>,
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
              <Text type={isShort ? 'danger' : 'success'} strong>{stock} {item.unit_of_measure || ''}</Text>
              {isShort && <div className="text-xs text-red-500">Short by {item.quantity_requested - stock}</div>}
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
            ? <Tag color="green">Available</Tag>
            : <Tag color="red"><WarningOutlined /> Shortage</Tag>;
        },
      },
      {
        title: 'Approved',
        dataIndex: 'quantity_approved',
        width: 100,
        align: 'center',
        render: (q: number) => q > 0 ? <Text strong className="text-green-600">{q}</Text> : <Text type="secondary">-</Text>,
      },
      {
        title: 'Issued',
        dataIndex: 'quantity_issued',
        width: 100,
        align: 'center',
        render: (q: number) => q > 0 ? <Text strong className="text-blue-600">{q}</Text> : <Text type="secondary">-</Text>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 110,
        align: 'center',
        render: (s: string) => <Tag color={ITEM_STATUS_COLORS[s] || 'default'}>{s?.toUpperCase()}</Tag>,
      },
      {
        title: 'Notes',
        dataIndex: 'notes',
        width: 150,
        render: (notes: string) => notes ? <Text type="secondary" className="text-xs">{notes}</Text> : '-',
      },
    ];

    return (
      <Table
        columns={itemColumns}
        dataSource={record.items || []}
        rowKey="id"
        pagination={false}
        size="small"
        className="bg-gray-50"
        rowClassName={(item) =>
          item.status === 'rejected' ? 'bg-red-50' :
          item.status === 'approved' ? 'bg-green-50' :
          item.available_stock < item.quantity_requested ? 'bg-yellow-50' : ''
        }
      />
    );
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <Title level={4} className="!mb-1">Inventory — Material Requests</Title>
          <Text type="secondary">Review material requests from manufacturing, verify stock availability, and approve or reject</Text>
        </div>
        <ExportDropdown
          data={filteredData || []}
          disabled={!filteredData?.length}
          filename="material-requests"
          title="Material Requests"
          columns={[{ key: 'request_number', title: 'Request #' }, { key: 'request_date', title: 'Date' }, { key: 'purpose', title: 'Purpose' }, { key: 'requested_by_name', title: 'Requested By' }, { key: 'status', title: 'Status' }]}
        />
      </div>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} className="mb-5">
        <Col xs={12} sm={6}>
          <Card className="card-shadow text-center" bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span className="text-xs font-semibold">Pending Approval</span>}
              value={counts.pending.length}
              valueStyle={{ color: counts.pending.length > 0 ? '#fa8c16' : '#8c8c8c', fontSize: 28 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow text-center" bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span className="text-xs font-semibold">From Manufacturing</span>}
              value={counts.mfgPending.length}
              valueStyle={{ color: counts.mfgPending.length > 0 ? '#722ed1' : '#8c8c8c', fontSize: 28 }}
              prefix={<ToolOutlined />}
              suffix={counts.mfgPending.length > 0 ? <Tag color="red" className="!text-xs">Action Required</Tag> : null}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow text-center" bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span className="text-xs font-semibold">Ready to Issue</span>}
              value={counts.readyToIssue.length}
              valueStyle={{ color: counts.readyToIssue.length > 0 ? '#1677ff' : '#8c8c8c', fontSize: 28 }}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow text-center" bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span className="text-xs font-semibold">Fulfilled</span>}
              value={counts.fulfilled.length}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>


      {/* Pending manufacturing requests alert */}
      {counts.mfgPending.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="mb-4"
          message={
            <span>
              <strong>{counts.mfgPending.length}</strong> manufacturing request{counts.mfgPending.length > 1 ? 's' : ''} waiting for your approval —
              Manufacturing team cannot proceed until you review
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
          className="mb-4"
          message={
            <span>
              <strong>{counts.readyToIssue.length}</strong> approved request{counts.readyToIssue.length > 1 ? 's' : ''} ready for material issuance
            </span>
          }
        />
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k as TabKey); setPage(1); }}
        className="mb-4"
        items={[
          { key: 'all', label: <span><InboxOutlined /> All Requests</span> },
          {
            key: 'pending',
            label: (
              <Badge count={counts.pending.length} size="small" offset={[8, 0]}>
                <span><ClockCircleOutlined /> Pending Approval</span>
              </Badge>
            ),
          },
          {
            key: 'manufacturing',
            label: (
              <Badge count={counts.mfgPending.length} size="small" offset={[8, 0]} color="purple">
                <span><ToolOutlined /> Manufacturing Requests</span>
              </Badge>
            ),
          },
          { key: 'approved', label: <span><CheckCircleOutlined /> Approved</span> },
          { key: 'fulfilled', label: <span><SendOutlined /> Fulfilled</span> },
        ]}
      />

      {/* Status filter */}
      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Select
            placeholder="Filter by status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            style={{ width: 200 }}
            allowClear
          >
            {MR_STATUS_OPTIONS.map((s) => (
              <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
            ))}
          </Select>
          {status && (
            <Button icon={<ClearOutlined />} onClick={() => { setStatus(undefined); setPage(1); }} type="link">Clear</Button>
          )}
          <Text type="secondary">{filteredData.length} request(s)</Text>
        </Space>
      </div>

      <Card className="card-shadow">
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
            current: page,
            pageSize,
            total: activeTab === 'all' ? (data?.totalRecords || 0) : filteredData.length,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          }}
          scroll={{ x: 1000 }}
          rowClassName={(record) => {
            if (record.status === 'pending' && isManufacturingRequest(record)) return 'bg-purple-50';
            if (record.status === 'pending') return 'bg-orange-50';
            if (record.status === 'approved') return 'bg-green-50';
            return '';
          }}
        />
      </Card>
    </div>
  );
}
