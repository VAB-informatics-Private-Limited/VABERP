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
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Tooltip,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getServiceBookings,
  assignTechnician,
  completeBooking,
  cancelBooking,
} from '@/lib/api/service-bookings';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ServiceBooking } from '@/types/service-booking';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  confirmed: 'cyan',
  assigned: 'blue',
  in_progress: 'purple',
  completed: 'green',
  cancelled: 'red',
};

export default function ServiceBookingsPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [assignModal, setAssignModal] = useState<ServiceBooking | null>(null);
  const [completeModal, setCompleteModal] = useState<ServiceBooking | null>(null);
  const [assignForm] = Form.useForm();
  const [completeForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['service-bookings', page, status, dateRange],
    queryFn: () =>
      getServiceBookings({
        page,
        limit: 20,
        status,
        fromDate: dateRange?.[0],
        toDate: dateRange?.[1],
      }),
    enabled: !!enterpriseId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => assignTechnician(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
      setAssignModal(null);
      message.success('Technician assigned');
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => completeBooking(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
      setCompleteModal(null);
      message.success('Booking marked complete');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
      message.success('Booking cancelled');
    },
  });

  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, b: ServiceBooking) => (
        <div>
          <div className="font-medium">{b.service_product?.customer_name || '—'}</div>
          <div className="text-xs text-gray-400">{b.service_product?.customer_mobile}</div>
        </div>
      ),
    },
    {
      title: 'Event',
      key: 'event',
      render: (_: any, b: ServiceBooking) => b.service_event?.title || <span className="text-gray-400">Ad-hoc booking</span>,
    },
    {
      title: 'Scheduled',
      key: 'scheduled',
      render: (_: any, b: ServiceBooking) => (
        <div>
          <div>{dayjs(b.scheduled_date).format('DD MMM YYYY')}</div>
          {b.scheduled_slot && <div className="text-xs text-gray-400">{b.scheduled_slot}</div>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Technician',
      key: 'technician',
      render: (_: any, b: ServiceBooking) =>
        b.technician ? (b.technician as any).name || `#${b.technician_id}` : <span className="text-gray-400">Unassigned</span>,
    },
    {
      title: 'Charge',
      dataIndex: 'service_charge',
      key: 'service_charge',
      render: (v: number) => (v > 0 ? `₹${v}` : <span className="text-gray-400">Free</span>),
    },
    {
      title: 'Payment',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (v: string) => (
        <Tag color={v === 'paid' ? 'green' : v === 'waived' ? 'blue' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, b: ServiceBooking) => (
        <div className="flex gap-1 flex-wrap">
          <Button size="small" onClick={() => router.push(`/service-products/${b.service_product_id}`)}>
            View
          </Button>
          {b.status !== 'completed' && b.status !== 'cancelled' && (
            <>
              {!b.technician_id && hasPermission('service_management', 'service_bookings', 'edit') && (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => { setAssignModal(b); }}
                >
                  Assign
                </Button>
              )}
              {b.status !== 'cancelled' && hasPermission('service_management', 'service_bookings', 'edit') && (
                <Button
                  size="small"
                  onClick={() => { setCompleteModal(b); }}
                >
                  Complete
                </Button>
              )}
              {hasPermission('service_management', 'service_bookings', 'edit') && (
                <Tooltip title="Cancel booking">
                  <Button
                    size="small"
                    danger
                    onClick={() => {
                      Modal.confirm({
                        title: 'Cancel this booking?',
                        onOk: () => cancelMutation.mutate(b.id),
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </Tooltip>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={4} className="!mb-0">Service Bookings</Title>
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
              options={['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'].map((s) => ({
                value: s,
                label: s.replace('_', ' '),
              }))}
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
            showTotal: (total) => `${total} bookings`,
          }}
        />
      </Card>

      {/* Assign Technician Modal */}
      <Modal
        title="Assign Technician"
        open={!!assignModal}
        onCancel={() => setAssignModal(null)}
        onOk={() => assignForm.submit()}
        confirmLoading={assignMutation.isPending}
        okText="Assign"
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={(values) => {
            if (!assignModal) return;
            assignMutation.mutate({ id: assignModal.id, payload: values });
          }}
        >
          <Form.Item label="Technician ID" name="technicianId" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Employee ID of technician" />
          </Form.Item>
          <Form.Item label="Time Slot" name="scheduledSlot">
            <Select
              placeholder="Time slot"
              allowClear
              options={['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00'].map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Complete Booking Modal */}
      <Modal
        title="Complete Booking"
        open={!!completeModal}
        onCancel={() => setCompleteModal(null)}
        onOk={() => completeForm.submit()}
        confirmLoading={completeMutation.isPending}
        okText="Mark Complete"
      >
        <Form
          form={completeForm}
          layout="vertical"
          onFinish={(values) => {
            if (!completeModal) return;
            completeMutation.mutate({ id: completeModal.id, payload: values });
          }}
        >
          <Form.Item label="Completion Notes" name="completionNotes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Actual Service Charge (₹)" name="serviceCharge">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Payment Method" name="paymentMethod">
            <Select
              allowClear
              options={['cash', 'upi', 'card', 'neft'].map((m) => ({ value: m, label: m.toUpperCase() }))}
            />
          </Form.Item>
          <Form.Item label="Payment Status" name="paymentStatus">
            <Select
              options={[
                { value: 'paid', label: 'Paid' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'waived', label: 'Waived' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
