'use client';

import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import { usePermissions } from '@/stores/authStore';
import type { ColumnsType } from 'antd/es/table';

interface ProductTableProps {
  data: Product[];
  loading: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onDelete?: (id: number) => void;
}

export function ProductTable({ data, loading, pagination, onDelete }: ProductTableProps) {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const columns: ColumnsType<Product> = [
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      key: 'product_name',
      sorter: (a, b) => a.product_name.localeCompare(b.product_name),
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          {record.product_code && (
            <div className="text-gray-500 text-sm">SKU: {record.product_code}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      sorter: (a, b) => (a.category_name || '').localeCompare(b.category_name || ''),
      render: (_, record) => (
        <div>
          <div>{record.category_name}</div>
          {record.subcategory_name && (
            <div className="text-gray-500 text-sm">{record.subcategory_name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'HSN Code',
      dataIndex: 'hsn_code',
      key: 'hsn_code',
      sorter: (a, b) => (a.hsn_code || '').localeCompare(b.hsn_code || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      sorter: (a, b) => (a.unit || '').localeCompare(b.unit || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
      render: (price) => (price ? `₹${price}` : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {hasPermission('catalog', 'products', 'edit') && (
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/products/${record.id}/attributes`); }}
              title="Manage Attributes"
            />
          )}
          {hasPermission('catalog', 'products', 'edit') && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/products/${record.id}/edit`); }}
            />
          )}
          {onDelete && hasPermission('catalog', 'products', 'delete') && (
            <Popconfirm
              title="Delete Product"
              description="Are you sure you want to delete this product?"
              onConfirm={() => onDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      onRow={(record) => ({
        onClick: () => router.push(`/products/${record.id}/edit`),
        style: { cursor: 'pointer' },
      })}
      scroll={{ x: 900 }}
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`,
            }
          : false
      }
    />
  );
}
