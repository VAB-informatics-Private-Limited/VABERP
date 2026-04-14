'use client';

import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, Space, Card,
  Descriptions, Tabs, DatePicker, InputNumber, Row, Col, Rate, Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getMaintenanceVendors, getMaintenanceVendor, createMaintenanceVendor, updateMaintenanceVendor, deleteMaintenanceVendor,
  getAmcContracts, getExpiringAmcs, createAmcContract, terminateAmcContract,
  getMachines, MaintenanceVendor, AmcContract,
} from '@/lib/api/machinery';
import { message } from 'antd';

const { Search } = Input;
const { Option } = Select;

export default function MaintenanceVendorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [vendorModal, setVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<MaintenanceVendor | null>(null);
  const [amcModal, setAmcModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorForm] = Form.useForm();
  const [amcForm] = Form.useForm();

  const { data, isFetching } = useQuery({
    queryKey: ['maintenance-vendors', page, search],
    queryFn: () => getMaintenanceVendors({ page, limit: 20, search: search || undefined }),
  });

  const { data: expiringAmcs = [] } = useQuery({
    queryKey: ['expiring-amcs'],
    queryFn: () => getExpiringAmcs(30),
  });

  const { data: allAmcs = [] } = useQuery({
    queryKey: ['all-amcs'],
    queryFn: () => getAmcContracts(),
  });

  const { data: machinesData } = useQuery({
    queryKey: ['machines-dropdown'],
    queryFn: () => getMachines({ limit: 200 }),
    enabled: amcModal,
  });

  const createVendorMut = useMutation({
    mutationFn: createMaintenanceVendor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-vendors'] }); setVendorModal(false); vendorForm.resetFields(); message.success('Vendor created'); },
    onError: () => message.error('Failed to create vendor'),
  });

  const updateVendorMut = useMutation({
    mutationFn: ({ id, dto }: any) => updateMaintenanceVendor(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-vendors'] }); setVendorModal(false); setEditingVendor(null); vendorForm.resetFields(); message.success('Vendor updated'); },
    onError: () => message.error('Failed to update vendor'),
  });

  const deleteVendorMut = useMutation({
    mutationFn: deleteMaintenanceVendor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-vendors'] }); message.success('Vendor deleted'); },
    onError: () => message.error('Failed to delete vendor'),
  });

  const createAmcMut = useMutation({
    mutationFn: createAmcContract,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-amcs'] }); setAmcModal(false); amcForm.resetFields(); message.success('AMC contract created'); },
    onError: () => message.error('Failed to create AMC'),
  });

  const terminateAmcMut = useMutation({
    mutationFn: terminateAmcContract,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-amcs'] }); message.success('AMC terminated'); },
    onError: () => message.error('Failed to terminate AMC'),
  });

  const openVendorCreate = () => { setEditingVendor(null); vendorForm.resetFields(); setVendorModal(true); };
  const openVendorEdit = (v: MaintenanceVendor) => {
    setEditingVendor(v);
    vendorForm.setFieldsValue({
      ...v,
      vendor_code: v.vendor_code,
      gst_number: v.gst_number,
      service_categories: v.service_categories,
    });
    setVendorModal(true);
  };

  const onVendorSubmit = (values: any) => {
    const dto = {
      ...values,
      vendorCode: values.vendor_code,
      serviceCategories: values.service_categories,
      gstNumber: values.gst_number,
    };
    if (editingVendor) updateVendorMut.mutate({ id: editingVendor.id, dto });
    else createVendorMut.mutate(dto);
  };

  const onAmcSubmit = (values: any) => {
    createAmcMut.mutate({
      vendorId: selectedVendorId,
      machineId: values.machine_id,
      contractNumber: values.contract_number,
      startDate: values.start_date.format('YYYY-MM-DD'),
      endDate: values.end_date.format('YYYY-MM-DD'),
      contractValue: values.contract_value,
      coverageDetails: values.coverage_details,
      visitFrequencyDays: values.visit_frequency_days,
      maxVisitsIncluded: values.max_visits_included,
      notes: values.notes,
    });
  };

  const vendorColumns = [
    { title: 'Code', dataIndex: 'vendor_code', width: 100, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    { title: 'Company', dataIndex: 'company_name', render: (v: string, r: MaintenanceVendor) => <div><div className="font-medium">{v}</div><div className="text-xs text-gray-400">{r.contact_person}</div></div> },
    { title: 'Contact', render: (_: any, r: MaintenanceVendor) => <div><div>{r.phone}</div><div className="text-xs text-gray-400">{r.email}</div></div> },
    { title: 'Services', dataIndex: 'service_categories', render: (v: string[]) => v?.slice(0, 3).map(s => <Tag key={s} className="mr-1">{s}</Tag>) },
    { title: 'Rating', dataIndex: 'rating', render: (v?: number) => v ? <Rate disabled defaultValue={v} allowHalf count={5} style={{ fontSize: 14 }} /> : '—' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v?.toUpperCase()}</Tag> },
    {
      title: 'Actions', width: 120,
      render: (_: any, r: MaintenanceVendor) => (
        <Space size="small">
          <Tooltip title="Add AMC"><Button size="small" onClick={() => { setSelectedVendorId(r.id); amcForm.resetFields(); setAmcModal(true); }}>+AMC</Button></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openVendorEdit(r)} /></Tooltip>
          <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Delete vendor?', onOk: () => deleteVendorMut.mutate(r.id) })} /></Tooltip>
        </Space>
      ),
    },
  ];

  const amcColumns = [
    { title: 'Contract #', dataIndex: 'contract_number', render: (v?: string) => v ?? '—' },
    { title: 'Vendor', render: (_: any, r: AmcContract) => r.vendor?.company_name ?? `Vendor #${r.vendor_id}` },
    { title: 'Machine', render: (_: any, r: AmcContract) => r.machine?.name ?? (r.machine_id ? `Machine #${r.machine_id}` : 'All Machines') },
    { title: 'Valid Until', dataIndex: 'end_date', render: (v: string) => { const d = dayjs(v); const isExpiring = d.isBefore(dayjs().add(30, 'day')); return <span className={isExpiring ? 'text-orange-500 font-medium' : ''}>{d.format('DD MMM YYYY')}</span>; } },
    { title: 'Value', dataIndex: 'contract_value', render: (v?: number) => v ? `₹${Number(v).toLocaleString()}` : '—' },
    { title: 'Visit Interval', dataIndex: 'visit_frequency_days', render: (v?: number) => v ? `Every ${v} days` : '—' },
    { title: 'Visits (Used/Max)', render: (_: any, r: AmcContract) => r.max_visits_included ? `${r.visits_used ?? 0} / ${r.max_visits_included}` : '—' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'terminated' ? 'red' : 'default'}>{v?.toUpperCase()}</Tag> },
    { title: '', render: (_: any, r: AmcContract) => r.status === 'active' && <Button size="small" danger onClick={() => Modal.confirm({ title: 'Terminate AMC?', onOk: () => terminateAmcMut.mutate(r.id) })}>Terminate</Button> },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maintenance Vendors</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openVendorCreate}>Add Vendor</Button>
      </div>

      {expiringAmcs.length > 0 && (
        <Card className="mb-4 border-orange-300 bg-orange-50">
          <div className="flex items-center gap-2">
            <WarningOutlined className="text-orange-500" />
            <span className="font-medium text-orange-700">{expiringAmcs.length} AMC contract(s) expiring within 30 days</span>
          </div>
        </Card>
      )}

      <Tabs
        items={[
          {
            key: 'vendors',
            label: `Vendors (${data?.total ?? 0})`,
            children: (
              <div>
                <div className="mb-4">
                  <Search placeholder="Search vendors..." allowClear style={{ width: 280 }} onSearch={v => { setSearch(v); setPage(1); }} />
                </div>
                <Table dataSource={data?.data ?? []} columns={vendorColumns} rowKey="id" loading={isFetching}
                  pagination={{ total: data?.total ?? 0, current: page, pageSize: 20, onChange: setPage }} />
              </div>
            ),
          },
          {
            key: 'amc',
            label: `AMC Contracts (${allAmcs.length})`,
            children: <Table dataSource={allAmcs} columns={amcColumns} rowKey="id" pagination={{ pageSize: 20 }} />,
          },
        ]}
      />

      {/* Vendor Modal */}
      <Modal
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        open={vendorModal}
        onCancel={() => { setVendorModal(false); setEditingVendor(null); vendorForm.resetFields(); }}
        onOk={() => vendorForm.submit()}
        confirmLoading={createVendorMut.isPending || updateVendorMut.isPending}
        width={580}
      >
        <Form form={vendorForm} layout="vertical" onFinish={onVendorSubmit}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="vendor_code" label="Vendor Code" rules={[{ required: !editingVendor }]}><Input disabled={!!editingVendor} placeholder="e.g. VND-005" /></Form.Item></Col>
            <Col span={12}><Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="gst_number" label="GST Number"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="active">
                <Select><Option value="active">Active</Option><Option value="inactive">Inactive</Option><Option value="blacklisted">Blacklisted</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="rating" label="Rating (1–5)"><InputNumber style={{ width: '100%' }} min={1} max={5} step={0.1} /></Form.Item></Col>
            <Col span={24}><Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item></Col>
            <Col span={24}>
              <Form.Item name="service_categories" label="Service Categories">
                <Select mode="tags" placeholder="e.g. Hydraulics, Electrical, Mechanical" />
              </Form.Item>
            </Col>
            <Col span={24}><Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* AMC Modal */}
      <Modal
        title="Add AMC Contract"
        open={amcModal}
        onCancel={() => { setAmcModal(false); amcForm.resetFields(); }}
        onOk={() => amcForm.submit()}
        confirmLoading={createAmcMut.isPending}
        width={580}
      >
        <Form form={amcForm} layout="vertical" onFinish={onAmcSubmit}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="contract_number" label="Contract Number"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="machine_id" label="Machine">
                <Select allowClear showSearch optionFilterProp="children">
                  {machinesData?.data?.map((m: any) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="end_date" label="End Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="contract_value" label="Contract Value (₹)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name="visit_frequency_days" label="Visit Interval (Days)"><InputNumber style={{ width: '100%' }} min={1} placeholder="e.g. 90 for quarterly" /></Form.Item></Col>
            <Col span={12}><Form.Item name="max_visits_included" label="Max Visits Included"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={24}><Form.Item name="coverage_details" label="Coverage Details"><Input.TextArea rows={2} placeholder="e.g. Preventive maintenance, parts, labour" /></Form.Item></Col>
            <Col span={24}><Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
