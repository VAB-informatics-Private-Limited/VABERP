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
  Typography,
  Space,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getResellers, createReseller, updateResellerStatus } from '@/lib/api/super-admin';

const { Title, Text } = Typography;

interface Reseller {
  id: number;
  name: string;
  email: string;
  mobile: string;
  companyName: string | null;
  status: string;
  createdDate: string;
}

export default function ResellersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['resellers'], queryFn: getResellers });
  const resellers: Reseller[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createReseller,
    onSuccess: () => {
      message.success('Reseller created');
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to create reseller'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateResellerStatus(id, status),
    onSuccess: (_, vars) => {
      message.success(`Reseller ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to update status'),
  });

  const openCreate = useCallback(() => { form.resetFields(); setModalOpen(true); }, [form]);

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: any, r: Reseller) => (
        <div>
          <div className="font-medium">{r.name}</div>
          {r.companyName && <div className="text-xs text-slate-500">{r.companyName}</div>}
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Mobile', dataIndex: 'mobile', key: 'mobile' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Joined',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: Reseller) => (
        <Space>
          <Button size="small" onClick={() => router.push(`/superadmin/resellers/${r.id}`)}>
            View
          </Button>
          <Popconfirm
            title={r.status === 'active' ? 'Deactivate this reseller?' : 'Activate this reseller?'}
            onConfirm={() => statusMutation.mutate({ id: r.id, status: r.status === 'active' ? 'inactive' : 'active' })}
            okText="Yes"
          >
            <Button
              size="small"
              danger={r.status === 'active'}
              type={r.status !== 'active' ? 'primary' : 'default'}
            >
              {r.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UsergroupAddOutlined className="text-2xl text-slate-600" />
          <Title level={3} className="!mb-0">Resellers</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Reseller</Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={resellers}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          onRow={(r) => ({ onClick: (e) => { if ((e.target as HTMLElement).closest('button')) return; router.push(`/superadmin/resellers/${r.id}`); }, style: { cursor: 'pointer' } })}
        />
      </Card>

      <Modal
        title="Add Reseller"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)} className="mt-4">
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="mobile" label="Mobile" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="companyName" label="Company Name">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
