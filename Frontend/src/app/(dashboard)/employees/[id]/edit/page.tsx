'use client';

import { Typography, message, Spin } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { getEmployees, updateEmployee } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { EmployeeFormData } from '@/types/employee';

const { Title } = Typography;

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const response = await getEmployees(enterpriseId!);
      return response.data?.find((e) => e.id === employeeId);
    },
    enabled: !!enterpriseId && !!employeeId,
  });

  const mutation = useMutation({
    mutationFn: (formData: EmployeeFormData) =>
      updateEmployee({
        ...formData,
        id: employeeId,
        enterprise_id: enterpriseId!,
      }),
    onSuccess: () => {
      message.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.push('/employees');
    },
    onError: () => {
      message.error('Failed to update employee');
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
        Edit Employee
      </Title>
      <EmployeeForm
        initialData={data}
        onSubmit={(formData) => mutation.mutate(formData as EmployeeFormData)}
        loading={mutation.isPending}
        submitText="Update Employee"
        isEdit
      />
    </div>
  );
}
