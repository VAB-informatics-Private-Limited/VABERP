'use client';

import {
  Typography,
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  message,
  Space,
} from 'antd';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceProduct } from '@/lib/api/service-products';
import { getProductTypes } from '@/lib/api/product-types';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api/client';
import { MOBILE_RULE } from '@/lib/validations/shared';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function AddServiceProductPage() {
  const router = useRouter();
  const { getEnterpriseId, userType } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [form] = Form.useForm();
  const [customerSearch, setCustomerSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: ptData, isLoading: ptLoading } = useQuery({
    queryKey: ['product-types'],
    queryFn: getProductTypes,
    enabled: !!enterpriseId,
  });

  // Use service-products/customers endpoint — works for both enterprise & employee
  const { data: customersRaw = [], isLoading: customersLoading } = useQuery({
    queryKey: ['service-customers', customerSearch],
    queryFn: async () => {
      const res = await api.get('/service-products/customers', {
        params: customerSearch ? { search: customerSearch } : {},
      });
      return res.data ?? [];
    },
    enabled: !!enterpriseId,
  });

  const mutation = useMutation({
    mutationFn: createServiceProduct,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['service-products'] });
      message.success('Product registered successfully');
      router.push(`/service-products/${res.data.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      message.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to register product');
    },
  });

  const onFinish = (values: any) => {
    mutation.mutate({
      ...values,
      dispatchDate: values.dispatchDate?.format('YYYY-MM-DD'),
      warrantyStartDate: values.warrantyStartDate?.format('YYYY-MM-DD'),
      warrantyEndDate: values.warrantyEndDate?.format('YYYY-MM-DD'),
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={() => router.back()}>← Back</Button>
        <Title level={4} className="!mb-0">Register Product</Title>
      </div>

      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Customer" name="customerId">
            <Select
              showSearch
              placeholder="Search by name or mobile..."
              filterOption={false}
              onSearch={(v) => setCustomerSearch(v)}
              loading={customersLoading}
              notFoundContent={
                customersLoading ? 'Loading…' : (
                  <div className="text-gray-400 text-xs py-1 text-center">
                    No customers found.{' '}
                    <a href="/customers/add" className="text-blue-500">Add a customer</a>
                  </div>
                )
              }
              options={customersRaw.map((c: any) => ({
                value: c.id,
                label: `${c.customerName ?? c.customer_name}${c.mobile ? ` — ${c.mobile}` : ''}`,
              }))}
              onChange={(id) => {
                const customer = customersRaw.find((c: any) => c.id === id);
                if (customer) {
                  form.setFieldsValue({
                    customerName: customer.customerName ?? customer.customer_name,
                    customerMobile: customer.mobile,
                    customerAddress: [customer.address, customer.city, customer.state].filter(Boolean).join(', '),
                  });
                }
              }}
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="Customer Name"
            name="customerName"
            rules={[
              { required: true, message: 'Customer name is required' },
              { min: 2, message: 'Name must be at least 2 characters' },
              { max: 100, message: 'Name is too long' },
            ]}
          >
            <Input placeholder="Customer name" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="Customer Mobile"
            name="customerMobile"
            rules={[
              { required: true, message: 'Mobile number is required' },
              MOBILE_RULE,
            ]}
          >
            <Input placeholder="10-digit mobile" maxLength={10} />
          </Form.Item>

          <Form.Item
            label="Customer Address"
            name="customerAddress"
            rules={[{ max: 500, message: 'Address is too long' }]}
          >
            <Input.TextArea rows={2} placeholder="Address" maxLength={500} />
          </Form.Item>

          <Form.Item
            label="Product Type"
            name="productTypeId"
            rules={[{ required: true, message: 'Please select a product type' }]}
          >
            <Select
              placeholder="Select product type (e.g. AC, RO)"
              allowClear
              loading={ptLoading}
              notFoundContent={
                ptLoading ? 'Loading…' : (
                  <div className="text-gray-400 text-xs py-1 text-center">
                    No product types configured.{' '}
                    <a href="/settings/product-types" className="text-blue-500">Create one in Settings</a>
                  </div>
                )
              }
              options={(ptData?.data ?? []).map((pt) => ({ value: pt.id, label: `${pt.name} (${pt.warranty_months}m warranty)` }))}
            />
          </Form.Item>

          <Form.Item
            label="Serial Number"
            name="serialNumber"
            rules={[
              { required: true, message: 'Serial number is required' },
              { pattern: /^[A-Za-z0-9_-]{3,50}$/, message: 'Use 3–50 chars: letters, digits, - or _' },
            ]}
          >
            <Input placeholder="Serial / IMEI number" maxLength={50} style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            label="Model Number"
            name="modelNumber"
            rules={[{ max: 50, message: 'Model number is too long' }]}
          >
            <Input placeholder="Model" maxLength={50} />
          </Form.Item>

          <Form.Item
            label="Dispatch Date"
            name="dispatchDate"
            rules={[{ required: true, message: 'Dispatch date is required' }]}
            initialValue={dayjs()}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(d) => !!d && d.isAfter(dayjs().endOf('day'))}
            />
          </Form.Item>

          <Form.Item
            label="Warranty Start Date"
            name="warrantyStartDate"
            dependencies={['dispatchDate']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  const dispatch = getFieldValue('dispatchDate');
                  if (dispatch && value.isBefore(dispatch, 'day')) {
                    return Promise.reject(new Error('Warranty start cannot be before dispatch date'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="Auto-filled from dispatch date if blank" />
          </Form.Item>

          <Form.Item
            label="Notes"
            name="notes"
            rules={[{ max: 500, message: 'Notes are too long' }]}
          >
            <Input.TextArea rows={2} placeholder="Any notes" maxLength={500} showCount />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                Register Product
              </Button>
              <Button onClick={() => router.back()}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
