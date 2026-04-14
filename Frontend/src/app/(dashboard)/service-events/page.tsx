'use client';

import { useState, useEffect } from 'react';
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
  Alert,
  Tabs,
  Statistic,
  Badge,
} from 'antd';
import { WarningFilled, ClockCircleOutlined, CheckCircleOutlined, CalendarOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServiceEvents, assignServiceEvent, getEmployeesWithPermission, getServiceEventsPendingCount } from '@/lib/api/service-events';
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
  const { getEnterpriseId, userType } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [status, setStatus] = useState<string | undefined>();
  const [eventType, setEventType] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [bookingModal, setBookingModal] = useState<ServiceEvent | null>(null);
  const [bookingForm] = Form.useForm();
  const [assignModal, setAssignModal] = useState<ServiceEvent | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState<number | null>(null);
  const [pendingPopupOpen, setPendingPopupOpen] = useState(false);

  // Derive status from activeTab unless manual filter overrides
  const effectiveStatus = activeTab === 'followup'
    ? undefined  // we'll filter pending+reminded client-side via tabFilter
    : activeTab === 'booked'
    ? 'booked'
    : activeTab === 'overdue'
    ? undefined  // pending+reminded, filtered client-side
    : status;

  const { data, isLoading } = useQuery({
    queryKey: ['service-events', page, effectiveStatus, eventType, dateRange, activeTab],
    queryFn: () =>
      getServiceEvents({
        page,
        limit: 100,
        status: effectiveStatus,
        eventType,
        fromDate: dateRange?.[0],
        toDate: dateRange?.[1],
      }),
    enabled: !!enterpriseId,
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['service-events-pending-count'],
    queryFn: getServiceEventsPendingCount,
    enabled: !!enterpriseId,
  });

  // Show popup every time an employee visits this page while they have any pending/overdue/booked events
  useEffect(() => {
    if (
      userType === 'employee' &&
      pendingCount &&
      ((pendingCount.total ?? 0) > 0 || (pendingCount.booked ?? 0) > 0)
    ) {
      setPendingPopupOpen(true);
    }
  }, [pendingCount, userType]);

  const { data: afterSalesEmployees } = useQuery({
    queryKey: ['employees-with-service-permission'],
    queryFn: () => getEmployeesWithPermission('service_management'),
    enabled: !!enterpriseId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number | null }) =>
      assignServiceEvent(id, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-events'] });
      setAssignModal(null);
      setAssignEmployeeId(null);
      message.success('Assigned successfully');
    },
    onError: () => message.error('Failed to assign'),
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

  const needsFollowUp = (ev: ServiceEvent) =>
    (ev.status === 'pending' || ev.status === 'reminded') && !isOverdue(ev);

  // Filter rows based on active tab
  const allRows = data?.data ?? [];
  const displayRows = activeTab === 'followup'
    ? allRows.filter((ev) => ev.status === 'pending' || ev.status === 'reminded')
    : activeTab === 'overdue'
    ? allRows.filter((ev) => isOverdue(ev))
    : activeTab === 'booked'
    ? allRows.filter((ev) => ev.status === 'booked')
    : allRows;

  const overdueCount  = pendingCount?.overdue   ?? allRows.filter(isOverdue).length;
  const followUpCount = pendingCount?.upcoming  ?? allRows.filter((ev) => (ev.status === 'pending' || ev.status === 'reminded') && !isOverdue(ev)).length;
  const bookedCount   = pendingCount?.booked    ?? allRows.filter((ev) => ev.status === 'booked').length;

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
      title: 'Assigned To',
      key: 'assigned_to',
      render: (_: any, ev: ServiceEvent) => {
        const emp = ev.assigned_employee;
        if (emp) {
          return (
            <span className="text-sm font-medium text-blue-700">
              {emp.first_name} {emp.last_name}
            </span>
          );
        }
        return <span className="text-gray-400 text-xs">Unassigned</span>;
      },
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
          {hasPermission('service_management', 'service_events', 'edit') && (
            <Tooltip title={ev.assigned_to ? 'Reassign' : 'Assign'}>
              <Button
                size="small"
                onClick={() => {
                  setAssignModal(ev);
                  setAssignEmployeeId(ev.assigned_to ?? null);
                }}
              >
                {ev.assigned_to ? 'Reassign' : 'Assign'}
              </Button>
            </Tooltip>
          )}
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

      {/* KPI Summary Cards */}
      <Row gutter={16} className="mb-4">
        <Col xs={12} md={6}>
          <Card size="small" className="cursor-pointer border-red-200" onClick={() => { setActiveTab('overdue'); setPage(1); }}>
            <Statistic
              title={<span className="text-red-600 font-medium">Overdue</span>}
              value={pendingCount?.overdue ?? 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
              suffix={<span className="text-xs text-gray-400 ml-1">past due</span>}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="cursor-pointer border-orange-200" onClick={() => { setActiveTab('followup'); setPage(1); }}>
            <Statistic
              title={<span className="text-orange-600 font-medium">Needs Follow Up</span>}
              value={(pendingCount?.total ?? 0) - (pendingCount?.overdue ?? 0)}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
              suffix={<span className="text-xs text-gray-400 ml-1">pending</span>}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="cursor-pointer border-blue-200" onClick={() => { setActiveTab('booked'); setPage(1); }}>
            <Statistic
              title={<span className="text-blue-600 font-medium">Booked / Upcoming</span>}
              value={bookedCount}
              valueStyle={{ color: '#1677ff' }}
              prefix={<CalendarOutlined />}
              suffix={<span className="text-xs text-gray-400 ml-1">appointments</span>}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="cursor-pointer" onClick={() => { setActiveTab('all'); setPage(1); }}>
            <Statistic
              title="Total Events"
              value={data?.totalRecords ?? 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k); setPage(1); setStatus(undefined); }}
        className="mb-4"
        items={[
          { key: 'all', label: 'All Events' },
          {
            key: 'overdue',
            label: (
              <span>
                <ExclamationCircleOutlined className="text-red-500 mr-1" />
                Overdue
                {(pendingCount?.overdue ?? 0) > 0 && <Badge count={pendingCount!.overdue} style={{ marginLeft: 6, backgroundColor: '#ff4d4f' }} />}
              </span>
            ),
          },
          {
            key: 'followup',
            label: (
              <span>
                <ClockCircleOutlined className="text-orange-500 mr-1" />
                Needs Follow Up
                {((pendingCount?.total ?? 0) - (pendingCount?.overdue ?? 0)) > 0 && (
                  <Badge count={(pendingCount?.total ?? 0) - (pendingCount?.overdue ?? 0)} style={{ marginLeft: 6, backgroundColor: '#fa8c16' }} />
                )}
              </span>
            ),
          },
          {
            key: 'booked',
            label: (
              <span>
                <CalendarOutlined className="text-blue-500 mr-1" />
                Booked / Upcoming
                {bookedCount > 0 && <Badge count={bookedCount} style={{ marginLeft: 6, backgroundColor: '#1677ff' }} />}
              </span>
            ),
          },
        ]}
      />

      {/* Contextual alert for active tab */}
      {activeTab === 'overdue' && (pendingCount?.overdue ?? 0) > 0 && (
        <Alert type="error" showIcon icon={<WarningFilled />} className="mb-4"
          message={<span><strong>{pendingCount!.overdue} overdue event{pendingCount!.overdue > 1 ? 's' : ''}</strong> — customer was never contacted. Call them and book a service immediately.</span>}
        />
      )}
      {activeTab === 'followup' && (
        <Alert type="warning" showIcon className="mb-4"
          message="These events are upcoming and the customer has not yet booked. Call the customer and create a booking."
        />
      )}
      {activeTab === 'booked' && (
        <Alert type="info" showIcon icon={<CalendarOutlined />} className="mb-4"
          message="These events have a booking confirmed. Follow up with the customer closer to the service date to confirm the appointment."
        />
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Row gutter={[12, 12]}>
          {activeTab === 'all' && (
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
          )}
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
          dataSource={displayRows}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          rowClassName={(ev: ServiceEvent) => {
            if (isOverdue(ev)) return 'service-event-overdue-row';
            if (ev.status === 'booked') return 'service-event-booked-row';
            return '';
          }}
          pagination={{
            current: page,
            pageSize: 20,
            total: displayRows.length,
            onChange: setPage,
            showTotal: (total) => `${total} events`,
          }}
        />
      </Card>

      <style jsx global>{`
        .service-event-overdue-row {
          background-color: #fff1f0 !important;
        }
        .service-event-overdue-row:hover > td {
          background-color: #ffccc7 !important;
        }
        .service-event-overdue-row > td {
          border-bottom: 1px solid #ffccc7 !important;
        }
        .service-event-booked-row {
          background-color: #f0f7ff !important;
        }
        .service-event-booked-row:hover > td {
          background-color: #d6e8ff !important;
        }
        .service-event-booked-row > td {
          border-bottom: 1px solid #bae0ff !important;
        }
      `}</style>

      {/* Employee: pending events popup (once per session) */}
      <Modal
        open={pendingPopupOpen}
        onCancel={() => setPendingPopupOpen(false)}
        footer={[
          <Button key="view" type="primary" onClick={() => setPendingPopupOpen(false)}>
            View Events
          </Button>,
        ]}
        centered
        width={420}
        closable
      >
        <div className="flex flex-col items-center text-center py-4 gap-3">
          <WarningFilled style={{ fontSize: 48, color: '#faad14' }} />
          <div className="text-lg font-bold text-gray-800">Pending Service Events</div>
          <div className="text-gray-500 text-sm leading-relaxed">
            You have{' '}
            <strong className="text-red-600">{pendingCount?.overdue ?? 0} overdue</strong>
            {', '}
            <strong className="text-orange-500">{pendingCount?.upcoming ?? 0} upcoming</strong>
            {', and '}
            <strong className="text-blue-600">{pendingCount?.booked ?? 0} booked</strong>
            {' '}service events assigned to you that need attention.
          </div>
          {(pendingCount?.overdue ?? 0) > 0 && (
            <div className="mt-1 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs w-full">
              ⚠️ {pendingCount!.overdue} event{pendingCount!.overdue > 1 ? 's are' : ' is'} past the due date — please act immediately.
            </div>
          )}
          {(pendingCount?.booked ?? 0) > 0 && (
            <div className="mt-1 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs w-full">
              📅 {pendingCount!.booked} booked appointment{pendingCount!.booked > 1 ? 's' : ''} — follow up with the customer to confirm.
            </div>
          )}
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal
        title="Assign Service Event"
        open={!!assignModal}
        onCancel={() => { setAssignModal(null); setAssignEmployeeId(null); }}
        onOk={() => {
          if (!assignModal) return;
          assignMutation.mutate({ id: assignModal.id, employeeId: assignEmployeeId });
        }}
        confirmLoading={assignMutation.isPending}
        okText="Save Assignment"
      >
        <div className="mb-3 text-sm text-gray-500">
          Event: <strong>{assignModal?.title}</strong>
          {assignModal?.service_product?.customer_name && (
            <> — {assignModal.service_product.customer_name}</>
          )}
        </div>
        <Select
          showSearch
          allowClear
          placeholder="Select employee to assign"
          style={{ width: '100%' }}
          value={assignEmployeeId ?? undefined}
          onChange={(v) => setAssignEmployeeId(v ?? null)}
          optionFilterProp="label"
          options={(afterSalesEmployees ?? []).map((e: any) => ({
            value: e.id,
            label: `${e.first_name} ${e.last_name}${e.designation_name ? ` (${e.designation_name})` : ''}`,
          }))}
        />
        {assignEmployeeId && (
          <Button
            type="link"
            danger
            size="small"
            className="mt-2 px-0"
            onClick={() => setAssignEmployeeId(null)}
          >
            Clear assignment
          </Button>
        )}
      </Modal>

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
