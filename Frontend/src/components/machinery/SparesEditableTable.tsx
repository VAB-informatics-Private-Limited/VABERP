'use client';

import React, { useState } from 'react';
import { Table, Button, InputNumber, Input, Tag, Space, Tooltip, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { SparePartPicker } from './SparePartPicker';
import type { SparePart } from '@/lib/api/spare-parts';

export interface SpareRow {
  spare_part_id: number;
  part_code: string;
  name: string;
  unit: string;
  quantity: number;
  notes?: string;
  is_mandatory?: boolean;
  current_stock?: number;
  source?: string;
}

interface Props {
  rows: SpareRow[];
  onChange: (rows: SpareRow[]) => void;
  readOnly?: boolean;
  emptyHint?: React.ReactNode;
}

export function SparesEditableTable({ rows, onChange, readOnly, emptyHint }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const updateRow = (id: number, patch: Partial<SpareRow>) => {
    onChange(rows.map((r) => (r.spare_part_id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: number) => {
    onChange(rows.filter((r) => r.spare_part_id !== id));
  };

  const handlePick = (part: SparePart) => {
    const existing = rows.find((r) => r.spare_part_id === part.id);
    if (existing) {
      updateRow(part.id, { quantity: existing.quantity + 1 });
    } else {
      onChange([
        ...rows,
        {
          spare_part_id: part.id,
          part_code: part.part_code,
          name: part.name,
          unit: part.unit,
          quantity: 1,
          current_stock: part.current_stock,
          source: 'manual',
        },
      ]);
    }
    setPickerOpen(false);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'part_code',
      width: 120,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: 'Part',
      dataIndex: 'name',
      render: (name: string, r: SpareRow) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="flex gap-1 mt-1">
            {r.is_mandatory && <Tag color="red">Mandatory</Tag>}
            {r.source === 'template_model' && <Tag color="blue">Model template</Tag>}
            {r.source === 'template_category' && <Tag color="cyan">Category template</Tag>}
          </div>
        </div>
      ),
    },
    { title: 'Unit', dataIndex: 'unit', width: 70 },
    {
      title: 'Stock',
      dataIndex: 'current_stock',
      width: 80,
      render: (v?: number) => (v !== undefined ? v.toLocaleString() : '—'),
    },
    {
      title: 'Qty',
      width: 110,
      render: (_: any, r: SpareRow) =>
        readOnly ? (
          <span>{r.quantity}</span>
        ) : (
          <InputNumber
            min={0.01}
            step={1}
            value={r.quantity}
            onChange={(v) => updateRow(r.spare_part_id, { quantity: Number(v) || 0 })}
            style={{ width: '100%' }}
          />
        ),
    },
    {
      title: 'Notes',
      render: (_: any, r: SpareRow) =>
        readOnly ? (
          <span>{r.notes ?? '—'}</span>
        ) : (
          <Input
            placeholder="Optional"
            value={r.notes}
            onChange={(e) => updateRow(r.spare_part_id, { notes: e.target.value })}
          />
        ),
    },
    ...(readOnly
      ? []
      : [
          {
            title: '',
            width: 60,
            render: (_: any, r: SpareRow) => (
              <Tooltip title="Remove">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeRow(r.spare_part_id)}
                />
              </Tooltip>
            ),
          },
        ]),
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-gray-500">
          {rows.length} part{rows.length === 1 ? '' : 's'} selected
        </div>
        {!readOnly && (
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
            Add Part
          </Button>
        )}
      </div>

      <Table
        dataSource={rows}
        columns={columns}
        rowKey="spare_part_id"
        size="small"
        pagination={false}
        locale={{
          emptyText: emptyHint ?? <Empty description="No spare parts added" />,
        }}
      />

      <SparePartPicker
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onSelect={handlePick}
        excludeIds={rows.map((r) => r.spare_part_id)}
      />
    </>
  );
}

export default SparesEditableTable;
