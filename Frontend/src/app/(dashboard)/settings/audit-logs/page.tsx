'use client';

import { Typography, Card, Table, Button, Space, Select, DatePicker, Tag, Input } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getAuditLogs } from '@/lib/api/audit-logs';
import type { AuditLog } from '@/lib/api/audit-logs';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ENTITY_TYPES = [
  'enquiry', 'customer', 'quotation', 'invoice', 'payment',
  'sales_order', 'job_card', 'material_request', 'purchase_order',
  'source', 'interest_status', 'product', 'inventory',
];

const ACTION_TYPES = [
  'create', 'update', 'delete', 'status_change', 'convert',
  'payment', 'approve', 'issue', 'receive',
];

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  status_change: 'orange',
  convert: 'purple',
  payment: 'cyan',
  approve: 'lime',
  issue: 'gold',
  receive: 'geekblue',
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [entityType, setEntityType] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, pageSize, entityType, action, dateRange],
    queryFn: () => getAuditLogs({
      page,
      pageSize,
      entityType,
      action,
      fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
  });

  const handleClear = () => {
    setEntityType(undefined);
    setAction(undefined);
    setDateRange(null);
    setPage(1);
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Date',
      dataIndex: 'created_date',
      key: 'created_date',
      width: 180,
      render: (v) => v ? new Date(v).toLocaleString('en-IN') : '-',
    },
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (v) => v || 'System',
    },
    {
      title: 'Entity',
      dataIndex: 'entity_type',
      key: 'entity_type',
      render: (v) => <Tag>{v?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Entity ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 80,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (v) => <Tag color={ACTION_COLORS[v] || 'default'}>{v?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings')}>Back</Button>
          <Title level={4} className="!mb-0">Audit Logs</Title>
        </div>
        <ExportDropdown
          data={data?.data || []}
          disabled={!data?.data?.length}
          filename="audit-logs"
          title="Audit Logs"
          columns={[{ key: 'created_date', title: 'Date' }, { key: 'user_name', title: 'User' }, { key: 'entity_type', title: 'Entity' }, { key: 'entity_id', title: 'Entity ID' }, { key: 'action', title: 'Action' }, { key: 'description', title: 'Description' }]}
        />
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Select placeholder="Entity Type" value={entityType} onChange={(v) => { setEntityType(v); setPage(1); }} style={{ width: 180 }} allowClear>
            {ENTITY_TYPES.map((t) => <Select.Option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</Select.Option>)}
          </Select>
          <Select placeholder="Action" value={action} onChange={(v) => { setAction(v); setPage(1); }} style={{ width: 160 }} allowClear>
            {ACTION_TYPES.map((a) => <Select.Option key={a} value={a}>{a.replace('_', ' ').toUpperCase()}</Select.Option>)}
          </Select>
          <RangePicker value={dateRange} onChange={(dates) => { setDateRange(dates); setPage(1); }} format="DD-MM-YYYY" />
          <Button icon={<ClearOutlined />} onClick={handleClear}>Clear</Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalRecords || 0,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} logs`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
