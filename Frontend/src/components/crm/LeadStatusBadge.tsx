'use client';

import { Tag } from 'antd';
import { CrmLeadStatus, CRM_STATUS_OPTIONS } from '@/types/crm';

interface Props {
  status: CrmLeadStatus | string;
}

export function LeadStatusBadge({ status }: Props) {
  const opt = CRM_STATUS_OPTIONS.find(o => o.value === status);
  return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
}
