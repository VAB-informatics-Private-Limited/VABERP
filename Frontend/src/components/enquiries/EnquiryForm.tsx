'use client';

import { Form, Input, Select, AutoComplete, DatePicker, Button, Card, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { EnquiryFormData, INTEREST_STATUS_OPTIONS, Enquiry } from '@/types/enquiry';
import { getSources } from '@/lib/api/sources';
import { checkEnquiryMobile } from '@/lib/api/enquiries';
import {
  getCountries, getStates, getCities, getPincodes, createPincode,
  Country, State, City, Pincode,
} from '@/lib/api/locations';
import { MOBILE_RULE, PINCODE_RULE, GSTIN_REGEX } from '@/lib/validations/shared';
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

  const [mobileWarning, setMobileWarning] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

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

  // In edit mode, resolve stateId from stored state name once states load
  useEffect(() => {
    if (isEdit && initialData?.state && states.length > 0 && selectedStateId === null) {
      const match = states.find((s) => s.name === initialData.state);
      if (match) setSelectedStateId(match.id);
    }
  }, [isEdit, initialData, states, selectedStateId]);

  // Cities cascade: fetch when a state is selected
  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ['cities', selectedStateId],
    queryFn: () => getCities(selectedStateId!),
    enabled: !!selectedStateId,
    staleTime: LOCATION_STALE_TIME,
  });

  // In edit mode, resolve cityId once cities load
  useEffect(() => {
    if (isEdit && initialData?.city && cities.length > 0 && selectedCityId === null) {
      const match = cities.find((c) => c.name === initialData.city);
      if (match) setSelectedCityId(match.id);
    }
  }, [isEdit, initialData, cities, selectedCityId]);

  // Pincodes cascade: fetch when a city is selected
  const { data: pincodes = [] } = useQuery<Pincode[]>({
    queryKey: ['pincodes', selectedCityId],
    queryFn: () => getPincodes(selectedCityId!),
    enabled: !!selectedCityId,
    staleTime: LOCATION_STALE_TIME,
  });

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
    setSelectedCityId(null);
    form.setFieldsValue({ state: undefined, city: undefined, pincode: undefined });
  };

  const handleStateChange = (value: string) => {
    const state = states.find((s) => s.name === value);
    setSelectedStateId(state?.id ?? null);
    setSelectedCityId(null);
    form.setFieldsValue({ city: undefined, pincode: undefined });
  };

  const handleCityChange = (value: string) => {
    const city = cities.find((c) => c.name === value);
    setSelectedCityId(city?.id ?? null);
    form.setFieldsValue({ pincode: undefined });
  };

  // Silently persist a pincode the user types that isn't already in the master
  const handlePincodeBlur = () => {
    const code = form.getFieldValue('pincode');
    if (!selectedCityId || !code) return;
    if (!/^[0-9]{6}$/.test(code)) return;
    if (pincodes.some((p) => p.code === code)) return;
    createPincode(selectedCityId, code).catch(() => {});
  };

  const handleMobileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const mobile = e.target.value;
    if (!/^[0-9]{10}$/.test(mobile)) {
      setMobileWarning(null);
      return;
    }
    if (isEdit) return;
    try {
      const result = await checkEnquiryMobile(mobile);
      if (result.exists) {
        setMobileWarning(`Mobile already exists: ${result.customerName}`);
      } else {
        setMobileWarning(null);
      }
    } catch {
      setMobileWarning(null);
    }
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
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
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
                MOBILE_RULE,
              ]}
              help={mobileWarning ? <span style={{ color: '#faad14' }}>⚠ {mobileWarning}</span> : undefined}
              validateStatus={mobileWarning ? 'warning' : undefined}
            >
              <Input
                placeholder="Enter mobile number"
                maxLength={10}
                onChange={handleMobileChange}
              />
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
              validateTrigger={['onBlur', 'onSubmit']}
              dependencies={['business_name']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const biz = getFieldValue('business_name');
                    if (biz && !value) {
                      return Promise.reject(new Error('GST number is required for business enquiries'));
                    }
                    if (!value) return Promise.resolve();
                    return GSTIN_REGEX.test(value)
                      ? Promise.resolve()
                      : Promise.reject(new Error('Enter a valid GST number (e.g. 27AAPFU0939F1ZV)'));
                  },
                }),
              ]}
            >
              <Input
                placeholder="Enter GST number"
                maxLength={15}
                style={{ textTransform: 'uppercase' }}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  if (upper !== e.target.value) {
                    form.setFieldValue('gst_number', upper);
                  }
                }}
              />
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
              <DatePicker
                className="w-full"
                format="DD-MM-YYYY"
                disabledDate={(d) => !!d && d.isBefore(dayjs().startOf('day'))}
              />
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
              <Select
                showSearch
                placeholder={selectedStateId ? 'Select city' : 'Select state first'}
                allowClear
                disabled={!selectedStateId}
                onChange={handleCityChange}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={cities.map((c) => ({ value: c.name, label: c.name }))}
                notFoundContent={selectedStateId ? 'No cities available for this state' : null}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="pincode"
              label="Pincode"
              rules={[PINCODE_RULE]}
            >
              <AutoComplete
                placeholder={
                  selectedCityId
                    ? (pincodes.length ? 'Select or type pincode' : 'Type 6-digit pincode')
                    : 'Select city first'
                }
                allowClear
                disabled={!selectedCityId}
                onBlur={handlePincodeBlur}
                filterOption={(input, option) =>
                  ((option?.value as string) ?? '').includes(input)
                }
                options={pincodes.map((p) => ({ value: p.code, label: p.code }))}
              />
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
