'use client';

import { Typography, message, Spin } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { getCustomerById, updateCustomer } from '@/lib/api/customers';
import { useAuthStore } from '@/stores/authStore';
import { CustomerFormValues } from '@/lib/validations/customer';

const { Title } = Typography;

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data, isLoading, isPending } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerById(customerId, enterpriseId!),
    enabled: !!enterpriseId && !!customerId,
  });

  const mutation = useMutation({
    mutationFn: (formData: CustomerFormValues) => {
      const payload = {
        ...formData,
        id: customerId,
        enterprise_id: enterpriseId!,
      };
      console.log('Updating customer with payload:', payload);
      return updateCustomer(payload);
    },
    onSuccess: () => {
      message.success('Customer updated successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      router.push('/customers');
    },
    onError: (error: any) => {
      console.error('Customer update error:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.response?.status);
      const msg = error?.response?.data?.message || error?.message || 'Failed to update customer';
      message.error(msg);
    },
  });

  if (isLoading || isPending || !data?.data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} className="mb-6">
        Edit Customer
      </Title>
      <CustomerForm
        initialData={data?.data}
        onSubmit={(formData) => mutation.mutate(formData)}
        loading={mutation.isPending}
        submitText="Update Customer"
      />
    </div>
  );
}
