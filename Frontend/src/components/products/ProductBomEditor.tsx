'use client';

import { Button, Input, InputNumber, Select, Tag, Typography } from 'antd';
import {
  PlusOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getRawMaterialList } from '@/lib/api/raw-materials';
import { ProductBomItemInput } from '@/types/product-bom';

const { Text } = Typography;

interface Props {
  value: ProductBomItemInput[];
  onChange: (items: ProductBomItemInput[]) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  masterLabel?: string;
}

interface EditorRow extends ProductBomItemInput {
  _availableStock?: number;
}

function stripInternal(r: EditorRow): ProductBomItemInput {
  return {
    raw_material_id: r.raw_material_id,
    component_product_id: r.component_product_id,
    item_name: r.item_name,
    required_quantity: r.required_quantity,
    unit_of_measure: r.unit_of_measure,
    is_custom: r.is_custom,
    notes: r.notes,
    sort_order: r.sort_order,
  };
}

export function ProductBomEditor({ value, onChange, notes, onNotesChange, masterLabel }: Props) {
  const { data: rawMaterialsRes } = useQuery({
    queryKey: ['raw-materials-dropdown-for-bom'],
    queryFn: () => getRawMaterialList({ pageSize: 1000 }),
  });
  const rawMaterials = rawMaterialsRes?.data ?? [];

  const items: EditorRow[] = value.map((it) => {
    const rm = it.raw_material_id ? rawMaterials.find((r) => r.id === it.raw_material_id) : undefined;
    return { ...it, _availableStock: rm?.available_stock };
  });

  const update = (idx: number, patch: Partial<EditorRow>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next.map((r) => stripInternal(r)));
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx).map((r) => stripInternal(r)));
  };

  const addRow = () => {
    onChange([
      ...value,
      {
        raw_material_id: null,
        item_name: '',
        required_quantity: 1,
        unit_of_measure: '',
        is_custom: true,
        sort_order: value.length,
      },
    ]);
  };

  const filledCount = items.filter(
    (bi) => (bi.raw_material_id || bi.item_name.trim()) && Number(bi.required_quantity) > 0,
  ).length;

  return (
    <div>
      {masterLabel && (
        <div className="mb-3 text-xs text-gray-500">
          {masterLabel}
        </div>
      )}

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ToolOutlined className="text-2xl text-gray-400" />
          </div>
          <Text strong className="text-base block mb-1">
            No materials added yet
          </Text>
          <Text type="secondary" className="text-sm block mb-4">
            Add raw materials from inventory or enter a custom material name
          </Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={addRow}>
            Add First Material
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((bi, idx) => {
            const hasInventoryPick = !!bi.raw_material_id;
            return (
              <div
                key={idx}
                className={`rounded-lg border transition-all ${
                  hasInventoryPick
                    ? 'bg-green-50 border-green-200'
                    : bi.item_name.trim()
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {idx + 1}
                  </div>
                  <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Material {idx + 1}
                  </Text>
                  <div className="flex-1" />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => remove(idx)}
                  />
                </div>

                <div className="px-3 pb-3 grid grid-cols-1 gap-2">
                  <div>
                    <Text className="text-xs text-gray-500 block mb-1">
                      Select from Inventory
                    </Text>
                    <Select
                      showSearch
                      allowClear
                      placeholder="Search by name or code..."
                      size="large"
                      className="w-full"
                      value={bi.raw_material_id ? `rm_${bi.raw_material_id}` : undefined}
                      filterOption={(input, option) =>
                        String(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (option as any)?.searchtext || '',
                        )
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={(val) => {
                        if (!val) {
                          update(idx, {
                            raw_material_id: null,
                            is_custom: !!bi.item_name.trim(),
                          });
                          return;
                        }
                        const rmId = Number(String(val).replace('rm_', ''));
                        const rm = rawMaterials.find((r) => r.id === rmId);
                        if (rm) {
                          update(idx, {
                            raw_material_id: rm.id,
                            item_name: rm.material_name,
                            unit_of_measure: rm.unit_of_measure || '',
                            is_custom: false,
                          });
                        }
                      }}
                      options={rawMaterials
                        .filter((r) => r.status === 'active')
                        .map((r) => ({
                          value: `rm_${r.id}`,
                          searchtext: `${r.material_name} ${r.material_code || ''}`,
                          label: (
                            <div className="flex justify-between items-center py-0.5">
                              <div>
                                <div className="font-medium text-sm">{r.material_name}</div>
                                {r.material_code && (
                                  <div className="text-xs text-gray-400">{r.material_code}</div>
                                )}
                              </div>
                              <Tag
                                color={Number(r.available_stock) > 0 ? 'green' : 'red'}
                                className="!m-0 text-xs"
                              >
                                {r.available_stock} {r.unit_of_measure || ''}
                              </Tag>
                            </div>
                          ),
                        }))}
                    />
                    {bi.raw_material_id && bi._availableStock != null && (
                      <div className="flex items-center gap-2 mt-1">
                        <Tag color="green" className="!m-0 text-xs" icon={<CheckCircleOutlined />}>
                          Inventory Item
                        </Tag>
                        <Text className="text-xs text-gray-500">
                          Current stock:{' '}
                          <strong>
                            {bi._availableStock} {bi.unit_of_measure}
                          </strong>
                        </Text>
                      </div>
                    )}
                  </div>

                  {!bi.raw_material_id && (
                    <div>
                      <Text className="text-xs text-gray-500 block mb-1">
                        — Or enter custom material name
                      </Text>
                      <Input
                        placeholder="e.g. Steel Rod, Copper Wire..."
                        size="large"
                        value={bi.item_name}
                        onChange={(e) =>
                          update(idx, { item_name: e.target.value, is_custom: true })
                        }
                      />
                      {bi.item_name.trim() && (
                        <Tag color="blue" className="!m-0 text-xs mt-1">
                          Custom Material
                        </Tag>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Text className="text-xs text-gray-500 block mb-1">
                        Required Quantity *
                      </Text>
                      <InputNumber
                        min={0.01}
                        step={1}
                        value={bi.required_quantity}
                        onChange={(val) => update(idx, { required_quantity: Number(val) || 0 })}
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Enter quantity"
                      />
                    </div>
                    <div style={{ width: 140 }}>
                      <Text className="text-xs text-gray-500 block mb-1">Unit of Measure</Text>
                      {bi.raw_material_id ? (
                        <Input size="large" value={bi.unit_of_measure} disabled />
                      ) : (
                        <Input
                          placeholder="kg, pcs, m..."
                          size="large"
                          value={bi.unit_of_measure}
                          onChange={(e) => update(idx, { unit_of_measure: e.target.value })}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            className="!h-12 !border-gray-300 hover:!border-blue-400"
            onClick={addRow}
          >
            Add Another Material
          </Button>
        </div>
      )}

      {onNotesChange && items.length > 0 && (
        <div className="mt-4">
          <Text className="text-xs text-gray-500 block mb-1">BOM Notes (optional)</Text>
          <Input.TextArea
            rows={2}
            value={notes ?? ''}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Internal notes about this BOM"
          />
        </div>
      )}

      {filledCount > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-blue-500" />
            <Text className="text-sm">
              <strong>
                {items.filter((bi) => bi.raw_material_id && Number(bi.required_quantity) > 0).length}
              </strong>{' '}
              inventory item(s)
              {items.filter(
                (bi) =>
                  !bi.raw_material_id &&
                  bi.item_name.trim() &&
                  Number(bi.required_quantity) > 0,
              ).length > 0 && (
                <>
                  ,{' '}
                  <strong>
                    {
                      items.filter(
                        (bi) =>
                          !bi.raw_material_id &&
                          bi.item_name.trim() &&
                          Number(bi.required_quantity) > 0,
                      ).length
                    }
                  </strong>{' '}
                  custom material(s)
                </>
              )}
            </Text>
          </div>
          <Text type="secondary" className="text-xs">
            Ready to save
          </Text>
        </div>
      )}

    </div>
  );
}
