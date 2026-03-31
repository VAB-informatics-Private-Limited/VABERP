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

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: 'auth', label: 'Login' },
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'customer', label: 'Customer' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'payment', label: 'Payment' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'job_card', label: 'Job Card' },
  { value: 'material_request', label: 'Material Request' },
  { value: 'indent', label: 'Indent' },
  { value: 'employee', label: 'Employee' },
  { value: 'source', label: 'Source' },
  { value: 'interest_status', label: 'Interest Status' },
  { value: 'product', label: 'Product' },
  { value: 'inventory', label: 'Inventory' },
];

const ACTION_TYPES: { value: string; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'convert', label: 'Convert' },
  { value: 'payment', label: 'Payment' },
  { value: 'approve', label: 'Approve' },
  { value: 'issue', label: 'Issue' },
  { value: 'receive', label: 'Receive' },
  { value: 'release', label: 'Release' },
];

const ACTION_COLORS: Record<string, string> = {
  login: 'default',
  create: 'green',
  update: 'blue',
  delete: 'red',
  status_change: 'orange',
  convert: 'purple',
  payment: 'cyan',
  approve: 'lime',
  issue: 'gold',
  receive: 'geekblue',
  release: 'volcano',
};

const USER_TYPE_COLORS: Record<string, string> = {
  enterprise: 'blue',
  employee: 'green',
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [entityType, setEntityType] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [userName, setUserName] = useState<string | undefined>();
  const [userNameInput, setUserNameInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, pageSize, entityType, action, dateRange, userName],
    queryFn: () => getAuditLogs({
      page,
      pageSize,
      entityType,
      action,
      fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      userName,
    }),
  });

  const handleClear = () => {
    setEntityType(undefined);
    setAction(undefined);
    setDateRange(null);
    setUserName(undefined);
    setUserNameInput('');
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
      render: (v, record) => (
        <Space size={4}>
          <span>{v || 'System'}</span>
          {record.user_type && (
            <Tag color={USER_TYPE_COLORS[record.user_type.toLowerCase()] || 'default'} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
              {record.user_type.toUpperCase()}
            </Tag>
          )}
        </Space>
      ),
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
            {ENTITY_TYPES.map((t) => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}
          </Select>
          <Select placeholder="Action" value={action} onChange={(v) => { setAction(v); setPage(1); }} style={{ width: 160 }} allowClear>
            {ACTION_TYPES.map((a) => <Select.Option key={a.value} value={a.value}>{a.label}</Select.Option>)}
          </Select>
          <Input
            placeholder="Search by user name"
            prefix={<SearchOutlined />}
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            onPressEnter={() => { setUserName(userNameInput.trim() || undefined); setPage(1); }}
            onBlur={() => { setUserName(userNameInput.trim() || undefined); setPage(1); }}
            style={{ width: 200 }}
            allowClear
            onClear={() => { setUserName(undefined); setUserNameInput(''); setPage(1); }}
          />
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
          expandable={{
            rowExpandable: (record) => !!(record.old_values || record.new_values),
            expandedRowRender: (record) => (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {record.old_values && (
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <Tag color="red" style={{ marginBottom: 6 }}>Old Values</Tag>
                    <pre style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4, padding: 12, fontSize: 12, overflowX: 'auto', margin: 0 }}>
                      {JSON.stringify(record.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {record.new_values && (
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <Tag color="green" style={{ marginBottom: 6 }}>New Values</Tag>
                    <pre style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4, padding: 12, fontSize: 12, overflowX: 'auto', margin: 0 }}>
                      {JSON.stringify(record.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ),
          }}
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
