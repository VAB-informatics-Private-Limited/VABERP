'use client';

import { Suspense } from 'react';
import { Typography, message } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QuotationBuilder } from '@/components/quotations/QuotationBuilder';
import { addQuotation } from '@/lib/api/quotations';
import { getEnquiryById } from '@/lib/api/enquiries';
import { useAuthStore } from '@/stores/authStore';
import { QuotationFormData } from '@/types/quotation';

const { Title } = Typography;

function CreateQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { getEnterpriseId, getEmployeeId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const employeeId = getEmployeeId();

  const enquiryIdParam = searchParams.get('enquiryId');
  const enquiryId = enquiryIdParam ? Number(enquiryIdParam) : undefined;

  const { data: enquiryData } = useQuery({
    queryKey: ['enquiry', enquiryId],
    queryFn: () => getEnquiryById(enquiryId!, enterpriseId!),
    enabled: !!enquiryId && !!enterpriseId,
  });

  const mutation = useMutation({
    mutationFn: (data: QuotationFormData) =>
      addQuotation({
        ...data,
        enterprise_id: enterpriseId!,
        created_by: employeeId!,
        enquiry_id: enquiryId,
      }),
    onSuccess: (response) => {
      message.success(`Quotation ${response.data?.quotation_number} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (enquiryId) {
        queryClient.invalidateQueries({ queryKey: ['enquiry', enquiryId] });
        queryClient.invalidateQueries({ queryKey: ['enquiry-quotations', enquiryId] });
      }
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
        {enquiryId ? `Create Quotation for Enquiry #${enquiryId}` : 'Create Quotation'}
      </Title>
      <QuotationBuilder
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
        submitText="Create Quotation"
        initialEnquiryData={enquiryData?.data}
      />
    </div>
  );
}

export default function CreateQuotationPage() {
  return (
    <Suspense fallback={<div />}>
      <CreateQuotationContent />
    </Suspense>
  );
}
