'use client';

import { Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QuotationBuilder } from '@/components/quotations/QuotationBuilder';
import { addQuotation } from '@/lib/api/quotations';
import { useAuthStore } from '@/stores/authStore';
import { QuotationFormData } from '@/types/quotation';

const { Title } = Typography;

export default function CreateQuotationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId, getEmployeeId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const employeeId = getEmployeeId();

  const mutation = useMutation({
    mutationFn: (data: QuotationFormData) =>
      addQuotation({
        ...data,
        enterprise_id: enterpriseId!,
        created_by: employeeId!,
      }),
    onSuccess: (response) => {
      message.success(`Quotation ${response.data?.quotation_number} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      router.push('/quotations');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to create quotation';
      message.error(msg);
    },
  });

  return (
    <div>
      <Title level={4} className="mb-6">
        Create Quotation
      </Title>
      <QuotationBuilder
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
        submitText="Create Quotation"
      />
    </div>
  );
}
