'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, Space, DatePicker } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { QuotationTable } from '@/components/quotations/QuotationTable';
import { getQuotationList } from '@/lib/api/quotations';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import { QUOTATION_STATUS_OPTIONS } from '@/types/quotation';
import ExportDropdown from '@/components/common/ExportDropdown';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

export default function QuotationsPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<{
    customerName?: string;
    quotationNumber?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', enterpriseId, page, pageSize, filters],
    queryFn: () =>
      getQuotationList({
        enterpriseId: enterpriseId!,
        page,
        pageSize,
        ...filters,
      }),
    enabled: !!enterpriseId,
  });

  const handleSearch = () => {
    setFilters({
      customerName: searchText || undefined,
      quotationNumber: searchText || undefined,
      status: statusFilter,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
    });
    setPage(1);
  };

  const handleClear = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setDateRange(null);
    setFilters({});
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start mb-6 gap-3">
        <div>
          <h1 className="page-header-title">Quotations</h1>
          <p className="page-header-subtitle">Create and manage customer quotations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'quotation_number', title: 'Quotation #' },
              { key: 'customer_name', title: 'Customer' },
              { key: 'quotation_date', title: 'Date' },
              { key: 'valid_until', title: 'Valid Until' },
              { key: 'total_amount', title: 'Total' },
              { key: 'status', title: 'Status' },
            ]}
            filename="quotations"
            title="Quotations"
            disabled={!data?.data?.length}
          />
          {hasPermission('sales', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/quotations/create')}>
              Create Quotation
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl mb-4 border border-slate-100 shadow-sm">
        <Space wrap>
          <Input
            placeholder="Search by customer or quotation #"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            allowClear
          >
            {QUOTATION_STATUS_OPTIONS.map((s) => (
              <Select.Option key={s.value} value={s.value}>
                {s.label}
              </Select.Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            format="DD-MM-YYYY"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            Search
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClear}>
            Clear
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <QuotationTable
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
