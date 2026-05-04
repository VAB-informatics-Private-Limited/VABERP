'use client';

import { Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { addCustomer } from '@/lib/api/customers';
import { useAuthStore } from '@/stores/authStore';
import { CustomerFormValues } from '@/lib/validations/customer';

const { Title } = Typography;

export default function AddCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const mutation = useMutation({
    mutationFn: (data: CustomerFormValues) =>
      addCustomer({ ...data, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Customer added successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      message.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to add customer');
    },
  });

  return (
    <div>
      <Title level={4} className="mb-6">
        Add New Customer
      </Title>
      <CustomerForm
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
        submitText="Add Customer"
      />
    </div>
  );
}
