'use client';

import React, { useEffect } from 'react';
import { Alert, Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { suggestSpares } from '@/lib/api/spare-parts';
import { SparesEditableTable, SpareRow } from './SparesEditableTable';

interface Props {
  modelNumber?: string;
  categoryId?: number;
  rows: SpareRow[];
  onChange: (rows: SpareRow[]) => void;
}

export function SuggestedSparesStep({ modelNumber, categoryId, rows, onChange }: Props) {
  const scopeKey = `${modelNumber ?? ''}|${categoryId ?? ''}`;

  const { data, isLoading } = useQuery({
    queryKey: ['spare-suggestion', scopeKey],
    queryFn: () => suggestSpares({ modelNumber, categoryId }),
    enabled: Boolean(modelNumber || categoryId),
    staleTime: 30_000,
  });

  // Seed rows with suggestions on first fetch
  useEffect(() => {
    if (!data) return;
    if (rows.length > 0) return;
    if (data.items.length === 0) return;

    const seeded: SpareRow[] = data.items.map((it) => ({
      spare_part_id: it.spare_part_id,
      part_code: it.part_code,
      name: it.name,
      unit: it.unit,
      quantity: it.default_quantity,
      notes: it.notes,
      is_mandatory: it.is_mandatory,
      current_stock: it.current_stock,
      source: data.source === 'model' ? 'template_model' : 'template_category',
    }));
    onChange(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  let banner: React.ReactNode = null;
  if (!isLoading && data) {
    if (data.source === 'model') {
      banner = (
        <Alert
          type="success"
          showIcon
          message={`Suggestions from model template (${modelNumber})`}
          description="These parts are the recommended kit for this model. Adjust quantities or remove as needed."
          className="mb-4"
        />
      );
    } else if (data.source === 'category') {
      banner = (
        <Alert
          type="info"
          showIcon
          message="Suggestions from category fallback template"
          description="No model-specific template exists — showing category-level recommendations. Adjust as needed."
          className="mb-4"
        />
      );
    } else {
      banner = (
        <Alert
          type="warning"
          showIcon
          message="No template found"
          description="No spare-parts template is defined for this model or category yet. Add parts manually, or save after creation to seed a new template."
          className="mb-4"
        />
      );
    }
  }

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  return (
    <div>
      {banner}
      <SparesEditableTable rows={rows} onChange={onChange} />
    </div>
  );
}

export default SuggestedSparesStep;
