'use client';

import { useState } from 'react';
import { Table, Tag, Card, Button, Typography, Tabs, Space, Progress, Tooltip } from 'antd';
import { EyeOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getAllRFQs } from '@/lib/api/rfqs';
import type { RfqListItem } from '@/lib/api/rfqs';
import dayjs from 'dayjs';

const { Title } = Typography;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
};

const VENDOR_STATUS_CONFIG: Record<string, { color: string }> = {
  pending: { color: 'orange' },
  responded: { color: 'green' },
  rejected: { color: 'red' },
};

export default function RfqQuotationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-quotations', page, pageSize, statusFilter],
    queryFn: () => getAllRFQs({ page, pageSize, status: statusFilter }),
  });

  const columns = [
    {
      title: 'RFQ #',
      dataIndex: 'rfq_number',
      key: 'rfq_number',
      render: (text: string, record: RfqListItem) => (
        <span
          className="font-medium text-blue-600 cursor-pointer hover:underline"
          onClick={() => router.push(`/procurement/rfq-quotations/${record.id}`)}
        >
          <FileTextOutlined className="mr-1" />
          {text}
        </span>
      ),
    },
    {
      title: 'Indent #',
      dataIndex: 'indent_number',
      key: 'indent_number',
      render: (text: string, record: RfqListItem) =>
        text ? (
          <Button
            type="link"
            size="small"
            className="!p-0"
            onClick={() => router.push(`/procurement/indents/${record.indent_id}`)}
          >
            {text}
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Vendors',
      key: 'vendors',
      render: (_: unknown, record: RfqListItem) => (
        <Space direction="vertical" size={2}>
          <Space size={4} wrap>
            {record.vendors.map((v) => (
              <Tooltip key={v.id} title={v.status}>
                <Tag color={VENDOR_STATUS_CONFIG[v.status]?.color || 'default'}>
                  {v.supplier_name || `Vendor #${v.id}`}
                </Tag>
              </Tooltip>
            ))}
          </Space>
          {record.vendor_count > 0 && (
            <div className="flex items-center gap-2">
              <Progress
                percent={Math.round((record.responded_count / record.vendor_count) * 100)}
                size="small"
                style={{ width: 120 }}
                format={() => `${record.responded_count}/${record.vendor_count} responded`}
              />
            </div>
          )}
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_date',
      key: 'created_date',
      render: (text: string) => (text ? dayjs(text).format('DD MMM YYYY') : '-'),
    },
    {
      title: 'Sent Date',
      dataIndex: 'sent_date',
      key: 'sent_date',
      render: (text: string) => (text ? dayjs(text).format('DD MMM YYYY') : <span className="text-gray-400">Not sent</span>),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: RfqListItem) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/procurement/rfq-quotations/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: 'All RFQs' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-0">RFQ Quotations</Title>
          <p className="text-gray-500 mt-1 text-sm">Manage all Request for Quotations sent to vendors</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TeamOutlined />
          <span>{data?.total || 0} total RFQs</span>
        </div>
      </div>

      <Card>
        <Tabs
          items={tabItems}
          onChange={(key) => {
            setStatusFilter(key === 'all' ? undefined : key);
            setPage(1);
          }}
          className="mb-4"
        />

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total) => `${total} RFQs`,
          }}
        />
      </Card>
    </div>
  );
}
