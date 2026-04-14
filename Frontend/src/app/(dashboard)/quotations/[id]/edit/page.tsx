'use client';

import { Typography, message, Spin, Alert, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuotationBuilder } from '@/components/quotations/QuotationBuilder';
import { getQuotationById, updateQuotation } from '@/lib/api/quotations';
import { useAuthStore } from '@/stores/authStore';
import { QuotationFormData } from '@/types/quotation';

const { Title } = Typography;

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();


  const { data, isLoading } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => getQuotationById(quotationId, enterpriseId!),
    enabled: !!enterpriseId && !!quotationId,
  });

  const mutation = useMutation({
    mutationFn: (formData: QuotationFormData) =>
      updateQuotation({
        ...formData,
        id: quotationId,
        enterprise_id: enterpriseId!,
      }),
    onSuccess: () => {
      message.success('Quotation updated successfully');
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      router.push(`/quotations/${quotationId}`);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to save changes');
    },
  });

  const handleFormSubmit = (formData: QuotationFormData) => {
    mutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Quotation not found</Title>
      </div>
    );
  }

  if (data.data.is_locked) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <Alert
          type="error"
          icon={<LockOutlined />}
          showIcon
          message="Quotation is Locked"
          description={
            <div>
              <p className="mt-1">
                This quotation has been accepted and converted to a Purchase Order. It cannot be revised.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Button onClick={() => router.push(`/quotations/${quotationId}`)}>
                  View Quotation
                </Button>
                {data.data.sales_order_id && (
                  <Button type="primary" onClick={() => router.push(`/purchase-orders/${data.data!.sales_order_id}`)}>
                    View Purchase Order
                  </Button>
                )}
              </div>
            </div>
          }
        />
      </div>
    );
  }

  const quotation = data.data;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Title level={4} className="!mb-0">
          Edit Quotation: {quotation.quotation_number}
        </Title>
      </div>

      <QuotationBuilder
        initialData={quotation}
        onSubmit={handleFormSubmit}
        loading={mutation.isPending}
        submitText="Save Changes"
        isEdit
      />
    </div>
  );
}
