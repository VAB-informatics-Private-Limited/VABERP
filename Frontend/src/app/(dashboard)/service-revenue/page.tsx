'use client';

import {
  Typography,
  Card,
  Table,
  Tag,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Space,
  Button,
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getRevenueSummary } from '@/lib/api/service-products';
import { getServiceBookings } from '@/lib/api/service-bookings';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'green',
  unpaid: 'orange',
  waived: 'blue',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'green',
  cancelled: 'red',
  pending: 'default',
  confirmed: 'blue',
  assigned: 'cyan',
  in_progress: 'processing',
};

export default function ServiceRevenuePage() {
  const { getEnterpriseId } = useAuthStore();
  const { hasPermission } = usePermissions();
  const enterpriseId = getEnterpriseId();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('completed');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['service-revenue-summary'],
    queryFn: getRevenueSummary,
    enabled: !!enterpriseId,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['service-bookings-revenue', page, statusFilter, dateRange],
    queryFn: () =>
      getServiceBookings({
        page,
        limit: 20,
        status: statusFilter || undefined,
        fromDate: dateRange[0]?.format('YYYY-MM-DD'),
        toDate: dateRange[1]?.format('YYYY-MM-DD'),
      }),
    enabled: !!enterpriseId,
  });

  const columns = [
    {
      title: 'Booking #',
      dataIndex: 'id',
      key: 'id',
      render: (v: number) => <Text className="font-mono">#{v}</Text>,
      width: 90,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, b: any) => (
        <div>
          <div className="font-medium text-sm">
            {b.service_product?.customerName ?? b.service_product?.customer_name ?? '—'}
          </div>
          <div className="text-xs text-gray-400">
            {b.service_product?.customerMobile ?? b.service_product?.customer_mobile ?? ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Service',
      key: 'service',
      render: (_: any, b: any) => (
        <div>
          <div className="text-sm">{b.service_event?.title ?? '—'}</div>
          <div className="text-xs text-gray-400">
            {b.service_product?.productType?.name ?? b.service_product?.product_type?.name ?? ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduled_date',
      key: 'scheduled_date',
      render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] ?? 'default'}>
          {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </Tag>
      ),
    },
    {
      title: 'Charge (₹)',
      dataIndex: 'service_charge',
      key: 'service_charge',
      render: (v: number) => (
        <Text className="font-semibold text-green-700">
          ₹{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
      align: 'right' as const,
    },
    {
      title: 'Payment',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (v: string, b: any) => (
        <div>
          <Tag color={PAYMENT_STATUS_COLORS[v] ?? 'default'}>
            {v.replace(/\b\w/g, (c) => c.toUpperCase())}
          </Tag>
          {b.payment_method && (
            <div className="text-xs text-gray-400 mt-0.5">{b.payment_method}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Technician',
      key: 'technician',
      render: (_: any, b: any) =>
        b.technician
          ? `${b.technician.firstName ?? b.technician.first_name ?? ''} ${b.technician.lastName ?? b.technician.last_name ?? ''}`.trim()
          : <Text type="secondary">—</Text>,
    },
  ];

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: summary?.totalRevenue ?? 0,
      prefix: '₹',
      icon: <DollarOutlined />,
      color: '#16a34a',
      bg: '#f0fdf4',
      formatter: (v: number | string) =>
        Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Registered Products',
      value: summary?.totalProducts ?? 0,
      icon: <AppstoreOutlined />,
      color: '#1677ff',
      bg: '#eff6ff',
    },
    {
      title: 'Completed Services',
      value: summary?.completedBookings ?? 0,
      icon: <CheckCircleOutlined />,
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      title: 'Pending Bookings',
      value: summary?.pendingBookings ?? 0,
      icon: <ClockCircleOutlined />,
      color: '#d97706',
      bg: '#fffbeb',
    },
    {
      title: 'Pending Reminders',
      value: summary?.pendingReminders ?? 0,
      icon: <BellOutlined />,
      color: '#dc2626',
      bg: '#fef2f2',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={4} className="!mb-0">Service Revenue</Title>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        {summaryCards.map((card) => (
          <Col key={card.title} xs={24} sm={12} md={8} lg={6} xl={5}>
            <Card
              loading={summaryLoading}
              style={{ borderRadius: 12, background: card.bg, border: 'none' }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{card.title}</div>
                  <div className="text-2xl font-bold" style={{ color: card.color }}>
                    {card.prefix ?? ''}
                    {card.formatter
                      ? card.formatter(card.value)
                      : Number(card.value).toLocaleString('en-IN')}
                  </div>
                </div>
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-xl"
                  style={{ color: card.color, background: '#fff' }}
                >
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card className="mb-4" bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            allowClear
            placeholder="All statuses"
            options={[
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(vals) => {
              setDateRange(vals ? [vals[0], vals[1]] : [null, null]);
              setPage(1);
            }}
            format="DD MMM YYYY"
          />
          <Button
            onClick={() => {
              setStatusFilter('completed');
              setDateRange([null, null]);
              setPage(1);
            }}
          >
            Reset
          </Button>
        </Space>
      </Card>

      {/* Bookings Table */}
      <Card>
        <Table
          dataSource={bookings?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={bookingsLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: bookings?.totalRecords ?? 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `${total} bookings`,
          }}
          scroll={{ x: 900 }}
          summary={(pageData) => {
            const pageTotal = pageData.reduce((sum, b) => sum + Number(b.service_charge ?? 0), 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <Text className="font-medium text-gray-500">Page Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text className="font-bold text-green-700">
                    ₹{pageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={2} />
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
}
