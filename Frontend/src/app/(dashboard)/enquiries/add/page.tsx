'use client';

import { Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EnquiryForm } from '@/components/enquiries/EnquiryForm';
import { addEnquiry } from '@/lib/api/enquiries';
import { useAuthStore } from '@/stores/authStore';
import { EnquiryFormData } from '@/types/enquiry';

const { Title } = Typography;

export default function AddEnquiryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId, getEmployeeId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const employeeId = getEmployeeId();
  const mutation = useMutation({
    mutationFn: (data: EnquiryFormData) =>
      addEnquiry({
        ...data,
        enterprise_id: enterpriseId!,
        employee_id: employeeId || undefined,
      }),
    onSuccess: () => {
      message.success('Enquiry added successfully');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      router.push('/enquiries');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to add enquiry';
      message.error(msg);
    },
  });

  return (
    <div>
      <Title level={4} className="mb-6">
        Add New Enquiry
      </Title>
      <EnquiryForm
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
        submitText="Add Enquiry"
      />
    </div>
  );
}
