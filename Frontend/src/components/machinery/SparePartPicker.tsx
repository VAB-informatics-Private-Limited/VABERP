'use client';

import React, { useState } from 'react';
import { Modal, Input, Table, Tag, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { listSpareParts, SparePart } from '@/lib/api/spare-parts';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSelect: (part: SparePart) => void;
  excludeIds?: number[];
}

export function SparePartPicker({ open, onCancel, onSelect, excludeIds = [] }: Props) {
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['spare-parts-picker', search],
    queryFn: () => listSpareParts({ search: search || undefined, status: 'active', limit: 50 }),
    enabled: open,
  });

  const rows = (data?.data ?? []).filter((p: SparePart) => !excludeIds.includes(p.id));

  const columns = [
    {
      title: 'Code',
      dataIndex: 'part_code',
      width: 140,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, r: SparePart) => (
        <div>
          <div className="font-medium">{name}</div>
          {r.manufacturer && (
            <div className="text-xs text-gray-400">{r.manufacturer}</div>
          )}
        </div>
      ),
    },
    { title: 'Unit', dataIndex: 'unit', width: 80 },
    {
      title: 'Stock',
      width: 90,
      render: (_: any, r: SparePart) => (
        <span className={r.current_stock <= r.min_stock ? 'text-red-500 font-medium' : ''}>
          {r.current_stock.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'unit_price',
      width: 90,
      render: (v: number) => `₹${v.toLocaleString()}`,
    },
  ];

  return (
    <Modal
      title="Select Spare Part"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={780}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.Search
          placeholder="Search by code, name, OEM/alt part number..."
          allowClear
          onSearch={(v) => setSearch(v)}
          onChange={(e) => !e.target.value && setSearch('')}
        />
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="id"
          loading={isFetching}
          size="small"
          pagination={{ pageSize: 10 }}
          onRow={(r) => ({
            onClick: () => onSelect(r),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: 'No spare parts found. Create parts from the catalog first.' }}
        />
      </Space>
    </Modal>
  );
}

export default SparePartPicker;
