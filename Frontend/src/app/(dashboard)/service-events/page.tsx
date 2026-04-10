'use client';

import { useState } from 'react';
import {
  Typography,
  Card,
  Table,
  Tag,
  Button,
  Select,
  DatePicker,
  Row,
  Col,
  Tooltip,
  message,
  Modal,
  Form,
  InputNumber,
  Input,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServiceEvents } from '@/lib/api/service-events';
import { createServiceBooking } from '@/lib/api/service-bookings';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ServiceEvent } from '@/types/service-event';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  reminded: 'orange',
  booked: 'blue',
  completed: 'green',
  expired: 'red',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  free_service: 'Free Service',
  paid_service: 'Paid Service',
  amc_reminder: 'AMC Reminder',
  warranty_expiry: 'Warranty Expiry',
};

export default function ServiceEventsPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [eventType, setEventType] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [bookingModal, setBookingModal] = useState<ServiceEvent | null>(null);
  const [bookingForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['service-events', page, status, eventType, dateRange],
    queryFn: () =>
      getServiceEvents({
        page,
        limit: 20,
        status,
        eventType,
        fromDate: dateRange?.[0],
        toDate: dateRange?.[1],
      }),
    enabled: !!enterpriseId,
  });

  const bookingMutation = useMutation({
    mutationFn: createServiceBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-events'] });
      queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
      setBookingModal(null);
      bookingForm.resetFields();
      message.success('Booking created');
    },
    onError: () => message.error('Failed to create booking'),
  });

  const isOverdue = (ev: ServiceEvent) =>
    (ev.status === 'pending' || ev.status === 'reminded') && dayjs(ev.due_date).isBefore(dayjs(), 'day');

  const columns = [
    {
      title: 'Event',
      key: 'event',
      render: (_: any, ev: ServiceEvent) => (
        <div>
          <div className="font-medium">{ev.title}</div>
          <Tag color={STATUS_COLORS[ev.status]} className="text-xs mt-1">{ev.status}</Tag>
          {isOverdue(ev) && <Tag color="red" className="text-xs">Overdue</Tag>}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'event_type',
      key: 'event_type',
      render: (v: string) => <Tag>{EVENT_TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, ev: ServiceEvent) => (
        <div>
          <div>{ev.service_product?.customer_name || '—'}</div>
          <div className="text-xs text-gray-400">{ev.service_product?.customer_mobile}</div>
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (v: string) => dayjs(v).format('DD MMM YYYY'),
    },
    {
      title: 'Reminders',
      dataIndex: 'reminder_count',
      key: 'reminder_count',
    },
    {
      title: 'Charge',
      dataIndex: 'price',
      key: 'price',
      render: (v: number | null) => (v != null && v > 0 ? `₹${v}` : <span className="text-gray-400">Free</span>),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, ev: ServiceEvent) => (
        <div className="flex gap-1 flex-wrap">
          <Tooltip title="View Product">
            <Button
              size="small"
              onClick={() => router.push(`/service-products/${ev.service_product_id}`)}
            >
              Product
            </Button>
          </Tooltip>
          {(ev.status === 'pending' || ev.status === 'reminded') &&
            hasPermission('service_management', 'service_bookings', 'create') && (
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  setBookingModal(ev);
                  bookingForm.setFieldsValue({
                    scheduledDate: dayjs(ev.due_date),
                    serviceCharge: ev.price ?? 0,
                  });
                }}
              >
                Book
              </Button>
            )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={4} className="!mb-0">Lifecycle Events</Title>
      </div>

      <Card className="mb-4">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={['pending', 'reminded', 'booked', 'completed', 'expired'].map((s) => ({ value: s, label: s }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Event Type"
              allowClear
              style={{ width: '100%' }}
              value={eventType}
              onChange={(v) => { setEventType(v); setPage(1); }}
              options={Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Col>
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(_, strs) => {
                setDateRange(strs[0] && strs[1] ? [strs[0], strs[1]] : null);
                setPage(1);
              }}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={data?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.totalRecords ?? 0,
            onChange: setPage,
            showTotal: (total) => `${total} events`,
          }}
        />
      </Card>

      <Modal
        title="Create Service Booking"
        open={!!bookingModal}
        onCancel={() => { setBookingModal(null); bookingForm.resetFields(); }}
        onOk={() => bookingForm.submit()}
        confirmLoading={bookingMutation.isPending}
        okText="Book"
      >
        <Form
          form={bookingForm}
          layout="vertical"
          onFinish={(values) => {
            if (!bookingModal) return;
            bookingMutation.mutate({
              serviceProductId: bookingModal.service_product_id,
              serviceEventId: bookingModal.id,
              scheduledDate: values.scheduledDate.format('YYYY-MM-DD'),
              scheduledSlot: values.scheduledSlot,
              serviceCharge: values.serviceCharge,
              notes: values.notes,
            });
          }}
        >
          <div className="mb-3 text-sm text-gray-500">
            Booking for: <strong>{bookingModal?.title}</strong> — {bookingModal?.service_product?.customer_name}
          </div>
          <Form.Item label="Scheduled Date" name="scheduledDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Time Slot" name="scheduledSlot">
            <Select
              placeholder="Select time slot"
              allowClear
              options={['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00'].map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
          <Form.Item label="Service Charge (₹)" name="serviceCharge" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
