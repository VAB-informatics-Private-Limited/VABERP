'use client';
import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, InputNumber,
  DatePicker, Space, Card, Tabs, Row, Col, Rate, Tooltip, Alert, Result,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined, PlusCircleOutlined, LockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import dayjs from 'dayjs';
import {
  getWasteParties, createWasteParty, updateWasteParty, deleteWasteParty,
  getWastePartyRates, addWastePartyRate, getExpiringWasteCerts, getWasteCategories,
  WasteParty, WastePartyRate, WasteCategory,
} from '@/lib/api/waste';
import { message } from 'antd';

const { Search } = Input;
const { Option } = Select;

export default function WastePartiesPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canAccess = userType === 'enterprise' || hasPermission('waste_management', 'waste_parties', 'view');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>();
  const [partyModal, setPartyModal] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [editingParty, setEditingParty] = useState<WasteParty | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [partyForm] = Form.useForm();
  const [rateForm] = Form.useForm();

  const { data: partiesData, isFetching } = useQuery({
    queryKey: ['waste-parties', search, typeFilter],
    queryFn: () => getWasteParties({ search: search || undefined, partyType: typeFilter }),
  });

  const { data: expiringCerts = [] } = useQuery({
    queryKey: ['expiring-waste-certs'],
    queryFn: () => getExpiringWasteCerts(30),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['waste-categories'],
    queryFn: getWasteCategories,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['waste-party-rates', selectedPartyId],
    queryFn: () => getWastePartyRates(selectedPartyId!),
    enabled: !!selectedPartyId,
  });

  const createMut = useMutation({
    mutationFn: createWasteParty,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-parties'] }); setPartyModal(false); partyForm.resetFields(); message.success('Party created'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => updateWasteParty(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-parties'] }); setPartyModal(false); setEditingParty(null); message.success('Updated'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteWasteParty,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-parties'] }); message.success('Deactivated'); },
    onError: () => message.error('Failed'),
  });

  const addRateMut = useMutation({
    mutationFn: ({ partyId, dto }: any) => addWastePartyRate(partyId, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-party-rates'] }); setRateModal(false); rateForm.resetFields(); message.success('Rate added'); },
    onError: () => message.error('Failed'),
  });

  const openCreate = () => { setEditingParty(null); partyForm.resetFields(); setPartyModal(true); };
  const openEdit = (p: WasteParty) => {
    setEditingParty(p);
    partyForm.setFieldsValue({ ...p, cert_expiry_date: p.cert_expiry_date ? dayjs(p.cert_expiry_date) : undefined });
    setPartyModal(true);
  };

  const onPartySubmit = (v: any) => {
    const dto = {
      partyCode: v.party_code, companyName: v.company_name, partyType: v.party_type,
      contactPerson: v.contact_person, phone: v.phone, email: v.email, address: v.address,
      gstNumber: v.gst_number, pollutionBoardCert: v.pollution_board_cert,
      certExpiryDate: v.cert_expiry_date?.format('YYYY-MM-DD'),
      handlesHazardous: v.handles_hazardous, paymentTerms: v.payment_terms,
      rating: v.rating, notes: v.notes,
    };
    if (editingParty) updateMut.mutate({ id: editingParty.id, dto });
    else createMut.mutate(dto);
  };

  const columns = [
    { title: 'Code', dataIndex: 'party_code', width: 100, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    {
      title: 'Company',
      render: (_: any, r: WasteParty) => (
        <div>
          <div className="font-medium">{r.company_name}</div>
          <div className="text-xs text-gray-400">{r.contact_person}</div>
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'party_type', render: (v: string) => <Tag color={v === 'customer' ? 'green' : v === 'vendor' ? 'orange' : 'blue'}>{v?.toUpperCase()}</Tag> },
    { title: 'Contact', render: (_: any, r: WasteParty) => <div><div>{r.phone}</div><div className="text-xs text-gray-400">{r.email}</div></div> },
    {
      title: 'Hazardous',
      render: (_: any, r: WasteParty) => r.handles_hazardous ? (
        <div>
          <Tag color="red">Certified</Tag>
          {r.cert_expiry_date && <div className={`text-xs ${dayjs(r.cert_expiry_date).isBefore(dayjs().add(30, 'day')) ? 'text-red-500' : 'text-gray-400'}`}>Exp: {dayjs(r.cert_expiry_date).format('DD MMM YY')}</div>}
        </div>
      ) : <Tag>No</Tag>,
    },
    { title: 'Rating', dataIndex: 'rating', render: (v?: number) => v ? <Rate disabled value={v} allowHalf count={5} style={{ fontSize: 12 }} /> : '—' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'blacklisted' ? 'red' : 'default'}>{v?.toUpperCase()}</Tag> },
    {
      title: 'Actions', width: 140,
      render: (_: any, r: WasteParty) => (
        <Space size="small">
          <Tooltip title="Add Rate"><Button size="small" icon={<PlusCircleOutlined />} onClick={() => { setSelectedPartyId(r.id); rateForm.resetFields(); setRateModal(true); }}>Rate</Button></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Deactivate party?', onOk: () => deleteMut.mutate(r.id) })} /></Tooltip>
        </Space>
      ),
    },
  ];

  const rateColumns = [
    { title: 'Category', render: (_: any, r: WastePartyRate) => r.category?.name ?? `#${r.category_id}` },
    { title: 'Type', dataIndex: 'rate_type', render: (v: string) => <Tag color={v === 'buy_rate' ? 'green' : 'red'}>{v === 'buy_rate' ? 'Buy Rate' : 'Disposal Rate'}</Tag> },
    { title: 'Rate', render: (_: any, r: WastePartyRate) => `₹${Number(r.rate).toLocaleString()} / unit` },
    { title: 'Effective From', dataIndex: 'effective_from', render: (v: string) => dayjs(v).format('DD MMM YYYY') },
    { title: 'Effective To', dataIndex: 'effective_to', render: (v?: string) => v ? dayjs(v).format('DD MMM YYYY') : <Tag color="green">Active</Tag> },
  ];

  if (!canAccess) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to view Waste Parties." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Waste Vendors & Customers</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Party</Button>
      </div>

      {expiringCerts.length > 0 && (
        <Alert className="mb-4" type="warning" icon={<WarningOutlined />} showIcon
          message={`${expiringCerts.length} hazardous waste handler certification(s) expiring within 30 days`}
          description={expiringCerts.map(p => `${p.company_name} (expires ${dayjs(p.cert_expiry_date).format('DD MMM YYYY')})`).join(' · ')} />
      )}

      <Tabs items={[
        {
          key: 'parties', label: `All Parties (${partiesData?.total ?? 0})`,
          children: (
            <div>
              <div className="flex gap-3 mb-4">
                <Search placeholder="Search company, code..." allowClear style={{ width: 260 }} onSearch={v => setSearch(v)} />
                <Select placeholder="Type" allowClear style={{ width: 140 }} onChange={v => setTypeFilter(v)}>
                  <Option value="vendor">Vendor</Option><Option value="customer">Customer</Option><Option value="both">Both</Option>
                </Select>
              </div>
              <Table dataSource={partiesData?.data ?? []} columns={columns} rowKey="id" loading={isFetching} pagination={{ pageSize: 20 }} />
            </div>
          ),
        },
        {
          key: 'rates', label: 'Rate Cards',
          children: (
            <div>
              <div className="mb-4">
                <Select placeholder="Select party to view rates" style={{ width: 300 }} onChange={v => setSelectedPartyId(v)} showSearch optionFilterProp="children">
                  {(partiesData?.data ?? []).map((p: WasteParty) => <Option key={p.id} value={p.id}>{p.company_name}</Option>)}
                </Select>
              </div>
              {selectedPartyId && <Table dataSource={rates} columns={rateColumns} rowKey="id" pagination={false} />}
            </div>
          ),
        },
      ]} />

      {/* Party Modal */}
      <Modal title={editingParty ? 'Edit Party' : 'Add Party'} open={partyModal} width={620}
        onCancel={() => { setPartyModal(false); setEditingParty(null); partyForm.resetFields(); }}
        onOk={() => partyForm.submit()} confirmLoading={createMut.isPending || updateMut.isPending}>
        <Form form={partyForm} layout="vertical" onFinish={onPartySubmit}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="party_code" label="Party Code" rules={[{ required: !editingParty }]}><Input disabled={!!editingParty} placeholder="e.g. WPT-001" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="party_type" label="Type" initialValue="vendor">
                <Select><Option value="vendor">Vendor (Disposal Agency)</Option><Option value="customer">Customer (Scrap Buyer)</Option><Option value="both">Both</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="gst_number" label="GST Number"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="payment_terms" label="Payment Terms" initialValue="immediate">
                <Select><Option value="immediate">Immediate</Option><Option value="net_30">Net 30</Option><Option value="net_60">Net 60</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="handles_hazardous" label="Handles Hazardous?" initialValue={false}>
                <Select><Option value={false}>No</Option><Option value={true}>Yes — Certified</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="pollution_board_cert" label="Pollution Board Cert #"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="cert_expiry_date" label="Cert Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="rating" label="Rating (1-5)"><InputNumber style={{ width: '100%' }} min={1} max={5} step={0.1} /></Form.Item></Col>
            <Col span={24}><Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item></Col>
            <Col span={24}><Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Rate Modal */}
      <Modal title="Add Rate" open={rateModal}
        onCancel={() => { setRateModal(false); rateForm.resetFields(); }}
        onOk={() => rateForm.submit()} confirmLoading={addRateMut.isPending}>
        <Form form={rateForm} layout="vertical" onFinish={v => addRateMut.mutate({
          partyId: selectedPartyId,
          dto: { categoryId: v.category_id, rateType: v.rate_type, rate: v.rate, effectiveFrom: v.effective_from?.format('YYYY-MM-DD'), effectiveTo: v.effective_to?.format('YYYY-MM-DD') },
        })}>
          <Form.Item name="category_id" label="Waste Category" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {categories.map((c: WasteCategory) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="rate_type" label="Rate Type" initialValue="buy_rate">
                <Select><Option value="buy_rate">Buy Rate (they pay you)</Option><Option value="disposal_rate">Disposal Rate (you pay them)</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="rate" label="Rate (₹ per unit)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name="effective_from" label="Effective From" initialValue={dayjs()}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="effective_to" label="Effective To (optional)"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
