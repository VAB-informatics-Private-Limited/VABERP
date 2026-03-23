'use client';

import { useState } from 'react';
import { Typography, Card, Descriptions, Tag, Button, Spin, Space, message } from 'antd';
import { EditOutlined, ArrowLeftOutlined, PrinterOutlined, MailOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCustomerById } from '@/lib/api/customers';
import { useAuthStore } from '@/stores/authStore';
import { SendEmailModal } from '@/components/common/SendEmailModal';

const { Title } = Typography;

export default function ViewCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = Number(params.id);
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerById(customerId, enterpriseId!),
    enabled: !!enterpriseId && !!customerId,
  });

  const customer = data?.data;
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Customer not found</Title>
        <Button onClick={() => router.push('/customers')}>Back to Customers</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Screen-only action bar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/customers')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            Customer Details
          </Title>
        </div>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button icon={<MailOutlined />} onClick={() => {
            if (!customer?.email) {
              message.warning('Customer email not available');
              return;
            }
            setEmailModalOpen(true);
          }}>
            Send Email
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => router.push(`/customers/${customerId}/edit`)}
          >
            Edit Customer
          </Button>
        </Space>
      </div>

      {/* Printable content wrapper */}
      <div className="print-customer-content">
        {/* Print Header - visible only when printing */}
        <div className="hidden print:block print-header">
          <Title level={3} className="!mb-1" style={{ fontSize: 20, letterSpacing: '0.05em' }}>
            CUSTOMER DETAILS
          </Title>
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>
            {customer.customer_name}
          </div>
          {customer.business_name && (
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {customer.business_name}
            </div>
          )}
        </div>

        <Card className="card-shadow mb-4">
          <Descriptions title="Basic Information" bordered column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Customer Name">{customer.customer_name}</Descriptions.Item>
            <Descriptions.Item label="Business Name">{customer.business_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={customer.status === 'active' ? 'green' : 'red'}>
                {customer.status?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Mobile">{customer.mobile}</Descriptions.Item>
            <Descriptions.Item label="Email">{customer.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Contact Person">{customer.contact_person || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card className="card-shadow mb-4">
          <Descriptions title="Address Information" bordered column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Address" span={3}>{customer.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="City">{customer.city || '-'}</Descriptions.Item>
            <Descriptions.Item label="State">{customer.state || '-'}</Descriptions.Item>
            <Descriptions.Item label="Pincode">{customer.pincode || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card className="card-shadow">
          <Descriptions title="Additional Information" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="GST Number">{customer.gst_number || '-'}</Descriptions.Item>
            <Descriptions.Item label="Created Date">{customer.created_date}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Print footer - visible only when printing */}
        <div className="hidden print:block print-footer">
          Printed on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          &nbsp;&bull;&nbsp;VAB Enterprise
        </div>
      </div>

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        defaultTo={customer?.email || ''}
        defaultSubject={`Regarding - ${customer?.customer_name || ''}`}
        defaultBody={`Dear ${customer?.customer_name || ''},\n\n\n\nBest regards,\nVAB Enterprise`}
      />
    </div>
  );
}
