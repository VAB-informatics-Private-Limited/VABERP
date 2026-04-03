'use client';

import { Row, Col, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { CRM_STATUS_OPTIONS } from '@/types/crm';

interface Props {
  search: string;
  status: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}

export function LeadFilters({ search, status, onSearchChange, onStatusChange }: Props) {
  return (
    <Row gutter={[12, 12]} className="mb-4">
      <Col xs={24} sm={12} md={8}>
        <Input
          placeholder="Search name, mobile, email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          allowClear
        />
      </Col>
      <Col xs={24} sm={8} md={6}>
        <Select
          placeholder="Filter by status"
          value={status || undefined}
          onChange={v => onStatusChange(v || '')}
          allowClear
          style={{ width: '100%' }}
          options={CRM_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        />
      </Col>
    </Row>
  );
}
