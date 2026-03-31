'use client';

import { useState } from 'react';
import { Card, Table, Tag, Typography, Spin, Button, Modal, Form, Input, Select, message, Alert } from 'antd';
import { TeamOutlined, PlusOutlined, CrownOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyTenants,
  getEnterprisePlansForReseller,
  getMyWallet,
  createTenant,
  assignPlanToTenant,
  renewTenantPlan,
} from '@/lib/api/reseller-client';

const { Title, Text } = Typography;

interface Tenant {
  id: number;
  businessName: string;
  email: string;
  mobile: string;
  status: string;
  expiryDate: string | null;
  planId: number | null;
  planName: string | null;
  subscriptionStartDate: string | null;
  createdDate: string;
}

interface Plan {
  id: number;
  name: string;
  durationDays: number;
  myPrice: number;
  businessPrice: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function ResellerTenantsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<{ id: number; name: string; mode: 'assign' | 'renew' } | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ businessName: string; email: string; tempPassword: string } | null>(null);
  const [createForm] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['my-tenants'], queryFn: getMyTenants });
  const { data: plansData } = useQuery({ queryKey: ['enterprise-plans-reseller'], queryFn: getEnterprisePlansForReseller });
  const { data: walletData } = useQuery({ queryKey: ['my-wallet'], queryFn: getMyWallet });

  const tenants: Tenant[] = data?.data ?? [];
  const plans: Plan[] = plansData?.data ?? [];
  const walletBalance: number = walletData?.data?.balance ?? 0;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const columns = [
    {
      title: 'Business',
      key: 'business',
      render: (_: any, r: Tenant) => (
        <div>
          <div className="font-medium">{r.businessName}</div>
          <div className="text-xs text-slate-500">{r.email}</div>
        </div>
      ),
    },
    { title: 'Mobile', dataIndex: 'mobile', key: 'mobile' },
    {
      title: 'Plan',
      dataIndex: 'planName',
      key: 'planName',
      render: (name: string | null) => name ? <span className="text-sm">{name}</span> : <span className="text-slate-400 text-sm">No plan</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : s === 'blocked' ? 'red' : 'orange'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d: string | null) => {
        if (!d) return <span className="text-slate-400">—</span>;
        const expiry = new Date(d);
        const today = new Date();
        return <span className={expiry < today ? 'text-red-600 font-medium' : ''}>{expiry.toLocaleDateString('en-IN')}</span>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: Tenant) => (
        <div className="flex gap-2">
          <Button
            size="small"
            icon={<CrownOutlined />}
            onClick={() => { setSelectedPlanId(r.planId); setAssignOpen({ id: r.id, name: r.businessName, mode: 'assign' }); }}
          >
            Assign Plan
          </Button>
          {r.planId && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => { setSelectedPlanId(r.planId); setAssignOpen({ id: r.id, name: r.businessName, mode: 'renew' }); }}
            >
              Renew
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = async (values: { businessName: string; email: string; mobile: string; planId: number }) => {
    setCreating(true);
    try {
      const res = await createTenant(values);
      setSuccessInfo(res.data.enterprise);
      createForm.resetFields();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignOrRenew = async () => {
    if (!assignOpen || !selectedPlanId) return;
    setAssigning(true);
    try {
      if (assignOpen.mode === 'renew') {
        await renewTenantPlan(assignOpen.id, selectedPlanId);
        message.success('Plan renewed successfully');
      } else {
        await assignPlanToTenant(assignOpen.id, selectedPlanId);
        message.success('Plan assigned successfully');
      }
      setAssignOpen(null);
      setSelectedPlanId(null);
      queryClient.invalidateQueries({ queryKey: ['my-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to process request');
    } finally {
      setAssigning(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TeamOutlined className="text-2xl text-slate-600" />
          <Title level={3} className="!mb-0">My Tenants</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Create Tenant
        </Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={tenants} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>

      {/* Create Tenant Modal */}
      <Modal
        title="Create New Tenant"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); setSelectedPlanId(null); }}
        footer={null}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} requiredMark={false}>
          <Form.Item label="Business Name" name="businessName" rules={[{ required: true }]}>
            <Input placeholder="Company name" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="contact@company.com" />
          </Form.Item>
          <Form.Item label="Mobile" name="mobile" rules={[{ required: true }]}>
            <Input placeholder="10-digit mobile number" />
          </Form.Item>
          <Form.Item label="Plan" name="planId" rules={[{ required: true, message: 'Please select a plan' }]}>
            <Select
              placeholder="Select a plan"
              onChange={(val) => setSelectedPlanId(val)}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} — ${formatCurrency(p.myPrice)} (${p.durationDays} days)`,
              }))}
            />
          </Form.Item>

          {selectedPlan && (
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Plan cost (from wallet):</span>
                <span className="font-semibold">{formatCurrency(selectedPlan.myPrice)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600">Your wallet balance:</span>
                <span className={walletBalance >= selectedPlan.myPrice ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {formatCurrency(walletBalance)}
                </span>
              </div>
              {walletBalance < selectedPlan.myPrice && (
                <Alert
                  type="error"
                  message={`Insufficient balance. Need ${formatCurrency(selectedPlan.myPrice - walletBalance)} more.`}
                  className="mt-2"
                  showIcon
                />
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button onClick={() => { setCreateOpen(false); createForm.resetFields(); }}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              disabled={!!(selectedPlan && walletBalance < selectedPlan.myPrice)}
            >
              Create Tenant
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Assign/Renew Modal */}
      <Modal
        title={assignOpen?.mode === 'renew' ? `Renew Plan — ${assignOpen?.name}` : `Assign Plan — ${assignOpen?.name}`}
        open={!!assignOpen}
        onCancel={() => { setAssignOpen(null); setSelectedPlanId(null); }}
        onOk={handleAssignOrRenew}
        okText={assignOpen?.mode === 'renew' ? 'Renew Plan' : 'Assign Plan'}
        confirmLoading={assigning}
        okButtonProps={{ disabled: !selectedPlanId || !!(selectedPlan && walletBalance < selectedPlan.myPrice) }}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Plan</label>
          <Select
            className="w-full"
            placeholder="Select a plan"
            value={selectedPlanId}
            onChange={setSelectedPlanId}
            options={plans.map((p) => ({
              value: p.id,
              label: `${p.name} — ${formatCurrency(p.myPrice)} (${p.durationDays} days)`,
            }))}
          />
        </div>

        {selectedPlan && (
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Cost:</span>
              <span className="font-semibold">{formatCurrency(selectedPlan.myPrice)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-600">Wallet balance:</span>
              <span className={walletBalance >= selectedPlan.myPrice ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {formatCurrency(walletBalance)}
              </span>
            </div>
            {walletBalance < selectedPlan.myPrice && (
              <Alert
                type="error"
                message="Insufficient wallet balance"
                className="mt-2"
                showIcon
              />
            )}
            {assignOpen?.mode === 'renew' && (
              <p className="text-xs text-slate-500 mt-2">Note: Renewal extends from the current expiry date (if still active).</p>
            )}
          </div>
        )}
      </Modal>

      {/* Success modal showing temp password */}
      <Modal
        title="Tenant Created Successfully"
        open={!!successInfo}
        onOk={() => setSuccessInfo(null)}
        onCancel={() => setSuccessInfo(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="Done"
      >
        {successInfo && (
          <div>
            <p className="mb-4 text-slate-600">The tenant account has been created. Share these credentials with the tenant:</p>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div><span className="text-slate-500 text-sm">Business:</span> <strong>{successInfo.businessName}</strong></div>
              <div><span className="text-slate-500 text-sm">Email:</span> <strong>{successInfo.email}</strong></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">Temp Password:</span>
                <strong className="font-mono bg-white border border-slate-200 px-2 py-0.5 rounded">{successInfo.tempPassword}</strong>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(successInfo.tempPassword);
                    message.success('Password copied!');
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Ask the tenant to change their password after first login.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
