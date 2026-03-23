'use client';

import { Typography, Card, Descriptions, Tag, Button, Space, Modal, message, Spin, Row, Col, Popconfirm, Select, Form } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  PrinterOutlined,
  SwapOutlined,
  UserOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  TagOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getEnquiryById, getFollowupHistory, addFollowup, convertToCustomer, assignEnquiry } from '@/lib/api/enquiries';
import { getEmployees } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { FollowupTimeline } from '@/components/enquiries/FollowupTimeline';
import { FollowupForm } from '@/components/enquiries/FollowupForm';
import { INTEREST_STATUS_OPTIONS, FollowupFormData } from '@/types/enquiry';

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
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | undefined>();

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

  const { data: employeesData } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: () => getEmployees(undefined, 1, 1000),
  });

  const assignMutation = useMutation({
    mutationFn: (employeeId: number) => assignEnquiry(enquiryId, employeeId),
    onSuccess: () => {
      message.success('Enquiry assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['enquiry', enquiryId] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      setAssignModalOpen(false);
      setSelectedEmployee(undefined);
    },
    onError: () => {
      message.error('Failed to assign enquiry');
    },
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

  const convertMutation = useMutation({
    mutationFn: () => convertToCustomer(enquiryId),
    onSuccess: (data: any) => {
      message.success('Enquiry converted to customer successfully');
      queryClient.invalidateQueries({ queryKey: ['enquiry', enquiryId] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      const customerId = data?.data?.customer?.id;
      if (customerId) {
        router.push(`/customers/${customerId}`);
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      message.error(msg || 'Failed to convert enquiry to customer');
    },
  });

  const enquiry = enquiryData?.data;

  const isConvertible = enquiry && !enquiry.converted_customer_id &&
    enquiry.interest_status !== 'sale_closed' &&
    enquiry.interest_status !== 'converted' &&
    enquiry.interest_status !== 'not_interested';

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
          <Button
            icon={<TeamOutlined />}
            onClick={() => {
              setSelectedEmployee(enquiry?.employee_id ?? undefined);
              setAssignModalOpen(true);
            }}
          >
            Assign
          </Button>
          {isConvertible && (
            <Popconfirm
              title="Convert to Customer"
              description="This will create a customer record from this enquiry. Continue?"
              onConfirm={() => convertMutation.mutate()}
              okText="Yes, Convert"
              cancelText="Cancel"
            >
              <Button
                type="primary"
                icon={<SwapOutlined />}
                loading={convertMutation.isPending}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Convert to Customer
              </Button>
            </Popconfirm>
          )}
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

      {/* Print Header */}
      <div className="hidden print:block print:mb-6">
        <Title level={3} className="!mb-1">ENQUIRY DETAILS</Title>
        <div className="text-lg font-medium">{enquiry.customer_name}</div>
        <Tag color={getStatusColor(enquiry.interest_status)}>
          {getStatusLabel(enquiry.interest_status)}
        </Tag>
      </div>

      {/* Top Summary Bar */}
      <Card className="card-shadow mb-4" bodyStyle={{ padding: '16px 24px' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <UserOutlined className="text-blue-500 text-lg" />
            </div>
            <div>
              <Text strong className="text-lg block leading-tight">{enquiry.customer_name}</Text>
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

      <Row gutter={[16, 16]}>
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
              <Descriptions.Item label={<Text type="secondary">Assigned To</Text>}>
                <div className="flex items-center gap-1.5">
                  <UserOutlined className="text-blue-400" />
                  <Text>{enquiry.employee_name || '-'}</Text>
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
        </Col>
      </Row>

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

      <Modal
        title={
          <span className="flex items-center gap-2">
            <TeamOutlined className="text-blue-500" />
            Assign Enquiry
          </span>
        }
        open={assignModalOpen}
        onCancel={() => {
          setAssignModalOpen(false);
          setSelectedEmployee(undefined);
        }}
        onOk={() => {
          if (!selectedEmployee) {
            message.warning('Please select an employee to assign');
            return;
          }
          assignMutation.mutate(selectedEmployee);
        }}
        okText="Assign"
        cancelText="Cancel"
        confirmLoading={assignMutation.isPending}
        centered
        width={440}
      >
        <div className="py-4">
          <Form layout="vertical">
            <Form.Item label="Assign To" required>
              <Select
                showSearch
                placeholder="Select employee or admin"
                value={selectedEmployee}
                onChange={(val) => setSelectedEmployee(val)}
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: '100%' }}
                options={(employeesData?.data || [])
                  .filter((e) => e.status === 'active')
                  .map((e) => ({
                    value: e.id,
                    label: `${e.first_name} ${e.last_name || ''}`.trim(),
                  }))}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
