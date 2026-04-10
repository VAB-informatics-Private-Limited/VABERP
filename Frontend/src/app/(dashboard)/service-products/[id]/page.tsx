'use client';

import { useState } from 'react';
import {
  Typography,
  Card,
  Descriptions,
  Tag,
  Table,
  Button,
  Select,
  message,
  Timeline,
  Row,
  Col,
  Modal,
  Form,
  DatePicker,
  Input,
  InputNumber,
  Space,
} from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServiceProduct, updateServiceProduct } from '@/lib/api/service-products';
import { getProductTypes } from '@/lib/api/product-types';
import { createServiceBooking } from '@/lib/api/service-bookings';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ServiceEvent } from '@/types/service-event';
import dayjs from 'dayjs';

const { Title } = Typography;

const EVENT_TYPE_COLORS: Record<string, string> = {
  free_service: 'green',
  paid_service: 'blue',
  amc_reminder: 'orange',
  warranty_expiry: 'red',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  reminded: 'orange',
  booked: 'blue',
  completed: 'green',
  expired: 'red',
};

export default function ServiceProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [bookingModal, setBookingModal] = useState<ServiceEvent | null>(null);
  const [bookingForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['service-product', id],
    queryFn: () => getServiceProduct(Number(id)),
  });

  const { data: ptData } = useQuery({
    queryKey: ['product-types'],
    queryFn: getProductTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateServiceProduct(Number(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-product', id] });
      message.success('Updated');
    },
  });

  const bookingMutation = useMutation({
    mutationFn: createServiceBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-product', id] });
      queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
      setBookingModal(null);
      bookingForm.resetFields();
      message.success('Booking created');
    },
    onError: () => message.error('Failed to create booking'),
  });

  const sp = data?.data;
  if (isLoading) return <div className="p-8">Loading…</div>;
  if (!sp) return <div className="p-8">Not found</div>;

  const events: ServiceEvent[] = sp.service_events ?? [];
  const sortedEvents = [...events].sort((a, b) => dayjs(a.due_date).diff(dayjs(b.due_date)));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={() => router.back()}>← Back</Button>
        <Title level={4} className="!mb-0">
          {sp.customer_name || 'Service Product'} — {sp.serial_number || `#${sp.id}`}
        </Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Product Details" className="mb-4">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Customer">{sp.customer_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{sp.customer_mobile || '—'}</Descriptions.Item>
              <Descriptions.Item label="Serial No.">{sp.serial_number || '—'}</Descriptions.Item>
              <Descriptions.Item label="Model">{sp.model_number || '—'}</Descriptions.Item>
              <Descriptions.Item label="Dispatch Date">
                {dayjs(sp.dispatch_date).format('DD MMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Warranty End">
                {sp.warranty_end_date ? dayjs(sp.warranty_end_date).format('DD MMM YYYY') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{sp.customer_address || '—'}</Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>{sp.notes || '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title="Product Type"
            extra={
              hasPermission('service_management', 'service_products', 'edit') && (
                <Select
                  placeholder="Assign type"
                  value={sp.product_type_id ?? undefined}
                  style={{ width: 180 }}
                  options={(ptData?.data ?? []).map((pt) => ({ value: pt.id, label: pt.name }))}
                  onChange={(v) => updateMutation.mutate({ productTypeId: v })}
                  allowClear
                />
              )
            }
          >
            {sp.product_type ? (
              <Descriptions size="small">
                <Descriptions.Item label="Name">{sp.product_type.name}</Descriptions.Item>
                <Descriptions.Item label="Warranty">{sp.product_type.warranty_months} months</Descriptions.Item>
                <Descriptions.Item label="Service Rules">{sp.product_type.service_rules?.length ?? 0} rules configured</Descriptions.Item>
              </Descriptions>
            ) : (
              <span className="text-gray-400">No product type assigned. Assign one to generate lifecycle events.</span>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Lifecycle Timeline">
            {sortedEvents.length === 0 ? (
              <div className="text-gray-400 text-center py-4">No lifecycle events generated yet.</div>
            ) : (
              <Timeline
                items={sortedEvents.map((ev) => ({
                  color: STATUS_COLORS[ev.status] === 'default' ? 'gray' : STATUS_COLORS[ev.status],
                  children: (
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{ev.title}</span>
                        <Tag color={EVENT_TYPE_COLORS[ev.event_type] ?? 'default'} className="text-xs">
                          {ev.event_type.replace('_', ' ')}
                        </Tag>
                        <Tag color={STATUS_COLORS[ev.status]} className="text-xs">
                          {ev.status}
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-400">
                        Due: {dayjs(ev.due_date).format('DD MMM YYYY')}
                        {ev.price != null && ` · ₹${ev.price}`}
                      </div>
                      {ev.status === 'pending' || ev.status === 'reminded' ? (
                        hasPermission('service_management', 'service_bookings', 'create') && (
                          <Button
                            size="small"
                            type="link"
                            className="p-0 h-auto text-xs"
                            onClick={() => {
                              setBookingModal(ev);
                              bookingForm.setFieldsValue({
                                scheduledDate: dayjs(ev.due_date),
                                serviceCharge: ev.price ?? 0,
                              });
                            }}
                          >
                            Book Service
                          </Button>
                        )
                      ) : null}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

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
            bookingMutation.mutate({
              serviceProductId: sp.id,
              serviceEventId: bookingModal?.id,
              scheduledDate: values.scheduledDate.format('YYYY-MM-DD'),
              scheduledSlot: values.scheduledSlot,
              serviceCharge: values.serviceCharge,
              notes: values.notes,
            });
          }}
        >
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
