'use client';

import { Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { JobCardForm } from '@/components/manufacturing/JobCardForm';
import { addJobCard } from '@/lib/api/manufacturing';
import { useAuthStore } from '@/stores/authStore';
import { JobCardFormData } from '@/types/manufacturing';

const { Title } = Typography;

export default function CreateJobCardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId, getEmployeeId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const employeeId = getEmployeeId();

  const mutation = useMutation({
    mutationFn: (data: JobCardFormData) =>
      addJobCard({
        ...data,
        enterprise_id: enterpriseId!,
        created_by: employeeId!,
      }),
    onSuccess: (response) => {
      const jobData = response.data as any;
      const jobNumber = jobData?.jobNumber || jobData?.job_card_number || 'New';
      const hasMaterials = mutation.variables?.materials && mutation.variables.materials.length > 0;
      if (hasMaterials) {
        message.success(
          `Job Card ${jobNumber} created! You can now send it for inventory approval from the job card page.`,
          5,
        );
      } else {
        message.success(`Job Card ${jobNumber} created successfully`);
      }
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      // Navigate to the job card detail page
      const jobId = jobData?.id;
      if (jobId) {
        router.push(`/manufacturing/${jobId}`);
      } else {
        router.push('/manufacturing');
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to create job card');
    },
  });

  return (
    <div>
      <Title level={4} className="mb-6">
        Create Job Card
      </Title>
      <JobCardForm
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
        submitText="Create Job Card"
      />
    </div>
  );
}
