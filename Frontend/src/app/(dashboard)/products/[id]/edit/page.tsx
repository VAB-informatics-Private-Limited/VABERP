'use client';

import { Typography, message, Spin } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProductForm } from '@/components/products/ProductForm';
import { getProductById, updateProduct } from '@/lib/api/products';
import { useAuthStore } from '@/stores/authStore';
import { ProductFormValues } from '@/lib/validations/product';

const { Title } = Typography;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await getProductById(productId);
      return response.data;
    },
    enabled: !!enterpriseId && !!productId,
  });

  const mutation = useMutation({
    mutationFn: (formData: ProductFormValues) =>
      updateProduct({
        ...formData,
        id: productId,
        enterprise_id: enterpriseId!,
      }),
    onSuccess: () => {
      message.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-dropdown'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      router.push('/products');
    },
    onError: () => {
      message.error('Failed to update product');
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
        Edit Product
      </Title>
      <ProductForm
        initialData={data}
        onSubmit={(formData) => mutation.mutate(formData)}
        loading={mutation.isPending}
        submitText="Update Product"
      />
    </div>
  );
}
