'use client';

import { useState } from 'react';
import { Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { EnquiryTable } from '@/components/enquiries/EnquiryTable';
import { EnquiryFilters } from '@/components/enquiries/EnquiryFilters';
import { getEnquiryList } from '@/lib/api/enquiries';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import { InterestStatus } from '@/types/enquiry';
import ExportDropdown from '@/components/common/ExportDropdown';

export default function EnquiriesPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<{
    customerName?: string;
    customerMobile?: string;
    interestStatus?: InterestStatus;
    source?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', enterpriseId, page, pageSize, filters],
    queryFn: () =>
      getEnquiryList({
        enterpriseId: enterpriseId!,
        page,
        pageSize,
        ...filters,
      }),
    enabled: !!enterpriseId,
  });

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start mb-6 gap-3">
        <div>
          <h1 className="page-header-title">Enquiries</h1>
          <p className="page-header-subtitle">Track and manage customer enquiries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'customer_name', title: 'Customer' },
              { key: 'customer_mobile', title: 'Mobile' },
              { key: 'source', title: 'Source' },
              { key: 'interest_status', title: 'Status' },
              { key: 'employee_name', title: 'Assigned To' },
              { key: 'created_date', title: 'Date' },
            ]}
            filename="enquiries"
            title="Enquiries"
            disabled={!data?.data?.length}
          />
          {hasPermission('enquiry', 'enquiries', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/enquiries/add')}>
              Add Enquiry
            </Button>
          )}
        </div>
      </div>

      <EnquiryFilters
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
        <EnquiryTable
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
