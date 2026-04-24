'use client';

import { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Button, Card, Table, InputNumber, Select, Row, Col, Divider, message, Space, Alert, Modal } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { QuotationFormData, QuotationItem, Quotation } from '@/types/quotation';
import { Enquiry } from '@/types/enquiry';
import { getDropdownProductsList } from '@/lib/api/products';
import { getCustomerList } from '@/lib/api/customers';
import { checkQuotationMobile } from '@/lib/api/quotations';
import { MOBILE_RULE } from '@/lib/validations/shared';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

interface QuotationBuilderProps {
  initialData?: Quotation;
  initialEnquiryData?: Enquiry;
  onSubmit: (data: QuotationFormData) => void;
  loading: boolean;
  submitText: string;
  isEdit?: boolean;
  onCancel?: () => void;
}

export function QuotationBuilder({ initialData, initialEnquiryData, onSubmit, loading, submitText, isEdit, onCancel }: QuotationBuilderProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  const quotationDate = Form.useWatch('quotation_date', form);
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [items, setItems] = useState<QuotationItem[]>(() => {
    const raw = initialData?.items || [];
    // Recalculate total_amount from discount_percent (not discount_amount) so edit view is accurate
    return raw.map((item) => {
      const subtotal = Number(item.quantity) * Number(item.unit_price);
      const discountAmount = (subtotal * Number(item.discount_percent || 0)) / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = Number(item.tax_percent || 0) > 0 ? (afterDiscount * Number(item.tax_percent)) / 100 : 0;
      return { ...item, total_amount: afterDiscount + taxAmount };
    });
  });
  const [selectedProduct, setSelectedProduct] = useState<number | undefined>();
  const [mobileWarning, setMobileWarning] = useState<string | null>(null);
  const [submitAction, setSubmitAction] = useState<'draft' | 'sent'>('draft');

  useEffect(() => {
    if (initialEnquiryData && !isEdit) {
      const addressParts = [
        initialEnquiryData.address,
        initialEnquiryData.city,
        initialEnquiryData.state,
        initialEnquiryData.pincode,
      ].filter(Boolean);
      form.setFieldsValue({
        customer_name: initialEnquiryData.customer_name,
        customer_mobile: initialEnquiryData.customer_mobile,
        customer_email: initialEnquiryData.customer_email,
        billing_address: addressParts.join(', ') || undefined,
      });
    }
  }, [initialEnquiryData, isEdit, form]);

  const { data: products } = useQuery({
    queryKey: ['products-dropdown', enterpriseId],
    queryFn: () => getDropdownProductsList(enterpriseId!),
    enabled: !!enterpriseId,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-dropdown', enterpriseId],
    queryFn: () => getCustomerList({ enterpriseId: enterpriseId!, page: 1, pageSize: 1000 }),
    enabled: !!enterpriseId,
  });

  const calculateItemTotal = (item: QuotationItem): number => {
    const subtotal = Number(item.quantity) * Number(item.unit_price);
    const discountAmount = (subtotal * Number(item.discount_percent || 0)) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = Number(item.tax_percent || 0) > 0 ? (afterDiscount * Number(item.tax_percent)) / 100 : 0;
    return afterDiscount + taxAmount;
  };

  const getTierDiscount = (tiers: { minQty: number; discountPercent: number }[] | undefined, qty: number): number | null => {
    if (!tiers || tiers.length === 0) return null;
    const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
    const match = sorted.find((t) => qty >= t.minQty);
    return match ? match.discountPercent : null;
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      message.warning('Please select a product');
      return;
    }

    const product = products?.data?.find((p) => p.id === selectedProduct);
    if (!product) return;

    const existingItem = items.find((i) => i.product_id === selectedProduct);
    if (existingItem) {
      message.warning('Product already added. Update quantity instead.');
      return;
    }

    const tiers = product.discount_tiers || [];
    const tierDiscount = getTierDiscount(tiers, 1);

    const newItem: QuotationItem = {
      product_id: product.id,
      product_name: product.product_name,
      product_code: product.product_code,
      hsn_code: product.hsn_code,
      unit: product.unit,
      quantity: 1,
      unit_price: Number(product.price) || 0,
      // Auto-apply the tier discount matching this initial quantity (if any).
      // Previously this was hardcoded to 0 so the tier only kicked in after the
      // user edited the quantity — the discount didn't "reflect" on add.
      discount_percent: tierDiscount ?? 0,
      discount_tiers: tiers,
      tax_percent: product.gst_rate != null ? Number(product.gst_rate) : 18,
      total_amount: Number(product.price) || 0,
    };

    newItem.total_amount = calculateItemTotal(newItem);
    setItems([...items, newItem]);
    setSelectedProduct(undefined);
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };

    // When the quantity changes, auto-apply the matching tier discount (if any)
    // so users don't have to remember to refresh or re-pick the product.
    if (field === 'quantity') {
      const tierPct = getTierDiscount(item.discount_tiers, Number(value) || 0);
      if (tierPct != null) {
        item.discount_percent = tierPct;
      }
    }

    item.total_amount = calculateItemTotal(item);
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    const discountAmount = items.reduce((sum, item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
      return sum + (itemSubtotal * Number(item.discount_percent || 0)) / 100;
    }, 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
      const itemDiscount = (itemSubtotal * Number(item.discount_percent || 0)) / 100;
      const afterDiscount = itemSubtotal - itemDiscount;
      return sum + (Number(item.tax_percent || 0) > 0 ? (afterDiscount * Number(item.tax_percent)) / 100 : 0);
    }, 0);
    const totalAmount = subtotal - discountAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  const totals = calculateTotals();

  const showRequiredModal = (labels: string[]) => {
    Modal.error({
      title: 'Please fill in the required fields',
      content: (
        <ul className="mt-2 list-disc pl-4">
          {labels.map((label) => (
            <li key={label} className="text-red-600 font-medium">{label}</li>
          ))}
        </ul>
      ),
      okText: 'OK',
    });
  };

  const handleFinish = (values: QuotationFormData & { quotation_date?: dayjs.Dayjs; valid_until?: dayjs.Dayjs; expected_delivery?: dayjs.Dayjs }) => {
    if (items.length === 0) {
      showRequiredModal(['Products (add at least one item)']);
      return;
    }

    // Block save if any item's discount exceeds the tier-allotted amount for that quantity
    const violations = items.filter((item) => {
      if (!item.discount_tiers || item.discount_tiers.length === 0) return false;
      const allowed = getTierDiscount(item.discount_tiers, item.quantity);
      if (allowed == null) return false; // no tier matches this qty — no restriction
      return (item.discount_percent || 0) > allowed;
    });

    if (violations.length > 0) {
      violations.forEach((item) => {
        const allowed = getTierDiscount(item.discount_tiers!, item.quantity)!;
        message.error(`"${item.product_name}": discount cannot exceed ${allowed}% for qty ${item.quantity}`, 5);
      });
      return;
    }

    const formData: QuotationFormData = {
      ...values,
      quotation_date: values.quotation_date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
      valid_until: values.valid_until?.format('YYYY-MM-DD'),
      expected_delivery: values.expected_delivery?.format('YYYY-MM-DD'),
      // In drawer mode, action buttons control the status directly
      status: onCancel ? submitAction : (values.status || 'draft'),
      items,
    };
    onSubmit(formData);
  };

  const FIELD_LABELS: Record<string, string> = {
    customer_name: 'Customer Name',
    mobile: 'Mobile Number',
    quotation_date: 'Quotation Date',
    valid_until: 'Valid Until',
    expected_delivery: 'Expected Delivery Date',
    email: 'Email',
    address: 'Address',
    city: 'City',
    state: 'State',
    country: 'Country',
    enquiry_id: 'Enquiry',
    customer_id: 'Customer',
    status: 'Status',
    notes: 'Notes',
  };

  const handleFinishFailed = ({ errorFields }: { errorFields: { name: (string | number)[]; errors: string[] }[] }) => {
    const missing = errorFields.map((f) => FIELD_LABELS[String(f.name[0])] || String(f.name[0]));
    if (items.length === 0) {
      missing.push('Products (add at least one item)');
    }
    showRequiredModal(missing);
  };

  const handleMobileBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const mobile = e.target.value;
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      setMobileWarning(null);
      return;
    }
    if (isEdit) return; // skip check on edit
    try {
      const result = await checkQuotationMobile(mobile);
      if (result.exists) {
        setMobileWarning(
          `This mobile number already has quotation ${result.quotationNumber} (${result.customerName}).`
        );
      } else {
        setMobileWarning(null);
      }
    } catch {
      setMobileWarning(null);
    }
  };

  const handleCustomerSelect = (customerId: number) => {
    const customer = customers?.data?.find((c) => c.id === customerId);
    if (customer) {
      form.setFieldsValue({
        customer_name: customer.customer_name,
        customer_mobile: customer.mobile,
        customer_email: customer.email,
        business_name: customer.business_name,
        billing_address: [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', '),
      });
    }
  };

  const itemColumns: ColumnsType<QuotationItem> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          {record.product_code && <div className="text-gray-500 text-sm">SKU: {record.product_code}</div>}
        </div>
      ),
    },
    {
      title: 'HSN',
      dataIndex: 'hsn_code',
      key: 'hsn_code',
      render: (text) => text || '-',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_, record, index) => {
        const tiers = record.discount_tiers;
        const sortedTiers = tiers && tiers.length > 0 ? [...tiers].sort((a, b) => a.minQty - b.minQty) : [];
        const nextTier = sortedTiers.find((t) => t.minQty > record.quantity);
        return (
          <div>
            <InputNumber
              min={1}
              max={999999}
              value={record.quantity}
              onChange={(value) => {
                if (value == null) return;
                handleUpdateItem(index, 'quantity', value);
              }}
              onKeyDown={(e) => {
                // Block anything that isn't a digit or control key
                const control = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter'];
                if (!control.includes(e.key) && !/^\d$/.test(e.key)) {
                  e.preventDefault();
                  return;
                }
                // Block a 7th digit by reading the live input text
                if (/^\d$/.test(e.key)) {
                  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '');
                  if (digits.length >= 6) e.preventDefault();
                }
              }}
              size="small"
              style={{ width: 90 }}
            />
            {nextTier && (
              <div className="text-xs text-blue-500 mt-1 leading-tight">
                Add {nextTier.minQty - record.quantity} more → {nextTier.discountPercent}% off
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (price) => (
        <span className="font-medium">₹{Number(price).toLocaleString('en-IN')}</span>
      ),
    },
    {
      title: 'Discount %',
      dataIndex: 'discount_percent',
      key: 'discount_percent',
      width: 160,
      render: (_, record, index) => {
        const tierDiscount = getTierDiscount(record.discount_tiers, record.quantity);
        const current = record.discount_percent || 0;
        const isOverLimit = tierDiscount != null && current > tierDiscount;
        return (
          <div>
            <InputNumber
              min={0}
              max={99}
              precision={0}
              value={current}
              status={isOverLimit ? 'error' : undefined}
              onChange={(value) => {
                const v = value == null ? 0 : Math.min(Math.floor(value), 99);
                handleUpdateItem(index, 'discount_percent', v);
              }}
              onKeyDown={(e) => {
                const control = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter'];
                if (!control.includes(e.key) && !/^\d$/.test(e.key)) {
                  e.preventDefault();
                  return;
                }
                if (/^\d$/.test(e.key)) {
                  const input = e.target as HTMLInputElement;
                  const selected = (input.selectionEnd || 0) - (input.selectionStart || 0);
                  const digits = input.value.replace(/\D/g, '');
                  if (digits.length >= 2 && selected === 0) e.preventDefault();
                }
              }}
              addonAfter="%"
              size="small"
              style={{ width: 110 }}
            />
            {isOverLimit && (
              <div className="text-xs text-red-500 leading-tight mt-1">
                Max allowed: {tierDiscount}% for this qty
              </div>
            )}
            {!isOverLimit && tierDiscount != null && current < tierDiscount && (
              <div className="text-xs text-blue-500 leading-tight mt-1">
                Tier allows up to {tierDiscount}%
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tax %',
      dataIndex: 'tax_percent',
      key: 'tax_percent',
      width: 70,
      render: (tax) => <span>{tax ?? 0}%</span>,
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 130,
      render: (amount) => (
        <span style={{ display: 'block', width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          ₹{Number(amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, __, index) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(index)}
        />
      ),
    },
  ];

  const initialValues = initialData
    ? {
        ...initialData,
        quotation_date: initialData.quotation_date ? dayjs(initialData.quotation_date) : dayjs(),
        valid_until: initialData.valid_until ? dayjs(initialData.valid_until) : undefined,
        expected_delivery: initialData.expected_delivery ? dayjs(initialData.expected_delivery) : undefined,
      }
    : {
        quotation_date: dayjs(),
        valid_until: dayjs().add(30, 'day'),
        status: 'draft',
      };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} onFinishFailed={handleFinishFailed} scrollToFirstError={false} initialValues={initialValues}>
      {!onCancel && (
        <div className="mb-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/quotations')}>
            Back to Quotations
          </Button>
        </div>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card title="Customer Details" className="card-shadow mb-4">
            {!initialEnquiryData && (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Select Existing Customer">
                    <Select
                      placeholder="Select customer"
                      showSearch
                      optionFilterProp="children"
                      onChange={handleCustomerSelect}
                      allowClear
                      listHeight={192}
                    >
                      {customers?.data?.map((customer) => (
                        <Select.Option key={customer.id} value={customer.id}>
                          {customer.customer_name} - {customer.mobile}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_name"
                  label="Customer Name"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="Enter customer name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_mobile"
                  label="Mobile"
                  rules={[
                    { required: true, message: 'Required' },
                    MOBILE_RULE,
                  ]}
                  help={mobileWarning ? <span style={{ color: '#faad14' }}>⚠ {mobileWarning}</span> : undefined}
                  validateStatus={mobileWarning ? 'warning' : undefined}
                >
                  <Input
                    placeholder="Enter mobile"
                    maxLength={10}
                    onBlur={handleMobileBlur}
                    onChange={() => setMobileWarning(null)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="customer_email" label="Email">
                  <Input placeholder="Enter email" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="business_name" label="Business Name">
                  <Input placeholder="Enter business name" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="billing_address" label="Billing Address">
              <Input.TextArea rows={2} placeholder="Enter billing address" />
            </Form.Item>

            <Form.Item name="shipping_address" label="Shipping Address">
              <Input.TextArea rows={2} placeholder="Enter shipping address (if different)" />
            </Form.Item>
          </Card>

          <Card
            title={<span>Items <span className="text-red-500">*</span></span>}
            className="card-shadow mb-4"
          >
            <div className="flex gap-2 mb-4">
              <Select
                placeholder="Select product to add"
                showSearch
                optionFilterProp="children"
                value={selectedProduct}
                onChange={setSelectedProduct}
                style={{ flex: 1 }}
              >
                {products?.data?.map((product) => (
                  <Select.Option key={product.id} value={product.id}>
                    {product.product_name} {product.product_code && `[${product.product_code}]`} - ₹{product.price}
                  </Select.Option>
                ))}
              </Select>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>
                Add
              </Button>
            </div>

            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey={(record, index) => `${record.product_id}-${index}`}
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />

            <Divider />

            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-red-600">
                    <span>Discount:</span>
                    <span>-₹{totals.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span>Tax:</span>
                  <span>₹{totals.taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between py-1 font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{totals.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Quotation Details" className="card-shadow mb-4">
            <Form.Item
              name="quotation_date"
              label="Quotation Date"
              rules={[{ required: true, message: 'Required' }]}
            >
              <DatePicker className="w-full" format="DD-MM-YYYY" disabledDate={(d) => d && d < dayjs().startOf('day')} />
            </Form.Item>

            <Form.Item name="valid_until" label="Valid Until">
              <DatePicker className="w-full" format="DD-MM-YYYY" disabledDate={(d) => d && d < (quotationDate ?? dayjs()).startOf('day')} />
            </Form.Item>

            <Form.Item name="expected_delivery" label="Expected Delivery Date">
              <DatePicker className="w-full" format="DD-MM-YYYY" disabledDate={(d) => d && d < dayjs().startOf('day')} />
            </Form.Item>

            {!onCancel && (
              <Form.Item name="status" label="Status">
                <Select>
                  <Select.Option value="draft">Draft</Select.Option>
                  <Select.Option value="sent">Sent</Select.Option>
                </Select>
              </Form.Item>
            )}

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} placeholder="Additional notes" />
            </Form.Item>

            <Form.Item name="terms_conditions" label="Terms & Conditions">
              <Input.TextArea rows={4} placeholder="Terms and conditions" />
            </Form.Item>
          </Card>

          {onCancel ? (
            <Space direction="vertical" className="w-full" size="small">
              <Alert
                type="info"
                showIcon
                className="!mb-1"
                message="Choose how to save this quotation"
                description="Save as draft to review later, or create and send it directly to the customer to continue the sales cycle."
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                htmlType="submit"
                loading={loading && submitAction === 'sent'}
                disabled={loading}
                block
                size="large"
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => setSubmitAction('sent')}
              >
                Create &amp; Send to Customer
              </Button>
              <Button
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={loading && submitAction === 'draft'}
                disabled={loading}
                block
                size="large"
                onClick={() => setSubmitAction('draft')}
              >
                Save as Draft
              </Button>
              <Button block onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            </Space>
          ) : (
            <Space direction="vertical" className="w-full">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={loading}
                disabled={loading}
                block
                size="large"
              >
                {submitText}
              </Button>
              <Button block onClick={() => router.push('/quotations')}>
                Cancel
              </Button>
            </Space>
          )}
        </Col>
      </Row>
    </Form>
  );
}
