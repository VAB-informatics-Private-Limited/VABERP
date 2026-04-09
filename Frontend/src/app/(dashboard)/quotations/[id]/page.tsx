'use client';

import { useRef, useState } from 'react';
import { Typography, Card, Descriptions, Tag, Button, Space, Table, Divider, Spin, Row, Col, message, Modal, Alert, Steps, DatePicker, Input } from 'antd';
import { ArrowLeftOutlined, EditOutlined, FilePdfOutlined, SendOutlined, PrinterOutlined, MailOutlined, DownloadOutlined, CheckCircleOutlined, LockOutlined, FileTextOutlined, ShoppingCartOutlined, CloseCircleOutlined, HistoryOutlined, CalendarOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuotationById, updateQuotationStatus, acceptQuotation, updateQuotationETA } from '@/lib/api/quotations';
import { createPIFromQuotation } from '@/lib/api/proforma-invoices';
import dayjs from 'dayjs';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import { QUOTATION_STATUS_OPTIONS, QuotationItem } from '@/types/quotation';
import { printPage } from '@/lib/utils/printPdf';
import { SendEmailModal } from '@/components/common/SendEmailModal';
import QuotationVersionHistory from '@/components/quotations/QuotationVersionHistory';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

export default function ViewQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => getQuotationById(quotationId, enterpriseId!),
    enabled: !!enterpriseId && !!quotationId,
  });

  const [rejectionReason, setRejectionReason] = useState('');

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      updateQuotationStatus(quotationId, status, enterpriseId!, reason),
    onSuccess: (_, variables) => {
      message.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (variables.status === 'rejected') {
        queryClient.invalidateQueries({ queryKey: ['enquiry'] });
      }
    },
    onError: () => {
      message.error('Failed to update status');
    },
  });

  const [poCreatedModal, setPoCreatedModal] = useState<{ open: boolean; poId: number | null; poNumber: string }>({
    open: false, poId: null, poNumber: '',
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptQuotation(quotationId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      // Get the PO id and number from the returned quotation
      const salesOrderId = result?.data?.sales_order_id;
      setPoCreatedModal({
        open: true,
        poId: salesOrderId ?? null,
        poNumber: '',
      });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to accept quotation');
    },
  });

  const generatePIMutation = useMutation({
    mutationFn: () => createPIFromQuotation(quotationId),
    onSuccess: (result) => {
      message.success(`Proforma Invoice ${result.data.pi_number} created`);
      router.push(`/proforma-invoices/${result.data.id}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to generate Proforma Invoice'),
  });

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [etaModalOpen, setEtaModalOpen] = useState(false);
  const [etaValue, setEtaValue] = useState<dayjs.Dayjs | null>(null);

  const etaMutation = useMutation({
    mutationFn: (expectedDelivery: string) => updateQuotationETA(quotationId, expectedDelivery),
    onSuccess: () => {
      message.success('ETA updated');
      setEtaModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: () => message.error('Failed to update ETA'),
  });

  const quotation = data?.data;

  const getStatusColor = (status: string) => {
    const option = QUOTATION_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const option = QUOTATION_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.label || status;
  };

  const itemColumns: ColumnsType<QuotationItem> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_, __, index) => index + 1,
    },
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
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      render: (text) => text || '-',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `₹${Number(price).toLocaleString('en-IN')}`,
    },
    {
      title: 'Disc %',
      dataIndex: 'discount_percent',
      key: 'discount_percent',
      render: (discount) => discount ? `${discount}%` : '-',
    },
    {
      title: 'Tax %',
      dataIndex: 'tax_percent',
      key: 'tax_percent',
      render: (tax) => tax ? `${tax}%` : '-',
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `₹${Number(amount).toLocaleString('en-IN')}`,
    },
  ];

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    printPage();
  };

  const handleDownloadPDF = () => {
    window.open(`/print/quotation/${quotationId}`, '_blank');
  };

  const [emailModalOpen, setEmailModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Quotation not found</Title>
        <Button onClick={() => router.push('/quotations')}>Back to Quotations</Button>
      </div>
    );
  }

  return (
    <div className="print:p-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/quotations')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            {quotation.quotation_number}
          </Title>
          <Tag
            color={quotation.current_version > 1 ? 'purple' : 'default'}
            icon={<HistoryOutlined />}
            className="font-semibold"
          >
            v{quotation.current_version}
          </Tag>
          <Tag color={getStatusColor(quotation.status)}>{getStatusLabel(quotation.status)}</Tag>
        </div>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          <Button icon={<MailOutlined />} onClick={() => {
            if (!quotation?.customer_email) {
              message.warning('Customer email not available');
              return;
            }
            setEmailModalOpen(true);
          }}>
            Send Email
          </Button>
          {!quotation.is_locked && hasPermission('sales', 'quotations', 'edit') && (
            <>
              {quotation.status === 'draft' && (
                <Button
                  icon={<SendOutlined />}
                  onClick={() => statusMutation.mutate({ status: 'sent' })}
                  loading={statusMutation.isPending}
                >
                  Mark as Sent
                </Button>
              )}
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/quotations/${quotationId}/edit`)}
              >
                {quotation.current_version > 1 ? 'Revise' : 'Edit'}
              </Button>
            </>
          )}
          {quotation.status === 'sent' && !quotation.is_locked && (
            <Button
              icon={<FileTextOutlined />}
              onClick={() => generatePIMutation.mutate()}
              loading={generatePIMutation.isPending}
            >
              Generate Proforma Invoice
            </Button>
          )}
          {(quotation.status === 'sent' || quotation.status === 'draft') && !quotation.is_locked && hasPermission('sales', 'quotations', 'edit') && (
            <>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setRejectModalOpen(true)}
                loading={statusMutation.isPending}
              >
                Reject
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setAcceptModalOpen(true)}
              >
                Close Sale & Transfer to PO
              </Button>
            </>
          )}
          {quotation.is_locked && quotation.sales_order_id && (
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => router.push(`/purchase-orders/${quotation.sales_order_id}`)}
            >
              View Purchase Order
            </Button>
          )}
        </Space>
      </div>

      {/* PO Cancelled alert */}
      {quotation.po_cancelled_at && (
        <div className="mb-4 print:hidden">
          <Alert
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
            message={
              <span>
                Purchase Order <strong>{quotation.cancelled_po_number || 'linked PO'}</strong> was cancelled
              </span>
            }
            description={
              <span>
                Cancelled on{' '}
                <strong>
                  {dayjs(quotation.po_cancelled_at).format('DD MMM YYYY [at] hh:mm A')}
                </strong>
              </span>
            }
          />
        </div>
      )}

      {/* Workflow progress — hidden from print */}
      {quotation.is_locked && (
        <div className="mb-4 print:hidden">
          <Alert
            type="success"
            icon={<LockOutlined />}
            showIcon
            message={
              <span>
                <strong>This quotation is accepted and locked.</strong> A Purchase Order has been created from it.
              </span>
            }
            />
          <div className="mt-3">
            <Steps
              size="small"
              current={1}
              items={[
                { title: 'Quotation', description: quotation.quotation_number, icon: <FileTextOutlined /> },
                { title: 'Purchase Order', description: quotation.sales_order_id ? `PO linked` : 'Created', icon: <ShoppingCartOutlined /> },
                { title: 'Invoice', description: 'Next step', icon: <FilePdfOutlined /> },
              ]}
            />
          </div>
        </div>
      )}

      {/* Post-rejection actions — hidden from print */}
      {quotation.status === 'rejected' && !quotation.is_locked && (
        <div className="mb-4 print:hidden">
          <Alert
            type="warning"
            showIcon
            message="Quotation Rejected"
            description={
              quotation.enquiry_id
                ? 'The linked enquiry has been moved back to Follow Up status.'
                : 'This quotation has been rejected.'
            }
            action={
              quotation.enquiry_id ? (
                <Space direction="vertical" size="small">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => router.push(`/quotations/${quotationId}/edit`)}
                  >
                    Revise Quotation
                  </Button>
                  <Button
                    size="small"
                    onClick={() => router.push(`/enquiries/${quotation.enquiry_id}`)}
                  >
                    Schedule Follow-up
                  </Button>
                </Space>
              ) : (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => router.push(`/quotations/${quotationId}/edit`)}
                >
                  Revise Quotation
                </Button>
              )
            }
          />
        </div>
      )}

      {quotation.expected_delivery &&
        new Date(quotation.expected_delivery.split('T')[0]) < new Date(new Date().toDateString()) &&
        !['draft', 'rejected', 'expired'].includes(quotation.status) && (
        <Alert
          type="warning"
          showIcon
          banner
          message="Delivery May Be Delayed"
          description={`The expected delivery date (${dayjs(quotation.expected_delivery).format('DD MMM YYYY')}) has passed. Please inform the customer about the delay.`}
          className="mb-4 print:hidden"
        />
      )}

      <div ref={printRef} className="printable-area">
      <Card className="card-shadow mb-4 print:shadow-none print:border">
        <div className="print:mb-8">
          <Row justify="space-between" align="top">
            <Col>
              <Title level={3} className="!mb-0">QUOTATION</Title>
              <Text type="secondary">{quotation.quotation_number}</Text>
            </Col>
            <Col className="text-right">
              <div className="text-gray-600">Date: {quotation.quotation_date}</div>
              {quotation.valid_until && (
                <div className="text-gray-600">Valid Until: {quotation.valid_until}</div>
              )}
              <div className="mt-1 print:hidden">
                <Space>
                  <CalendarOutlined className="text-gray-500" />
                  <span className="text-gray-500 text-sm">ETA:</span>
                  {quotation.expected_delivery ? (
                    <Text type={dayjs(quotation.expected_delivery).isBefore(dayjs(), 'day') ? 'danger' : undefined} className="text-sm">
                      {dayjs(quotation.expected_delivery).format('DD MMM YYYY')}
                      {dayjs(quotation.expected_delivery).isBefore(dayjs(), 'day') && ' (Overdue)'}
                    </Text>
                  ) : <Text type="secondary" className="text-sm">Not set</Text>}
                  <Button size="small" onClick={() => { setEtaValue(quotation.expected_delivery ? dayjs(quotation.expected_delivery) : null); setEtaModalOpen(true); }}>Set</Button>
                </Space>
                {quotation.delay_note && (
                  <div className="mt-2 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                    <span className="text-orange-500 font-bold text-sm">⚠</span>
                    <div>
                      <div className="text-orange-700 font-semibold text-xs uppercase tracking-wide mb-0.5">Delay Reported</div>
                      <div className="text-orange-800 text-sm">{quotation.delay_note}</div>
                    </div>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>

        <Divider />

        <Row gutter={32}>
          <Col xs={24} md={12}>
            <Title level={5}>Bill To:</Title>
            <div className="font-medium text-lg">{quotation.customer_name}</div>
            {quotation.business_name && <div className="text-gray-600">{quotation.business_name}</div>}
            {quotation.customer_mobile && <div>Phone: {quotation.customer_mobile}</div>}
            {quotation.customer_email && <div>Email: {quotation.customer_email}</div>}
            {quotation.billing_address && (
              <div className="mt-2 text-gray-600">{quotation.billing_address}</div>
            )}
          </Col>
          {quotation.shipping_address && (
            <Col xs={24} md={12}>
              <Title level={5}>Ship To:</Title>
              <div className="text-gray-600">{quotation.shipping_address}</div>
            </Col>
          )}
        </Row>

        <Divider />

        <Table
          columns={itemColumns}
          dataSource={quotation.items || []}
          rowKey={(record, index) => `${record.product_id}-${index}`}
          pagination={false}
          size="small"
        />

        <div className="flex justify-end mt-6">
          <div className="w-80">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Subtotal:</span>
              <span>₹{Number(quotation.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            {quotation.discount_amount && Number(quotation.discount_amount) > 0 && (
              <div className="flex justify-between py-2 border-b text-red-600">
                <span>Discount:</span>
                <span>-₹{Number(quotation.discount_amount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tax:</span>
              <span>₹{Number(quotation.tax_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-3 font-bold text-lg">
              <span>Total Amount:</span>
              <span>₹{Number(quotation.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {quotation.notes && (
          <>
            <Divider />
            <div>
              <Title level={5}>Notes:</Title>
              <div className="text-gray-600 whitespace-pre-wrap">{quotation.notes}</div>
            </div>
          </>
        )}

        {quotation.terms_conditions && (
          <>
            <Divider />
            <div>
              <Title level={5}>Terms & Conditions:</Title>
              <div className="text-gray-600 whitespace-pre-wrap">{quotation.terms_conditions}</div>
            </div>
          </>
        )}
      </Card>
      </div>

      {/* Version history — hidden from print */}
      <QuotationVersionHistory
        versions={quotation.versions || []}
        currentVersion={quotation.current_version ?? 1}
        quotationNumber={quotation.quotation_number}
      />

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        defaultTo={quotation?.customer_email || ''}
        defaultSubject={`Quotation ${quotation?.quotation_number || ''}`}
        defaultBody={`Dear ${quotation?.customer_name || ''},\n\nPlease find the quotation ${quotation?.quotation_number || ''} for your reference.\n\nTotal Amount: ₹${Number(quotation?.total_amount || 0).toLocaleString('en-IN')}\n\nBest regards,\nVAB Enterprise`}
      />

      {/* Accept → Transfer to Purchase Order modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>Transfer to Purchase Order</span>
          </div>
        }
        open={acceptModalOpen}
        onCancel={() => setAcceptModalOpen(false)}
        onOk={() => {
          setAcceptModalOpen(false);
          acceptMutation.mutate();
        }}
        okText="Yes, Accept & Create Purchase Order"
        okButtonProps={{ type: 'primary', loading: acceptMutation.isPending }}
        cancelText="Cancel"
      >
        <div className="py-2">
          <p className="mb-3">
            You are about to accept <strong>{quotation.quotation_number}</strong> for{' '}
            <strong>{quotation.customer_name}</strong>.
          </p>
          <Alert
            type="info"
            showIcon
            message="This will:"
            description={
              <ul className="mt-1 list-disc list-inside text-sm">
                <li>Mark the quotation as <strong>Accepted</strong></li>
                <li>Create a <strong>Purchase Order</strong> automatically</li>
                {quotation.enquiry_id && <li><strong>Convert the linked enquiry</strong> to a Customer record</li>}
                <li><strong>Lock</strong> this quotation — it cannot be edited after acceptance</li>
              </ul>
            }
          />
          <p className="mt-3 text-gray-600">
            Total Amount: <strong>₹{Number(quotation.total_amount || 0).toLocaleString('en-IN')}</strong>
          </p>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <CloseCircleOutlined className="text-red-500" />
            <span>Reject Quotation</span>
          </div>
        }
        open={rejectModalOpen}
        onCancel={() => { setRejectModalOpen(false); setRejectionReason(''); }}
        onOk={() => {
          setRejectModalOpen(false);
          statusMutation.mutate({ status: 'rejected', reason: rejectionReason });
          setRejectionReason('');
        }}
        okText="Yes, Reject"
        okButtonProps={{ danger: true, loading: statusMutation.isPending }}
        cancelText="Cancel"
      >
        <div className="py-2">
          <p>
            Are you sure you want to reject <strong>{quotation.quotation_number}</strong> for{' '}
            <strong>{quotation.customer_name}</strong>?
          </p>
          {quotation.enquiry_id && (
            <p className="mt-2 text-orange-600 text-sm">
              The linked enquiry will be moved back to <strong>Follow Up</strong> status.
            </p>
          )}
          <div className="mt-3">
            <label className="text-sm font-medium text-gray-700">Rejection Reason (optional)</label>
            <Input.TextArea
              rows={3}
              placeholder="e.g. Price too high, need to revise scope..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </Modal>

      {/* ── PO Created — immediate redirect modal ── */}
      <Modal
        open={poCreatedModal.open}
        closable={false}
        footer={null}
        centered
        width={420}
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircleOutlined className="text-green-500 text-3xl" />
          </div>
          <h3 className="text-xl font-bold mb-1">Quotation Accepted!</h3>
          <p className="text-gray-500 mb-4">
            A Purchase Order has been created from this quotation.
          </p>
          <div className="bg-blue-50 rounded-lg p-3 mb-6">
            <div className="text-sm text-gray-500">Customer</div>
            <div className="font-semibold">{quotation.customer_name}</div>
            <div className="text-sm text-gray-500 mt-2">Total Amount</div>
            <div className="font-bold text-blue-700 text-lg">
              ₹{Number(quotation.total_amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="primary"
              size="large"
              icon={<ShoppingCartOutlined />}
              block
              onClick={() => {
                setPoCreatedModal({ open: false, poId: null, poNumber: '' });
                if (poCreatedModal.poId) {
                  router.push(`/purchase-orders/${poCreatedModal.poId}`);
                }
              }}
            >
              Go to Purchase Order
            </Button>
            <Button
              size="large"
              block
              onClick={() => setPoCreatedModal({ open: false, poId: null, poNumber: '' })}
            >
              Stay on Quotation
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="Set ETA"
        open={etaModalOpen}
        onCancel={() => setEtaModalOpen(false)}
        onOk={() => etaMutation.mutate(etaValue ? etaValue.format('YYYY-MM-DD') : '')}
        okText="Save"
        confirmLoading={etaMutation.isPending}
      >
        <DatePicker
          value={etaValue}
          onChange={(d) => setEtaValue(d)}
          format="DD MMM YYYY"
          style={{ width: '100%' }}
          placeholder="Select ETA date"
        />
      </Modal>
    </div>
  );
}
