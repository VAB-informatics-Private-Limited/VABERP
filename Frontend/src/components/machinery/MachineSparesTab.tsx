'use client';

import React, { useEffect, useState } from 'react';
import { Button, Space, Modal, Radio, message, Alert } from 'antd';
import { SaveOutlined, SyncOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions, useAuthStore } from '@/stores/authStore';
import {
  getMachineSpares, saveMachineSpares, suggestSpares, saveAsTemplate,
} from '@/lib/api/spare-parts';
import { SparesEditableTable, SpareRow } from './SparesEditableTable';
import type { Machine } from '@/lib/api/machinery';

interface Props {
  machineId: number;
  machine: Machine;
}

export function MachineSparesTab({ machineId, machine }: Props) {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const isAdmin = userType === 'enterprise';
  const canEdit = isAdmin || hasPermission('machinery_management', 'spares', 'edit');
  const canCreate = isAdmin || hasPermission('machinery_management', 'spares', 'create');

  const qc = useQueryClient();
  const [rows, setRows] = useState<SpareRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [templateScope, setTemplateScope] = useState<'model' | 'category' | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['machine-spares', machineId],
    queryFn: () => getMachineSpares(machineId),
    enabled: !!machineId,
  });

  // Seed local state from server
  useEffect(() => {
    if (!existing) return;
    const seeded: SpareRow[] = existing.map((ms) => ({
      spare_part_id: ms.spare_part_id,
      part_code: ms.spare_part?.part_code ?? '—',
      name: ms.spare_part?.name ?? '—',
      unit: ms.spare_part?.unit ?? 'pcs',
      quantity: ms.quantity,
      notes: ms.notes,
      current_stock: ms.spare_part?.current_stock,
      source: ms.source,
    }));
    setRows(seeded);
    setDirty(false);
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveMachineSpares(
        machineId,
        rows.map((r) => ({
          sparePartId: r.spare_part_id,
          quantity: r.quantity,
          notes: r.notes,
          source: r.source,
        })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machine-spares', machineId] });
      setDirty(false);
      message.success('Spare parts saved');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to save'),
  });

  const loadSuggestedMut = useMutation({
    mutationFn: () => suggestSpares({ modelNumber: machine.model_number, categoryId: machine.category_id }),
    onSuccess: (res) => {
      if (res.items.length === 0) {
        message.info('No template suggestions found');
        return;
      }
      const existingIds = new Set(rows.map((r) => r.spare_part_id));
      const merged: SpareRow[] = [...rows];
      for (const it of res.items) {
        if (existingIds.has(it.spare_part_id)) continue;
        merged.push({
          spare_part_id: it.spare_part_id,
          part_code: it.part_code,
          name: it.name,
          unit: it.unit,
          quantity: it.default_quantity,
          notes: it.notes,
          is_mandatory: it.is_mandatory,
          current_stock: it.current_stock,
          source: res.source === 'model' ? 'template_model' : 'template_category',
        });
      }
      setRows(merged);
      setDirty(true);
      message.success(`Added ${merged.length - rows.length} suggested part(s) from ${res.source} template`);
    },
    onError: () => message.error('Failed to load suggestions'),
  });

  const templateMut = useMutation({
    mutationFn: (scope: 'model' | 'category') => saveAsTemplate(machineId, scope),
    onSuccess: (res, scope) => {
      message.success(`Saved ${res.upserted} part(s) as ${scope} template`);
      setTemplateScope(null);
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to save template'),
  });

  const handleRowsChange = (next: SpareRow[]) => {
    setRows(next);
    setDirty(true);
  };

  if (isLoading) return <div className="py-6 text-center text-gray-400">Loading spare parts…</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <Space wrap>
          {canEdit && (
            <Button
              icon={<SyncOutlined />}
              onClick={() => loadSuggestedMut.mutate()}
              loading={loadSuggestedMut.isPending}
            >
              Load Suggested from Template
            </Button>
          )}
          {canCreate && rows.length > 0 && (
            <Button
              icon={<CloudUploadOutlined />}
              onClick={() => setTemplateScope('model')}
            >
              Save as Template
            </Button>
          )}
        </Space>
        {canEdit && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => saveMut.mutate()}
            loading={saveMut.isPending}
            disabled={!dirty}
          >
            Save Changes
          </Button>
        )}
      </div>

      {dirty && (
        <Alert
          type="warning"
          showIcon
          message="You have unsaved changes"
          className="mb-3"
          closable={false}
        />
      )}

      <SparesEditableTable rows={rows} onChange={handleRowsChange} readOnly={!canEdit} />

      {/* Save-as-template scope dialog */}
      <Modal
        title="Save current spare parts as template"
        open={!!templateScope}
        onCancel={() => setTemplateScope(null)}
        onOk={() => templateScope && templateMut.mutate(templateScope)}
        confirmLoading={templateMut.isPending}
        okText="Save Template"
      >
        <p className="text-sm text-gray-500 mb-3">
          Future machines matching the chosen scope will auto-suggest these parts.
        </p>
        <Radio.Group
          value={templateScope}
          onChange={(e) => setTemplateScope(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value="model" disabled={!machine.model_number}>
              Model: <b>{machine.model_number ?? '—'}</b>
            </Radio>
            <Radio value="category" disabled={!machine.category_id}>
              Category: <b>{machine.category?.name ?? '—'}</b>
            </Radio>
          </Space>
        </Radio.Group>
      </Modal>
    </div>
  );
}

export default MachineSparesTab;
