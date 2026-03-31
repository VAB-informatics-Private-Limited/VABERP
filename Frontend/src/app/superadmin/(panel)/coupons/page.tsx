'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Typography,
  Space,
  Popconfirm,
  message,
  Badge,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TagOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/api/super-admin';

const { Title } = Typography;
const { Option } = Select;

interface Coupon {
  id: number;
  couponCode: string;
  discountType: string;
  discountValue: number;
  expiryDate: string;
  status: string;
  maxUses: number;
  usedCount: number;
  createdDate: string;
}

function getCouponStatusBadge(coupon: Coupon) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(coupon.expiryDate);
  if (expiry < today) return <Tag color="red">EXPIRED</Tag>;
  if (coupon.status !== 'active') return <Tag color="orange">INACTIVE</Tag>;
  return <Tag color="green">ACTIVE</Tag>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['coupons'], queryFn: getCoupons });
  const coupons: Coupon[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      message.success('Coupon created');
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeModal();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to create coupon'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => updateCoupon(id, body),
    onSuccess: () => {
      message.success('Coupon updated');
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeModal();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to update coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      message.success('Coupon deleted');
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Cannot delete coupon'),
  });

  const closeModal = () => { setModalOpen(false); form.resetFields(); setEditing(null); };

  const openCreate = useCallback(() => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback((item: Coupon) => {
    setEditing(item);
    form.setFieldsValue({
      discountType: item.discountType,
      discountValue: item.discountValue,
      expiryDate: dayjs(item.expiryDate),
      status: item.status,
      maxUses: item.maxUses,
    });
    setModalOpen(true);
  }, [form]);

  const handleSubmit = (values: any) => {
    const body = {
      ...values,
      expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
    };
    if (editing) {
      const { couponCode: _, ...rest } = body;
      updateMutation.mutate({ id: editing.id, body: rest });
    } else {
      createMutation.mutate(body);
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'couponCode',
      key: 'couponCode',
      render: (code: string) => <span className="font-mono font-semibold">{code}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'discountType',
      key: 'discountType',
      render: (t: string) => <Tag color={t === 'percentage' ? 'blue' : 'purple'}>{t.toUpperCase()}</Tag>,
    },
    {
      title: 'Value',
      key: 'discountValue',
      render: (_: any, r: Coupon) =>
        r.discountType === 'percentage' ? `${r.discountValue}%` : formatCurrency(Number(r.discountValue)),
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: Coupon) => getCouponStatusBadge(r),
    },
    {
      title: 'Uses',
      key: 'uses',
      render: (_: any, r: Coupon) => `${r.usedCount} / ${r.maxUses === 0 ? '∞' : r.maxUses}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Coupon) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm
            title="Delete this coupon?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TagOutlined className="text-2xl text-slate-600" />
          <Title level={3} className="!mb-0">Coupons</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Coupon</Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={coupons} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>

      <Modal
        title={editing ? 'Edit Coupon' : 'Create Coupon'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editing ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          {!editing && (
            <Form.Item
              name="couponCode"
              label="Coupon Code"
              rules={[{ required: true, message: 'Enter coupon code' }]}
            >
              <Input placeholder="e.g. SAVE20" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          )}
          <Form.Item name="discountType" label="Discount Type" rules={[{ required: !editing }]} initialValue="flat">
            <Select>
              <Option value="flat">Flat Amount</Option>
              <Option value="percentage">Percentage</Option>
            </Select>
          </Form.Item>
          <Form.Item name="discountValue" label="Discount Value" rules={[{ required: !editing }]}>
            <InputNumber min={0} className="w-full" placeholder="Enter value" />
          </Form.Item>
          <Form.Item name="expiryDate" label="Expiry Date" rules={[{ required: !editing }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="active">
            <Select>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Form.Item>
          <Form.Item name="maxUses" label="Max Uses (0 = unlimited)" initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
