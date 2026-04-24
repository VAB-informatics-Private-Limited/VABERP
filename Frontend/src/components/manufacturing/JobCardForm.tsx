'use client';

import { Form, Input, Select, DatePicker, InputNumber, Button, Card, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { JobCardFormData, JobCard, PRIORITY_OPTIONS, JOB_CARD_STATUS_OPTIONS } from '@/types/manufacturing';
import { getDropdownProductsList } from '@/lib/api/products';
import { getCustomerList } from '@/lib/api/customers';
import { getEmployees } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';

interface JobCardFormProps {
  initialData?: JobCard;
  onSubmit: (data: JobCardFormData) => void;
  loading: boolean;
  submitText: string;
  isEdit?: boolean;
}

export function JobCardForm({ initialData, onSubmit, loading, submitText, isEdit }: JobCardFormProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data: products } = useQuery({
    queryKey: ['products-dropdown', enterpriseId],
    queryFn: () => getDropdownProductsList(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-dropdown', enterpriseId],
    queryFn: () => getCustomerList({ enterpriseId: enterpriseId!, pageSize: 1000 }),
    enabled: !!enterpriseId,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', enterpriseId
      
    ],
    queryFn: () => getEmployees(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const handleFinish = (values: JobCardFormData & { start_date?: dayjs.Dayjs; due_date?: dayjs.Dayjs }) => {
    const formData: JobCardFormData = {
      ...values,
      start_date: values.start_date?.format('YYYY-MM-DD'),
      due_date: values.due_date?.format('YYYY-MM-DD'),
    };
    onSubmit(formData);
  };
  
  const initialValues = initialData
    ? {
        ...initialData,
        start_date: initialData.start_date ? dayjs(initialData.start_date) : undefined,
        due_date: initialData.due_date ? dayjs(initialData.due_date) : undefined,
      }
    : {
        priority: 'medium',
        status: 'pending',
        quantity: 1,
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
            onClick={() => router.push('/manufacturing')}
          >
            Back to Job Cards
          </Button>
        </div>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="product_id"
              label="Product"
              rules={[{ required: true, message: 'Please select a product' }]}
            >
              <Select
                placeholder="Select product"
                showSearch
                optionFilterProp="children"
              >
                {products?.data?.map((product) => (
                  <Select.Option key={product.id} value={product.id}>
                    {product.product_name} {product.product_code && `[${product.product_code}]`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[{ required: true, message: 'Please enter quantity' }]}
              tooltip={isEdit ? 'Quantity cannot be changed after a job card is created' : undefined}
            >
              <InputNumber
                min={1}
                className="w-full"
                placeholder="Enter quantity"
                disabled={isEdit}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="customer_id" label="Customer">
              <Select
                placeholder="Select customer (optional)"
                showSearch
                optionFilterProp="children"
                allowClear
              >
                {customers?.data?.map((customer) => (
                  <Select.Option key={customer.id} value={customer.id}>
                    {customer.customer_name} - {customer.mobile}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="assigned_to" label="Assign To">
              <Select
                placeholder="Select employee (optional)"
                showSearch
                optionFilterProp="children"
                allowClear
              >
                {employees?.data?.map((emp) => (
                  <Select.Option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="priority"
              label="Priority"
              rules={[{ required: true, message: 'Please select priority' }]}
            >
              <Select placeholder="Select priority">
                {PRIORITY_OPTIONS.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="start_date" label="Start Date">
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="due_date" label="Due Date">
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
        </Row>

        {isEdit && (
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Status">
                <Select>
                  {JOB_CARD_STATUS_OPTIONS.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea placeholder="Enter remarks" rows={3} />
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button onClick={() => router.push('/manufacturing')}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {submitText}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
