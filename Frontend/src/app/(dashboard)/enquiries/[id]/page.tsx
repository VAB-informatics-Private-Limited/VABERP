'use client';

import { Typography, Card, Descriptions, Tag, Button, Space, Modal, message, Spin, Row, Col, Alert, Drawer } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  PrinterOutlined,
  UserOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  TagOutlined,
  FileTextOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getEnquiryById, getFollowupHistory, addFollowup, getEnquiryQuotations } from '@/lib/api/enquiries';
import { addQuotation } from '@/lib/api/quotations';
import { useAuthStore } from '@/stores/authStore';
import { getPrintTemplateConfig } from '@/lib/api/print-templates';
import { PrintHeader } from '@/components/print-engine/PrintHeader';
import { DEFAULT_PRINT_TEMPLATE } from '@/types/print-template';
import { FollowupTimeline } from '@/components/enquiries/FollowupTimeline';
import { FollowupForm } from '@/components/enquiries/FollowupForm';
import { QuotationBuilder } from '@/components/quotations/QuotationBuilder';
import { INTEREST_STATUS_OPTIONS, FollowupFormData } from '@/types/enquiry';
import { QuotationFormData } from '@/types/quotation';

const { Title, Text } = Typography;

export default function ViewEnquiryPage() {
  const router = useRouter();
  const params = useParams();
  const enquiryId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId, getEmployeeId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const employeeId = getEmployeeId();

  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);

  const { data: printConfig } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
    staleTime: 5 * 60 * 1000,
  });

  const { data: enquiryData, isLoading: enquiryLoading } = useQuery({
    queryKey: ['enquiry', enquiryId],
    queryFn: () => getEnquiryById(enquiryId, enterpriseId!),
    enabled: !!enterpriseId && !!enquiryId,
  });

  const { data: followupsData, isLoading: followupsLoading } = useQuery({
    queryKey: ['followups', enquiryId],
    queryFn: () => getFollowupHistory(enquiryId, enterpriseId!),
    enabled: !!enterpriseId && !!enquiryId,
  });

  const { data: linkedQuotationsData } = useQuery({
    queryKey: ['enquiry-quotations', enquiryId],
    queryFn: () => getEnquiryQuotations(enquiryId),
    enabled: !!enquiryId,
  });

  const followupMutation = useMutation({
    mutationFn: (data: FollowupFormData) =>
      addFollowup({
        ...data,
        enterprise_id: enterpriseId!,
        employee_id: employeeId!,
      }),
    onSuccess: () => {
      message.success('Follow-up added successfully');
      queryClient.invalidateQueries({ queryKey: ['followups', enquiryId] });
      queryClient.invalidateQueries({ queryKey: ['enquiry', enquiryId] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      setFollowupModalOpen(false);
    },
    onError: () => {
      message.error('Failed to add follow-up');
    },
  });

  const createQuotationMutation = useMutation({
    mutationFn: (data: QuotationFormData) =>
      addQuotation({ ...data, enquiry_id: enquiryId }),
    onSuccess: (result: any, variables) => {
      const wasSent = variables.status === 'sent';
      message.success(wasSent ? 'Quotation created and sent to customer!' : 'Quotation saved as draft');
      queryClient.invalidateQueries({ queryKey: ['enquiry-quotations', enquiryId] });
      queryClient.invalidateQueries({ queryKey: ['enquiry', enquiryId] });
      setQuotationDrawerOpen(false);
      const newId = result?.data?.id;
      if (newId) router.push(`/quotations/${newId}`);
    },
    onError: () => {
      message.error('Failed to create quotation');
    },
  });

  const enquiry = enquiryData?.data;
  const linkedQuotations = (linkedQuotationsData?.data || []) as any[];
  const sortedQuotations = [...linkedQuotations].sort((a, b) => a.id - b.id);
  const latestQuotation = [...linkedQuotations].sort((a, b) => b.id - a.id)[0];
  const hasRejectedQuotation = latestQuotation?.status === 'rejected';
  const hasPendingQuotation = latestQuotation && ['draft', 'sent'].includes(latestQuotation.status);
  const isLead = enquiry && !enquiry.converted_customer_id;

  const getStatusColor = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const statusOption = INTEREST_STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.label || status;
  };

  const handlePrint = () => {
    window.print();
  };

  if (enquiryLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Enquiry not found</Title>
        <Button onClick={() => router.push('/enquiries')}>Back to Enquiries</Button>
      </div>
    );
  }

  return (
    <div className="print:p-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/enquiries')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            Enquiry Details
          </Title>
        </div>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          {enquiry?.converted_customer_id && (
            <Button
              type="default"
              onClick={() => router.push(`/customers/${enquiry.converted_customer_id}`)}
            >
              View Customer
            </Button>
          )}
          <Button
            type="primary"
            icon={hasRejectedQuotation ? <FormOutlined /> : <FileTextOutlined />}
            onClick={() =>
              hasRejectedQuotation
                ? router.push(`/quotations/${latestQuotation.id}/edit`)
                : setQuotationDrawerOpen(true)
            }
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
          >
            {hasRejectedQuotation ? 'Revise Quotation' : 'Create Quotation'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setFollowupModalOpen(true)}
          >
            Add Follow-up
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => router.push(`/enquiries/${enquiryId}/edit`)}
          >
            Edit
          </Button>
        </Space>
      </div>

      {/* ===== PRINT-ONLY LAYOUT — compact single page ===== */}
      <div className="hidden print:block" style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111' }}>
        <PrintHeader config={printConfig ?? DEFAULT_PRINT_TEMPLATE} />

        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #222' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>ENQUIRY DETAILS</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{enquiry.customer_name}{enquiry.business_name ? ` — ${enquiry.business_name}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#e6f4ff', color: '#0958d9', border: '1px solid #91caff' }}>
              {getStatusLabel(enquiry.interest_status)}
            </span>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Created: {enquiry.created_date}</div>
          </div>
        </div>

        {/* Two-column info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
          {/* Customer Info */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1677ff', marginBottom: 6, borderBottom: '1px solid #e0e0e0', paddingBottom: 3 }}>Customer Information</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                {[
                  ['Name', enquiry.customer_name],
                  ['Business', enquiry.business_name || '-'],
                  ['Mobile', enquiry.customer_mobile || '-'],
                  ['Email', enquiry.customer_email || '-'],
                  ['GST', enquiry.gst_number || '-'],
                  ['Address', [enquiry.address, enquiry.city, enquiry.state, enquiry.pincode].filter(Boolean).join(', ') || '-'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: '3px 6px 3px 0', color: '#666', width: '35%', verticalAlign: 'top' }}>{label}</td>
                    <td style={{ padding: '3px 0', fontWeight: 500 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enquiry Info */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1677ff', marginBottom: 6, borderBottom: '1px solid #e0e0e0', paddingBottom: 3 }}>Enquiry Details</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                {[
                  ['Status', getStatusLabel(enquiry.interest_status)],
                  ['Source', enquiry.source || '-'],
                  ['Product Interest', enquiry.product_interest || '-'],
                  ['Next Follow-up', enquiry.next_followup_date || '-'],
                  ['Last Modified', enquiry.modified_date || '-'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: '3px 6px 3px 0', color: '#666', width: '40%', verticalAlign: 'top' }}>{label}</td>
                    <td style={{ padding: '3px 0', fontWeight: 500 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        {enquiry.remarks && (
          <div style={{ marginBottom: 14, padding: '8px 10px', background: '#f9f9f9', borderRadius: 4, border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 3 }}>Remarks</div>
            <div style={{ fontSize: 11, whiteSpace: 'pre-line' }}>{enquiry.remarks}</div>
          </div>
        )}

        {/* Follow-up History */}
        {(followupsData?.data || []).length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1677ff', marginBottom: 6, borderBottom: '1px solid #e0e0e0', paddingBottom: 3 }}>Follow-up History</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, border: '1px solid #e0e0e0', width: '15%' }}>Date</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, border: '1px solid #e0e0e0', width: '15%' }}>Type</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, border: '1px solid #e0e0e0' }}>Notes</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, border: '1px solid #e0e0e0', width: '18%' }}>Next Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {(followupsData?.data || []).map((f: any, i: number) => (
                  <tr key={f.id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '3px 8px', border: '1px solid #e0e0e0' }}>{f.followup_date || f.date || '-'}</td>
                    <td style={{ padding: '3px 8px', border: '1px solid #e0e0e0' }}>{f.followup_type || f.type || '-'}</td>
                    <td style={{ padding: '3px 8px', border: '1px solid #e0e0e0' }}>{f.notes || f.note || '-'}</td>
                    <td style={{ padding: '3px 8px', border: '1px solid #e0e0e0' }}>{f.next_followup_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 10, color: '#aaa' }}>
          Printed on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Top Summary Bar — screen only */}
      <Card className="card-shadow mb-4 print:hidden" bodyStyle={{ padding: '16px 24px' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <UserOutlined className="text-blue-500 text-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2 leading-tight">
                <Text strong className="text-lg">{enquiry.customer_name}</Text>
                {isLead ? (
                  <Tag color="blue" className="!m-0">Lead</Tag>
                ) : (
                  <Tag color="green" className="!m-0">Customer</Tag>
                )}
              </div>
              {enquiry.business_name && (
                <Text type="secondary" className="text-sm">{enquiry.business_name}</Text>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            {enquiry.customer_mobile && (
              <a href={`tel:${enquiry.customer_mobile}`} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600">
                <PhoneOutlined /> {enquiry.customer_mobile}
              </a>
            )}
            {enquiry.customer_email && (
              <a href={`mailto:${enquiry.customer_email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600">
                <MailOutlined /> {enquiry.customer_email}
              </a>
            )}
            <Tag color={getStatusColor(enquiry.interest_status)} className="!m-0 text-sm px-3 py-0.5">
              {getStatusLabel(enquiry.interest_status)}
            </Tag>
          </div>
        </div>
      </Card>

      {/* Quotation cycle status alert */}
      {hasRejectedQuotation && (
        <Alert
          type="warning"
          showIcon
          className="mb-4 print:hidden"
          message={
            <span>
              Quotation <strong>{latestQuotation.quotation_number}</strong> was rejected
            </span>
          }
          description="Follow up with the customer, then revise the quotation when ready to send again."
          action={
            <Space>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setFollowupModalOpen(true)}>
                Add Follow-up
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<FormOutlined />}
                onClick={() => router.push(`/quotations/${latestQuotation.id}/edit`)}
              >
                Revise Quotation
              </Button>
            </Space>
          }
        />
      )}
      {hasPendingQuotation && (
        <Alert
          type="info"
          showIcon
          className="mb-4 print:hidden"
          message={
            <span>
              Quotation <strong>{latestQuotation.quotation_number}</strong> is{' '}
              <strong>{latestQuotation.status}</strong> — waiting for customer response
            </span>
          }
        />
      )}

      <Row gutter={[16, 16]} className="print:hidden">
        {/* Left Column */}
        <Col xs={24} lg={14}>
          {/* Customer Information */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <UserOutlined className="text-blue-500" />
                Customer Information
              </span>
            }
            className="card-shadow mb-4"
          >
            <Descriptions column={{ xs: 1, sm: 2 }} colon={false} layout="vertical" size="small">
              <Descriptions.Item label={<Text type="secondary">Customer Name</Text>}>
                <Text strong>{enquiry.customer_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Business Name</Text>}>
                <Text>{enquiry.business_name || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">GST Number</Text>}>
                <Text>{enquiry.gst_number || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Mobile</Text>}>
                <a href={`tel:${enquiry.customer_mobile}`} className="flex items-center gap-1.5">
                  <PhoneOutlined className="text-green-500" />
                  {enquiry.customer_mobile}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Email</Text>}>
                {enquiry.customer_email ? (
                  <a href={`mailto:${enquiry.customer_email}`} className="flex items-center gap-1.5">
                    <MailOutlined className="text-blue-500" />
                    {enquiry.customer_email}
                  </a>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              {(enquiry.address || enquiry.city || enquiry.state) && (
                <Descriptions.Item label={<Text type="secondary">Address</Text>} span={2}>
                  <div className="flex items-start gap-1.5">
                    <EnvironmentOutlined className="text-red-400 mt-1" />
                    <span>
                      {[enquiry.address, enquiry.city, enquiry.state, enquiry.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Enquiry Details */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <InfoCircleOutlined className="text-orange-500" />
                Enquiry Details
              </span>
            }
            className="card-shadow mb-4"
          >
            <Descriptions column={{ xs: 1, sm: 2 }} colon={false} layout="vertical" size="small">
              <Descriptions.Item label={<Text type="secondary">Interest Status</Text>}>
                <Tag color={getStatusColor(enquiry.interest_status)} className="text-sm">
                  {getStatusLabel(enquiry.interest_status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Lead Source</Text>}>
                <div className="flex items-center gap-1.5">
                  <TagOutlined className="text-purple-400" />
                  <Text>{enquiry.source || '-'}</Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Product Interest</Text>} span={2}>
                <Text>{enquiry.product_interest || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Next Follow-up</Text>}>
                <div className="flex items-center gap-1.5">
                  <CalendarOutlined
                    className={
                      enquiry.next_followup_date && new Date(enquiry.next_followup_date) < new Date()
                        ? 'text-red-500'
                        : 'text-green-500'
                    }
                  />
                  {enquiry.next_followup_date ? (
                    <Text
                      className={
                        new Date(enquiry.next_followup_date) < new Date()
                          ? 'text-red-600 font-medium'
                          : 'text-green-600'
                      }
                    >
                      {enquiry.next_followup_date}
                    </Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Created Date</Text>}>
                <Text>{enquiry.created_date}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Last Modified</Text>}>
                <Text>{enquiry.modified_date || '-'}</Text>
              </Descriptions.Item>
              {enquiry.remarks && (
                <Descriptions.Item label={<Text type="secondary">Remarks</Text>} span={2}>
                  <Text className="whitespace-pre-line">{enquiry.remarks}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* Right Column */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <CalendarOutlined className="text-green-500" />
                Follow-up History
              </span>
            }
            className="card-shadow"
            extra={
              <Button
                type="link"
                icon={<PlusOutlined />}
                onClick={() => setFollowupModalOpen(true)}
                className="print:hidden"
              >
                Add
              </Button>
            }
          >
            <FollowupTimeline
              followups={followupsData?.data || []}
              loading={followupsLoading}
            />
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                <FileTextOutlined className="text-purple-500" />
                Linked Quotations
              </span>
            }
            className="card-shadow mt-4 print:hidden"
            extra={
              hasRejectedQuotation ? (
                <Button
                  type="link"
                  icon={<FormOutlined />}
                  onClick={() => router.push(`/quotations/${latestQuotation.id}/edit`)}
                >
                  Revise
                </Button>
              ) : !hasPendingQuotation && (
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => setQuotationDrawerOpen(true)}
                >
                  New Quotation
                </Button>
              )
            }
          >
            {sortedQuotations.length === 0 ? (
              <Text type="secondary">No quotations linked yet</Text>
            ) : (
              sortedQuotations.map((q: any, idx: number) => {
                const isLatest = q.id === latestQuotation?.id;
                const statusColor =
                  q.status === 'accepted' ? 'green' :
                  q.status === 'rejected' ? 'red' :
                  q.status === 'sent' ? 'blue' :
                  q.status === 'expired' ? 'orange' : 'default';
                return (
                  <div
                    key={q.id}
                    className={`flex justify-between items-center py-2 border-b last:border-b-0 cursor-pointer px-2 rounded transition-colors ${isLatest ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                    onClick={() => router.push(`/quotations/${q.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono w-5">#{idx + 1}</span>
                      <div>
                        <Text strong>{q.quotation_number}</Text>
                        <Text type="secondary" className="ml-1 text-xs">v{q.current_version}</Text>
                        {isLatest && <Tag color="processing" className="ml-1 !text-xs">Latest</Tag>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Text className="text-sm">₹{Number(q.total_amount || q.grand_total || 0).toLocaleString('en-IN')}</Text>
                      <Tag color={statusColor}>{q.status}</Tag>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </Col>
      </Row>

      {/* Create Quotation Drawer */}
      <Drawer
        title={
          <span className="flex items-center gap-2">
            <FileTextOutlined className="text-purple-500" />
            Create Quotation — {enquiry?.customer_name}
          </span>
        }
        open={quotationDrawerOpen}
        onClose={() => setQuotationDrawerOpen(false)}
        width="85%"
        styles={{ body: { padding: 24 } }}
        destroyOnClose
      >
        {quotationDrawerOpen && (
          <QuotationBuilder
            initialEnquiryData={enquiry ? {
              id: enquiry.id,
              customer_name: enquiry.customer_name,
              customer_mobile: enquiry.customer_mobile,
              customer_email: enquiry.customer_email,
              address: enquiry.address,
              city: enquiry.city,
              state: enquiry.state,
              pincode: enquiry.pincode,
            } as any : undefined}
            onSubmit={(data) => createQuotationMutation.mutate(data)}
            loading={createQuotationMutation.isPending}
            submitText="Save Quotation"
            onCancel={() => setQuotationDrawerOpen(false)}
          />
        )}
      </Drawer>

      <Modal
        title="Add Follow-up"
        open={followupModalOpen}
        onCancel={() => setFollowupModalOpen(false)}
        footer={null}
        maskClosable={false}
        width={620}
        centered
      >
        <FollowupForm
          enquiryId={enquiryId}
          onSubmit={(data) => followupMutation.mutate(data)}
          onCancel={() => setFollowupModalOpen(false)}
          loading={followupMutation.isPending}
        />
      </Modal>

    </div>
  );
}
