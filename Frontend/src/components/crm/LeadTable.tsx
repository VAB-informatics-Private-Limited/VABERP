'use client';

import { Table, Button, Space, Tag, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { CrmLead } from '@/types/crm';
import { LeadStatusBadge } from './LeadStatusBadge';
import dayjs from 'dayjs';

interface Props {
  leads: CrmLead[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onAssign?: (lead: CrmLead) => void;
  onDelete?: (lead: CrmLead) => void;
  canAssign?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function LeadTable({
  leads, loading, total, page, pageSize, onPageChange,
  onAssign, onDelete, canAssign, canEdit, canDelete,
}: Props) {
  const router = useRouter();

  const columns = [
    {
      title: 'Lead #',
      dataIndex: 'lead_number',
      width: 120,
      render: (v: string) => <span className="font-mono text-xs font-semibold text-blue-600">{v}</span>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: unknown, r: CrmLead) => (
        <div>
          <div className="font-medium">{r.customer_name}</div>
          {r.business_name && <div className="text-xs text-gray-400">{r.business_name}</div>}
          {r.mobile && <div className="text-xs text-gray-400">{r.mobile}</div>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (v: string) => <LeadStatusBadge status={v} />,
    },
    {
      title: 'Assigned To',
      key: 'assigned',
      width: 130,
      render: (_: unknown, r: CrmLead) =>
        r.assigned_to_name
          ? <Tag icon={<UserSwitchOutlined />}>{r.assigned_to_name}</Tag>
          : <span className="text-gray-400 text-xs">Unassigned</span>,
    },
    {
      title: 'Next Follow-up',
      dataIndex: 'next_followup_date',
      width: 130,
      render: (v: string | null) => {
        if (!v) return <span className="text-gray-300">—</span>;
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        return (
          <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
            {dayjs(v).format('DD MMM YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Source',
      dataIndex: 'source',
      width: 100,
      render: (v: string | null) => v || <span className="text-gray-300">—</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, r: CrmLead) => (
        <Space size="small">
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); router.push(`/crm/${r.id}`); }} />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); router.push(`/crm/${r.id}/edit`); }} />
            </Tooltip>
          )}
          {canAssign && onAssign && (
            <Tooltip title="Assign">
              <Button size="small" icon={<UserSwitchOutlined />} onClick={(e) => { e.stopPropagation(); onAssign(r); }} />
            </Tooltip>
          )}
          {canDelete && onDelete && (
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onDelete(r); }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={leads}
      rowKey="id"
      loading={loading}
      size="small"
      onRow={(record) => ({
        onClick: () => router.push(`/crm/${record.id}`),
        style: { cursor: 'pointer' },
      })}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (t) => `${t} leads`,
        onChange: onPageChange,
      }}
    />
  );
}
