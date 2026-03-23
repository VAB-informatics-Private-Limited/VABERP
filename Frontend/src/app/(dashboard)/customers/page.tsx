'use client';

import { useState } from 'react';
import { Typography, Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CustomerTable } from '@/components/customers/CustomerTable';
import { CustomerFilters } from '@/components/customers/CustomerFilters';
import { getCustomerList } from '@/lib/api/customers';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/stores/authStore';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function CustomersPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<{
    customerName?: string;
    customerMobile?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['customers', enterpriseId, page, pageSize, filters],
    queryFn: () =>
      getCustomerList({
        enterpriseId: enterpriseId!,
        page,
        pageSize,
        ...filters,
      }),
    enabled: !!enterpriseId,
  });

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">
          Customers
        </Title>
        <div className="flex flex-wrap gap-2">
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'customer_name', title: 'Name' },
              { key: 'email', title: 'Email' },
              { key: 'mobile', title: 'Mobile' },
              { key: 'business_name', title: 'Company' },
              { key: 'city', title: 'City' },
              { key: 'state', title: 'State' },
              { key: 'status', title: 'Status' },
              { key: 'created_date', title: 'Created' },
            ]}
            filename="customers"
            title="Customers"
            disabled={!data?.data?.length}
          />
          {hasPermission('sales', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/customers/add')}>
              Add Customer
            </Button>
          )}
        </div>
      </div>

      <CustomerFilters
        onSearch={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        onClear={() => {
          setFilters({});
          setPage(1);
        }}
      />

      <Card className="card-shadow">
        <CustomerTable
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
