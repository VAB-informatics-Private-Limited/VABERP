'use client';

import { useState } from 'react';
import {
  Typography,
  Button,
  Card,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Tooltip,
} from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getServiceProducts } from '@/lib/api/service-products';
import { getProductTypes } from '@/lib/api/product-types';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ServiceProduct } from '@/types/service-product';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function ServiceProductsPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [productTypeId, setProductTypeId] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['service-products', page, search, status, productTypeId],
    queryFn: () => getServiceProducts({ page, limit: 20, search: search || undefined, status, productTypeId }),
    enabled: !!enterpriseId,
  });

  const { data: ptData } = useQuery({
    queryKey: ['product-types'],
    queryFn: getProductTypes,
    enabled: !!enterpriseId,
  });

  const warrantyStatus = (sp: ServiceProduct) => {
    if (!sp.warranty_end_date) return null;
    const daysLeft = dayjs(sp.warranty_end_date).diff(dayjs(), 'day');
    if (daysLeft < 0) return <Tag color="red">Expired</Tag>;
    if (daysLeft <= 30) return <Tag color="orange">Expiring Soon</Tag>;
    return <Tag color="green">Active</Tag>;
  };

  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, sp: ServiceProduct) => (
        <div>
          <div className="font-medium">{sp.customer_name || '—'}</div>
          <div className="text-xs text-gray-400">{sp.customer_mobile || ''}</div>
        </div>
      ),
    },
    {
      title: 'Product Type',
      key: 'product_type',
      render: (_: any, sp: ServiceProduct) => sp.product_type?.name || <span className="text-gray-400">Unassigned</span>,
    },
    {
      title: 'Serial No.',
      dataIndex: 'serial_number',
      key: 'serial_number',
      render: (v: string) => v || <span className="text-gray-400">—</span>,
    },
    {
      title: 'Dispatch Date',
      dataIndex: 'dispatch_date',
      key: 'dispatch_date',
      render: (v: string) => dayjs(v).format('DD MMM YYYY'),
    },
    {
      title: 'Warranty',
      key: 'warranty',
      render: (_: any, sp: ServiceProduct) => (
        <div>
          {warrantyStatus(sp)}
          {sp.warranty_end_date && (
            <div className="text-xs text-gray-400">Until {dayjs(sp.warranty_end_date).format('DD MMM YYYY')}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, sp: ServiceProduct) => (
        <Tooltip title="View Details">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/service-products/${sp.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">Registered Products</Title>
        {hasPermission('service_management', 'service_products', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/service-products/add')}>
            Register Product
          </Button>
        )}
      </div>

      <Card className="mb-4">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Input
              placeholder="Search customer name, mobile, serial…"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={4}>
            <Select
              placeholder="Product Type"
              allowClear
              style={{ width: '100%' }}
              value={productTypeId}
              onChange={(v) => { setProductTypeId(v); setPage(1); }}
              options={(ptData?.data ?? []).map((pt) => ({ value: pt.id, label: pt.name }))}
            />
          </Col>
          <Col xs={12} sm={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={data?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.totalRecords ?? 0,
            onChange: setPage,
            showTotal: (total) => `${total} products`,
          }}
        />
      </Card>
    </div>
  );
}
