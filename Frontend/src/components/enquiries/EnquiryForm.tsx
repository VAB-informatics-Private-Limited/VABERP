'use client';

import { Form, Input, Select, DatePicker, Button, Card, Row, Col, AutoComplete } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { EnquiryFormData, INTEREST_STATUS_OPTIONS, Enquiry } from '@/types/enquiry';
import { getSources } from '@/lib/api/sources';
import { getCountries, getStates, getCities, Country, State, City } from '@/lib/api/locations';
import dayjs from 'dayjs';

interface EnquiryFormProps {
  initialData?: Enquiry;
  onSubmit: (data: EnquiryFormData) => void;
  loading: boolean;
  submitText: string;
  isEdit?: boolean;
}

// Long stale time since location data never changes
const LOCATION_STALE_TIME = 1000 * 60 * 60; // 1 hour

export function EnquiryForm({ initialData, onSubmit, loading, submitText, isEdit }: EnquiryFormProps) {
  const router = useRouter();
  const [form] = Form.useForm();

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  const { data: sourcesData } = useQuery({
    queryKey: ['sources'],
    queryFn: () => getSources(),
  });
  const sourceOptions = (sourcesData?.data || [])
    .filter((s) => s.is_active)
    .map((s) => ({ value: s.source_name, label: s.source_name }));

  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: getCountries,
    staleTime: LOCATION_STALE_TIME,
  });

  // Derive India's ID directly from countries data — no extra render/useEffect needed
  const indiaId = useMemo(() => countries.find((c) => c.code === 'IN')?.id ?? null, [countries]);

  // For new enquiries default to India; for edit use the stored country
  const editCountryId = useMemo(() => {
    if (!isEdit || !initialData?.country || countries.length === 0) return null;
    return countries.find((c) => c.name === initialData.country)?.id ?? null;
  }, [isEdit, initialData, countries]);

  // Effective country ID: user selection → edit value → India default
  const effectiveCountryId = selectedCountryId ?? editCountryId ?? indiaId;

  // States load as soon as effectiveCountryId is known (same render as countries response)
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ['states', effectiveCountryId],
    queryFn: () => getStates(effectiveCountryId!),
    enabled: !!effectiveCountryId,
    staleTime: LOCATION_STALE_TIME,
  });

  // Derive state ID from states data for edit mode
  const editStateId = useMemo(() => {
    if (!isEdit || !initialData?.state || states.length === 0) return null;
    return states.find((s) => s.name === initialData.state)?.id ?? null;
  }, [isEdit, initialData, states]);

  const effectiveStateId = selectedStateId ?? editStateId;

  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ['cities', effectiveStateId],
    queryFn: () => getCities(effectiveStateId!),
    enabled: !!effectiveStateId,
    staleTime: LOCATION_STALE_TIME,
  });

  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.name, label: c.name })),
    [cities],
  );

  // Set India as default country field value once countries load (new form only)
  useEffect(() => {
    if (!isEdit && indiaId && !form.getFieldValue('country')) {
      const india = countries.find((c) => c.id === indiaId);
      if (india) form.setFieldValue('country', india.name);
    }
  }, [indiaId, isEdit, countries, form]);

  const handleCountryChange = (value: string) => {
    const country = countries.find((c) => c.name === value);
    setSelectedCountryId(country?.id ?? null);
    setSelectedStateId(null);
    form.setFieldsValue({ state: undefined, city: undefined });
  };

  const handleStateChange = (value: string) => {
    const state = states.find((s) => s.name === value);
    setSelectedStateId(state?.id ?? null);
    form.setFieldValue('city', undefined);
  };

  const handleFinish = (values: EnquiryFormData & { next_followup_date?: dayjs.Dayjs }) => {
    const formData: EnquiryFormData = {
      ...values,
      next_followup_date: values.next_followup_date?.format('YYYY-MM-DD'),
    };
    onSubmit(formData);
  };

  const initialValues = initialData
    ? {
        ...initialData,
        next_followup_date: initialData.next_followup_date
          ? dayjs(initialData.next_followup_date)
          : undefined,
      }
    : {
        interest_status: 'enquiry',
      };

  return (
    <Card className="card-shadow">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={initialValues}
      >
        <div className="mb-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/enquiries')}
          >
            Back to Enquiries
          </Button>
        </div>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="customer_name"
              label="Customer Name"
              rules={[{ required: true, message: 'Please enter customer name' }]}
            >
              <Input placeholder="Enter customer name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="customer_mobile"
              label="Mobile Number"
              rules={[
                { required: true, message: 'Please enter mobile number' },
                { pattern: /^[0-9]{10}$/, message: 'Please enter valid 10-digit mobile number' },
              ]}
            >
              <Input placeholder="Enter mobile number" maxLength={10} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="customer_email" label="Email">
              <Input type="email" placeholder="Enter email address" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="business_name" label="Business Name">
              <Input placeholder="Enter business name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="gst_number"
              label="GST Number"
              rules={[
                {
                  pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                  message: 'Enter a valid GST number (e.g. 27AAPFU0939F1ZV)',
                },
              ]}
            >
              <Input placeholder="Enter GST number" maxLength={15} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="source" label="Lead Source">
              <Select placeholder="Select lead source" allowClear>
                {sourceOptions.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="interest_status"
              label="Interest Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select status">
                {INTEREST_STATUS_OPTIONS.map((status) => (
                  <Select.Option key={status.value} value={status.value}>
                    {status.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="next_followup_date" label="Next Follow-up Date">
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="product_interest" label="Product Interest">
              <Input placeholder="Enter product of interest" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="Address">
          <Input.TextArea placeholder="Enter address" rows={2} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="country" label="Country">
              <Select
                showSearch
                placeholder="Select country"
                allowClear
                onChange={handleCountryChange}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={countries.map((c) => ({ value: c.name, label: c.name }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="state" label="State">
              <Select
                showSearch
                placeholder={effectiveCountryId ? 'Select state' : 'Select country first'}
                allowClear
                disabled={!effectiveCountryId}
                onChange={handleStateChange}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={states.map((s) => ({ value: s.name, label: s.name }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="city" label="City">
              <AutoComplete
                placeholder={selectedStateId ? 'Enter or select city' : 'Enter city'}
                allowClear
                options={cityOptions}
                filterOption={(input, option) =>
                  (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="pincode" label="Pincode">
              <Input placeholder="Enter pincode" maxLength={6} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea placeholder="Enter remarks" rows={3} />
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button onClick={() => router.push('/enquiries')}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {submitText}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
