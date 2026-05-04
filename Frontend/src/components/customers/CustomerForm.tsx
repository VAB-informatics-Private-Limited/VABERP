'use client';

import { useEffect } from 'react';
import { Form, Input, Select, Button, Row, Col, Card } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, CustomerFormValues } from '@/lib/validations/customer';
import { Customer } from '@/types/customer';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

interface CustomerFormProps {
  initialData?: Customer;
  onSubmit: (data: CustomerFormValues) => void;
  loading?: boolean;
  submitText?: string;
}

export function CustomerForm({ initialData, onSubmit, loading, submitText = 'Save Customer' }: CustomerFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_name: initialData?.customer_name || '',
      business_name: initialData?.business_name || '',
      mobile: initialData?.mobile || '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      state: initialData?.state || '',
      city: initialData?.city || '',
      pincode: initialData?.pincode || '',
      gst_number: initialData?.gst_number || '',
      contact_person: initialData?.contact_person || '',
      status: initialData?.status || 'active',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        customer_name: initialData.customer_name || '',
        business_name: initialData.business_name || '',
        mobile: initialData.mobile || '',
        email: initialData.email || '',
        address: initialData.address || '',
        state: initialData.state || '',
        city: initialData.city || '',
        pincode: initialData.pincode || '',
        gst_number: initialData.gst_number || '',
        contact_person: initialData.contact_person || '',
        status: initialData.status || 'active',
      });
    }
  }, [initialData, reset]);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Card title="Basic Information" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Customer Name"
              required
              validateStatus={errors.customer_name ? 'error' : ''}
              help={errors.customer_name?.message}
            >
              <Controller
                name="customer_name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter customer name" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Business Name"
              validateStatus={errors.business_name ? 'error' : ''}
              help={errors.business_name?.message}
            >
              <Controller
                name="business_name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter business name" size="large" />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Mobile Number"
              required
              validateStatus={errors.mobile ? 'error' : ''}
              help={errors.mobile?.message}
            >
              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="10-digit mobile starting with 6/7/8/9"
                    size="large"
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      field.onChange(digitsOnly);
                    }}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Email"
              validateStatus={errors.email ? 'error' : ''}
              help={errors.email?.message}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="email@example.com" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Contact Person"
              validateStatus={errors.contact_person ? 'error' : ''}
              help={errors.contact_person?.message}
            >
              <Controller
                name="contact_person"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Contact person name" size="large" />
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Address Information" className="mb-4">
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              label="Address"
              validateStatus={errors.address ? 'error' : ''}
              help={errors.address?.message}
            >
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <Input.TextArea {...field} placeholder="Enter full address" rows={2} />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="State"
              validateStatus={errors.state ? 'error' : ''}
              help={errors.state?.message}
            >
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    onChange={(val) => field.onChange(val ?? '')}
                    placeholder="Select state"
                    size="large"
                    showSearch
                    allowClear
                    optionFilterProp="children"
                  >
                    {INDIAN_STATES.map((state) => (
                      <Select.Option key={state} value={state}>
                        {state}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="City"
              validateStatus={errors.city ? 'error' : ''}
              help={errors.city?.message}
            >
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter city" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Pincode"
              validateStatus={errors.pincode ? 'error' : ''}
              help={errors.pincode?.message}
            >
              <Controller
                name="pincode"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="6-digit pincode" size="large" maxLength={6} />
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Additional Information" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="GST Number"
              validateStatus={errors.gst_number ? 'error' : ''}
              help={errors.gst_number?.message}
            >
              <Controller
                name="gst_number"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter GST number" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Status"
              validateStatus={errors.status ? 'error' : ''}
              help={errors.status?.message}
            >
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select {...field} onChange={(val) => field.onChange(val ?? 'active')} size="large">
                    <Select.Option value="active">Active</Select.Option>
                    <Select.Option value="inactive">Inactive</Select.Option>
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <div className="flex justify-end gap-3">
        <Button size="large" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" size="large" loading={loading}>
          {submitText}
        </Button>
      </div>
    </Form>
  );
}
