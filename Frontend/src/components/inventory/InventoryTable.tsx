'use client';

import { Table, Button, Tag, Space, Progress } from 'antd';
import { PlusOutlined, MinusOutlined, HistoryOutlined } from '@ant-design/icons';
import { Inventory } from '@/types/inventory';
import type { ColumnsType } from 'antd/es/table';

interface InventoryTableProps {
  data: Inventory[];
  loading: boolean;
  onStockIn: (inventory: Inventory) => void;
  onStockOut: (inventory: Inventory) => void;
  onViewHistory: (inventory: Inventory) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function InventoryTable({
  data,
  loading,
  onStockIn,
  onStockOut,
  onViewHistory,
  pagination,
}: InventoryTableProps) {
  const getStockStatus = (inventory: Inventory) => {
    const { quantity, min_stock_level, max_stock_level } = inventory;
    if (quantity === 0) {
      return { color: 'default', text: 'Out of Stock' };
    }
    if (min_stock_level && quantity <= min_stock_level) {
      return { color: 'red', text: 'Low Stock' };
    }
    if (max_stock_level && quantity >= max_stock_level) {
      return { color: 'orange', text: 'Overstocked' };
    }
    return { color: 'green', text: 'In Stock' };
  };

  const getStockPercentage = (inventory: Inventory) => {
    const { quantity, max_stock_level } = inventory;
    if (!max_stock_level) return 50;
    return Math.min((quantity / max_stock_level) * 100, 100);
  };

  const columns: ColumnsType<Inventory> = [
    {
      title: 'Product',
      key: 'product',
      sorter: (a, b) => (a.product_name || '').localeCompare(b.product_name || ''),
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          <div className="text-gray-400 text-xs">
            {[record.category_name, record.subcategory_name].filter(Boolean).join(' > ')}
          </div>
          {record.product_code && (
            <div className="text-gray-400 text-xs">SKU: {record.product_code}</div>
          )}
        </div>
      ),
    },
    {
      title: 'HSN Code',
      dataIndex: 'hsn_code',
      key: 'hsn_code',
      width: 110,
      render: (text) => text || '-',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0),
      render: (quantity, record) => (
        <div>
          <div className="font-semibold text-lg">
            {quantity} {record.unit || 'units'}
          </div>
          <Progress
            percent={getStockPercentage(record)}
            size="small"
            showInfo={false}
            strokeColor={getStockStatus(record).color === 'default' ? '#d9d9d9' : getStockStatus(record).color}
          />
        </div>
      ),
    },
    {
      title: 'Stock Level',
      key: 'stock_level',
      width: 110,
      sorter: (a, b) => (Number(a.min_stock_level) || 0) - (Number(b.min_stock_level) || 0),
      render: (_, record) => (
        <div className="text-sm">
          <div>Min: {record.min_stock_level || '-'}</div>
          <div>Max: {record.max_stock_level || '-'}</div>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      sorter: (a, b) => (a.location || '').localeCompare(b.location || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const status = getStockStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => onStockIn(record)}
          >
            In
          </Button>
          <Button
            size="small"
            danger
            icon={<MinusOutlined />}
            onClick={() => onStockOut(record)}
          >
            Out
          </Button>
          <Button
            type="text"
            icon={<HistoryOutlined />}
            onClick={() => onViewHistory(record)}
          />
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
      scroll={{ x: 1200 }}
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            }
          : false
      }
    />
  );
}
