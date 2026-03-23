'use client';

import { Typography, message, Spin } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EnquiryForm } from '@/components/enquiries/EnquiryForm';
import { getEnquiryById, updateEnquiry } from '@/lib/api/enquiries';
import { useAuthStore } from '@/stores/authStore';
import { EnquiryFormData } from '@/types/enquiry';

const { Title } = Typography;

export default function EditEnquiryPage() {
  const router = useRouter();
  const params = useParams();
  const enquiryId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data, isLoading } = useQuery({
    queryKey: ['enquiry', enquiryId],
    queryFn: () => getEnquiryById(enquiryId, enterpriseId!),
    enabled: !!enterpriseId && !!enquiryId,
  });

  const mutation = useMutation({
    mutationFn: (formData: EnquiryFormData) =>
      updateEnquiry({
        ...formData,
        id: enquiryId,
        enterprise_id: enterpriseId!,
      }),
    onSuccess: () => {
      message.success('Enquiry updated successfully');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['enquiry', enquiryId] });
      router.push('/enquiries');
    },
    onError: () => {
      message.error('Failed to update enquiry');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} className="mb-6">
        Edit Enquiry
      </Title>
      <EnquiryForm
        initialData={data?.data}
        onSubmit={(formData) => mutation.mutate(formData)}
        loading={mutation.isPending}
        submitText="Update Enquiry"
        isEdit
      />
    </div>
  );
}
