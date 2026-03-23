'use client';

import { useState } from 'react';
import { Typography, Card, Table, Button, Space, Input, Select, Tag, DatePicker } from 'antd';
import { ArrowLeftOutlined, ClearOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getRawMaterialLedger, getRawMaterialList } from '@/lib/api/raw-materials';
import { RawMaterialLedger, TRANSACTION_TYPE_COLORS } from '@/types/raw-material';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'purchase', label: 'Purchase', color: 'green' },
  { value: 'issue', label: 'Issue', color: 'red' },
  { value: 'return', label: 'Return', color: 'blue' },
  { value: 'adjustment', label: 'Adjustment', color: 'orange' },
];

export default function StockLedgerPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rawMaterialId, setRawMaterialId] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [filterKey, setFilterKey] = useState(0);

  const { data: materialsData } = useQuery({
    queryKey: ['raw-materials-dropdown'],
    queryFn: () => getRawMaterialList({ page: 1, pageSize: 500 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['raw-material-ledger', page, pageSize, rawMaterialId, typeFilter, dateRange],
    queryFn: () =>
      getRawMaterialLedger({
        page,
        pageSize,
        rawMaterialId,
        transactionType: typeFilter,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      }),
  });

  const handleClear = () => {
    setRawMaterialId(undefined);
    setTypeFilter(undefined);
    setDateRange(null);
    setPage(1);
    setFilterKey((k) => k + 1);
  };

  const columns: ColumnsType<RawMaterialLedger> = [
    {
      title: 'Date',
      dataIndex: 'created_date',
      key: 'created_date',
      width: 160,
      render: (date: string) => date ? dayjs(date).format('DD MMM YYYY, hh:mm A') : '-',
    },
    {
      title: 'Material',
      key: 'material',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.raw_material_name}</div>
          <div className="text-xs text-gray-400 font-mono">{record.raw_material_code}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      width: 130,
      render: (type: string) =>
        type ? (
          <Tag color={TRANSACTION_TYPE_COLORS[type] || 'default'} style={{ whiteSpace: 'nowrap' }}>
            {type.toUpperCase()}
          </Tag>
        ) : '-',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      align: 'right' as const,
      render: (qty: number, record) => (
        <span
          className={
            record.transaction_type === 'purchase' || record.transaction_type === 'return'
              ? 'text-green-600 font-semibold'
              : record.transaction_type === 'issue'
              ? 'text-red-600 font-semibold'
              : 'text-orange-500 font-semibold'
          }
        >
          {record.transaction_type === 'purchase' || record.transaction_type === 'return'
            ? '+'
            : record.transaction_type === 'issue'
            ? '-'
            : ''}
          {qty}
        </span>
      ),
    },
    {
      title: 'Before',
      dataIndex: 'previous_stock',
      key: 'previous_stock',
      width: 90,
      align: 'center',
    },
    {
      title: 'After',
      dataIndex: 'new_stock',
      key: 'new_stock',
      width: 90,
      align: 'center',
      render: (val: number) => <span className="font-semibold">{val}</span>,
    },
    {
      title: 'Reference',
      dataIndex: 'reference_type',
      key: 'reference_type',
      width: 120,
      render: (type: string) => type ? <Tag>{type}</Tag> : '-',
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/inventory')}>Back</Button>
          <Title level={4} className="!mb-0">Raw Material Ledger</Title>
        </div>
        <ExportDropdown
          data={data?.data || []}
          columns={[
            { key: 'created_date', title: 'Date' },
            { key: 'raw_material_name', title: 'Material' },
            { key: 'raw_material_code', title: 'Code' },
            { key: 'transaction_type', title: 'Type' },
            { key: 'quantity', title: 'Quantity' },
            { key: 'previous_stock', title: 'Stock Before' },
            { key: 'new_stock', title: 'Stock After' },
            { key: 'reference_type', title: 'Reference' },
            { key: 'remarks', title: 'Remarks' },
          ]}
          filename="raw-material-ledger"
          title="Raw Material Stock Ledger"
          disabled={!data?.data?.length}
        />
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap key={filterKey}>
          <Select
            placeholder="Filter by Material"
            value={rawMaterialId}
            onChange={(val) => { setRawMaterialId(val); setPage(1); }}
            style={{ width: 240 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {(materialsData?.data || []).map((m) => (
              <Select.Option key={m.id} value={m.id}>{m.material_code} - {m.material_name}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Transaction Type"
            value={typeFilter}
            onChange={(val) => { setTypeFilter(val); setPage(1); }}
            style={{ width: 150 }}
            allowClear
          >
            {TRANSACTION_TYPE_OPTIONS.map((t) => (
              <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => { setDateRange(dates); setPage(1); }}
            format="DD-MM-YYYY"
          />
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
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) { setPageSize(newPageSize); setPage(1); }
            },
          }}
          scroll={{ x: 1100 }}
          size="small"
        />
      </Card>
    </div>
  );
}
