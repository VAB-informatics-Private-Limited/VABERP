'use client';

import { useState } from 'react';
import {
  Table, Tag, Card, Button, Modal, Form, Input, Select, Space, Typography, message, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupplierList, createSupplier, updateSupplier, deleteSupplier } from '@/lib/api/suppliers';
import { SUPPLIER_STATUS_OPTIONS } from '@/types/supplier';
import type { Supplier } from '@/types/supplier';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';
import { usePermissions } from '@/stores/authStore';

const { Title } = Typography;

export default function SuppliersPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page],
    queryFn: () => getSupplierList({ page, pageSize: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => createSupplier(values),
    onSuccess: () => {
      message.success('Supplier created');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: any }) => updateSupplier(id, values),
    onSuccess: () => {
      message.success('Supplier updated');
      setModalOpen(false);
      setEditingSupplier(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => {
      message.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const columns = [
    {
      title: 'Code',
      dataIndex: 'supplier_code',
      key: 'code',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Supplier Name',
      dataIndex: 'supplier_name',
      key: 'name',
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: 'Contact Person',
      dataIndex: 'contact_person',
      key: 'contact',
      render: (text: string) => text || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => text || '-',
    },
    {
      title: 'GST',
      dataIndex: 'gst_number',
      key: 'gst',
      render: (text: string) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const opt = SUPPLIER_STATUS_OPTIONS.find((o) => o.value === status);
        return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_date',
      key: 'created',
      render: (text: string) => text ? dayjs(text).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Supplier) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSupplier(record);
              form.setFieldsValue({
                supplierName: record.supplier_name,
                contactPerson: record.contact_person,
                phone: record.phone,
                email: record.email,
                address: record.address,
                gstNumber: record.gst_number,
                paymentTerms: record.payment_terms,
                status: record.status,
                notes: record.notes,
              });
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title="Delete this supplier?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Suppliers</Title>
        <Space>
          <ExportDropdown
            data={data?.data || []}
            disabled={!data?.data?.length}
            filename="suppliers"
            title="Suppliers"
            columns={[{ key: 'supplier_code', title: 'Code' }, { key: 'supplier_name', title: 'Supplier Name' }, { key: 'contact_person', title: 'Contact' }, { key: 'phone', title: 'Phone' }, { key: 'email', title: 'Email' }, { key: 'gst_number', title: 'GST' }, { key: 'status', title: 'Status' }]}
          />
          {hasPermission('procurement', 'create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingSupplier(null); form.resetFields(); setModalOpen(true); }}
            >
              Add Supplier
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.totalRecords || 0,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      <Modal
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingSupplier(null); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="supplierName" label="Supplier Name" rules={[{ required: true, message: 'Required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactPerson" label="Contact Person">
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="gstNumber" label="GST Number">
              <Input />
            </Form.Item>
            <Form.Item name="paymentTerms" label="Payment Terms">
              <Input placeholder="e.g. Net 30" />
            </Form.Item>
          </div>
          {editingSupplier && (
            <Form.Item name="status" label="Status">
              <Select options={SUPPLIER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
