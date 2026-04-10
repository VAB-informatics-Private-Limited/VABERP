'use client';

import { useState } from 'react';
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
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceProduct } from '@/lib/api/service-products';
import { getProductTypes } from '@/lib/api/product-types';
import { getCustomerList } from '@/lib/api/customers';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function AddServiceProductPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: ptData } = useQuery({
    queryKey: ['product-types'],
    queryFn: getProductTypes,
    enabled: !!enterpriseId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomerList({ enterpriseId: enterpriseId!, pageSize: 200 }),
    enabled: !!enterpriseId,
  });

  const mutation = useMutation({
    mutationFn: createServiceProduct,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['service-products'] });
      message.success('Product registered successfully');
      router.push(`/service-products/${res.data.id}`);
    },
    onError: () => message.error('Failed to register product'),
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
              placeholder="Select customer"
              optionFilterProp="label"
              options={(customersData?.data ?? []).map((c: any) => ({
                value: c.id,
                label: `${c.customer_name}${c.mobile ? ` (${c.mobile})` : ''}`,
              }))}
              onChange={(id) => {
                const customer = customersData?.data?.find((c: any) => c.id === id);
                if (customer) {
                  form.setFieldsValue({
                    customerName: customer.customer_name,
                    customerMobile: customer.mobile,
                    customerAddress: [customer.address, customer.city, customer.state].filter(Boolean).join(', '),
                  });
                }
              }}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Customer Name" name="customerName">
            <Input placeholder="Customer name" />
          </Form.Item>

          <Form.Item label="Customer Mobile" name="customerMobile">
            <Input placeholder="Mobile number" />
          </Form.Item>

          <Form.Item label="Customer Address" name="customerAddress">
            <Input.TextArea rows={2} placeholder="Address" />
          </Form.Item>

          <Form.Item label="Product Type" name="productTypeId">
            <Select
              placeholder="Select product type (e.g. AC, RO)"
              allowClear
              options={(ptData?.data ?? []).map((pt) => ({ value: pt.id, label: `${pt.name} (${pt.warranty_months}m warranty)` }))}
            />
          </Form.Item>

          <Form.Item label="Serial Number" name="serialNumber">
            <Input placeholder="Serial / IMEI number" />
          </Form.Item>

          <Form.Item label="Model Number" name="modelNumber">
            <Input placeholder="Model" />
          </Form.Item>

          <Form.Item
            label="Dispatch Date"
            name="dispatchDate"
            rules={[{ required: true, message: 'Dispatch date is required' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Warranty Start Date" name="warrantyStartDate">
            <DatePicker style={{ width: '100%' }} placeholder="Auto-filled from dispatch date if blank" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Any notes" />
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
