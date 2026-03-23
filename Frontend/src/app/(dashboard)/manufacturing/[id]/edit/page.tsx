'use client';

import { Typography, message, Spin } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JobCardForm } from '@/components/manufacturing/JobCardForm';
import { getJobCardById, updateJobCard } from '@/lib/api/manufacturing';
import { useAuthStore } from '@/stores/authStore';
import { JobCardFormData } from '@/types/manufacturing';

const { Title } = Typography;

export default function EditJobCardPage() {
  const router = useRouter();
  const params = useParams();
  const jobCardId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data, isLoading } = useQuery({
    queryKey: ['job-card', jobCardId],
    queryFn: () => getJobCardById(jobCardId, enterpriseId!),
    enabled: !!enterpriseId && !!jobCardId,
  });

  const mutation = useMutation({
    mutationFn: (formData: JobCardFormData) =>
      updateJobCard({
        ...formData,
        id: jobCardId,
        enterprise_id: enterpriseId!,
      }),
    onSuccess: () => {
      message.success('Job Card updated successfully');
      queryClient.invalidateQueries({ queryKey: ['job-card', jobCardId] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      router.push(`/manufacturing/${jobCardId}`);
    },
    onError: () => {
      message.error('Failed to update job card');
    },
  });

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
        <Title level={4}>Job Card not found</Title>
      </div>
    );
  }

  return (
    <div>
      <Title level={4} className="mb-6">
        Edit Job Card: {data.data.job_card_number}
      </Title>
      <JobCardForm
        initialData={data.data}
        onSubmit={(formData) => mutation.mutate(formData)}
        loading={mutation.isPending}
        submitText="Update Job Card"
        isEdit
      />
    </div>
  );
}
