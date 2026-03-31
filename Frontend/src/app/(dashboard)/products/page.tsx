'use client';

import { useState } from 'react';
import { Typography, Button, Card, Select, Space, Input } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProductTable } from '@/components/products/ProductTable';
import { getProductList, getDropdownCategoryList } from '@/lib/api/products';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function ProductsPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();

  const { data: categories } = useQuery({
    queryKey: ['categories-dropdown', enterpriseId],
    queryFn: () => getDropdownCategoryList(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', enterpriseId, page, pageSize, categoryFilter, searchText],
    queryFn: () =>
      getProductList({
        enterpriseId: enterpriseId!,
        page,
        pageSize,
        categoryId: categoryFilter,
        searchText: searchText || undefined,
      }),
    enabled: !!enterpriseId,
  });

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">
          Products
        </Title>
        <div className="flex flex-wrap gap-2">
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'product_code', title: 'Code' },
              { key: 'product_name', title: 'Name' },
              { key: 'category_name', title: 'Category' },
              { key: 'subcategory_name', title: 'Subcategory' },
              { key: 'hsn_code', title: 'HSN' },
              { key: 'price', title: 'Price' },
              { key: 'status', title: 'Status' },
            ]}
            filename="products"
            title="Products"
            disabled={!data?.data?.length}
          />
          {hasPermission('catalog', 'products', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/products/add')}>
              Add Product
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search products..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => setPage(1)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="Filter by Category"
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
            allowClear
            style={{ width: 200 }}
          >
            {categories?.data?.map((cat) => (
              <Select.Option key={cat.id} value={cat.id}>
                {cat.category_name}
              </Select.Option>
            ))}
          </Select>
          <Button onClick={() => router.push('/products/categories')}>
            Manage Categories
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <ProductTable
          data={data?.data || []}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.totalRecords || 0,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
              }
            },
          }}
        />
      </Card>
    </div>
  );
}
