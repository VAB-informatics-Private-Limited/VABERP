'use client';

import { Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductForm } from '@/components/products/ProductForm';
import { addProduct } from '@/lib/api/products';
import { useAuthStore } from '@/stores/authStore';
import { ProductFormValues } from '@/lib/validations/product';

const { Title } = Typography;

export default function AddProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const mutation = useMutation({
    mutationFn: (data: ProductFormValues) =>
      addProduct({ ...data, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Product added successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-dropdown'] });
      router.push('/products');
    },
    onError: () => {
      message.error('Failed to add product');
    },
  });

  return (
    <div>
      <Title level={4} className="mb-6">
        Add New Product
      </Title>
      <ProductForm
        onSubmit={(data) => mutation.mutate(data)}
        loading={mutation.isPending}
        submitText="Add Product"
      />
    </div>
  );
}
