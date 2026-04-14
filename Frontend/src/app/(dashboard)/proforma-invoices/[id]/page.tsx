'use client';

import { Typography, Button, Space, Tag, Spin, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, SendOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProformaInvoiceById, updatePIStatus, convertPIToSalesOrder } from '@/lib/api/proforma-invoices';

const { Title } = Typography;

function statusTag(status: string) {
  const colors: Record<string, string> = { draft: 'default', sent: 'blue', converted: 'green' };
  return <Tag color={colors[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>;
}

export default function ViewProformaInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const piId = Number(params.id);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['proforma-invoice', piId],
    queryFn: () => getProformaInvoiceById(piId),
    enabled: !!piId,
  });

  const pi = data?.data;

  const markSentMutation = useMutation({
    mutationFn: () => updatePIStatus(piId, 'sent'),
    onSuccess: () => {
      message.success('Marked as Sent');
      queryClient.invalidateQueries({ queryKey: ['proforma-invoice', piId] });
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update status'),
  });

  const convertMutation = useMutation({
    mutationFn: () => convertPIToSalesOrder(piId),
    onSuccess: (result) => {
      message.success('Converted to Sales Order');
      queryClient.invalidateQueries({ queryKey: ['proforma-invoice', piId] });
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      const soId = result?.data?.sales_order_id;
      if (soId) router.push(`/purchase-orders/${soId}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to convert'),
  });

  const handlePrint = () => window.open(`/print/proforma-invoice/${piId}`, '_blank');
  const handleDownloadPDF = () => window.open(`/print/proforma-invoice/${piId}?pdf=1`, '_blank');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Proforma Invoice not found</Title>
        <Button onClick={() => router.push('/proforma-invoices')}>Back</Button>
      </div>
    );
  }

  return (
    <div className="print:p-8">
      {/* Action bar — hidden on print */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/proforma-invoices')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">{pi.pi_number}</Title>
          {statusTag(pi.status)}
        </div>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadPDF}>Download PDF</Button>
          {pi.status === 'draft' && (
            <Button
              icon={<SendOutlined />}
              onClick={() => markSentMutation.mutate()}
              loading={markSentMutation.isPending}
            >
              Mark as Sent
            </Button>
          )}
          {pi.status !== 'converted' && (
            <Popconfirm
              title="Convert to Sales Order?"
              description="This will create a Sales Order and lock this Proforma Invoice."
              onConfirm={() => convertMutation.mutate()}
              okText="Convert"
              cancelText="Cancel"
            >
              <Button type="primary" loading={convertMutation.isPending}>
                Convert to Sales Order
              </Button>
            </Popconfirm>
          )}
          {pi.status === 'converted' && pi.sales_order_id && (
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => router.push(`/purchase-orders/${pi.sales_order_id}`)}
            >
              View Sales Order
            </Button>
          )}
        </Space>
      </div>

    </div>
  );
}
