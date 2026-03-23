'use client';

import { Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { addEmployeeWithPermissions } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { EmployeeFormData } from '@/types/employee';
import { MenuPermissions } from '@/types/auth';

const { Title } = Typography;

export default function AddEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const mutation = useMutation({
    mutationFn: ({ data, permissions }: { data: EmployeeFormData; permissions?: MenuPermissions }) =>
      addEmployeeWithPermissions({ ...data, enterprise_id: enterpriseId! }, permissions),
    onSuccess: () => {
      message.success('Employee added successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.push('/employees');
    },
    onError: () => {
      message.error('Failed to add employee');
    },
  });

  return (
    <div>
      <Title level={4} className="mb-6">
        Add New Employee
      </Title>
      <EmployeeForm
        onSubmit={(data, permissions) => mutation.mutate({ data: data as EmployeeFormData, permissions })}
        loading={mutation.isPending}
        submitText="Add Employee"
        showPermissions
      />
    </div>
  );
}
