'use client';

import { Form, Input, Select, InputNumber, DatePicker, Row, Col } from 'antd';
import { CrmLead, CRM_STATUS_OPTIONS } from '@/types/crm';
import dayjs from 'dayjs';

const LEAD_SOURCE_OPTIONS = [
  'Website', 'Referral', 'Walk-in', 'Phone', 'Email',
  'Social Media', 'Advertisement', 'Trade Show', 'Cold Call', 'Other',
].map(v => ({ value: v, label: v }));

interface Props {
  form: ReturnType<typeof Form.useForm>[0];
  initial?: Partial<CrmLead>;
}

export function LeadForm({ form, initial }: Props) {
  // Set initial values
  const initialValues = initial ? {
    customerName:      initial.customer_name,
    email:             initial.email,
    mobile:            initial.mobile,
    businessName:      initial.business_name,
    gstNumber:         initial.gst_number,
    address:           initial.address,
    city:              initial.city,
    state:             initial.state,
    country:           initial.country,
    pincode:           initial.pincode,
    source:            initial.source,
    status:            initial.status,
    expectedValue:     initial.expected_value,
    requirements:      initial.requirements,
    remarks:           initial.remarks,
    nextFollowupDate:  initial.next_followup_date ? dayjs(initial.next_followup_date) : undefined,
  } : undefined;

  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="customerName" label="Customer Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Full name" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="mobile" label="Mobile">
            <Input placeholder="+91 XXXXXXXX" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="email" label="Email">
            <Input placeholder="email@example.com" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="businessName" label="Business Name">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="source" label="Source">
            <Select options={LEAD_SOURCE_OPTIONS} placeholder="How did they find you?" allowClear />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="expectedValue" label="Expected Value (₹)">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="nextFollowupDate" label="Next Follow-up Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="gstNumber" label="GST Number">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="city" label="City"><Input /></Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="state" label="State"><Input /></Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="pincode" label="Pincode"><Input /></Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="requirements" label="Requirements">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
