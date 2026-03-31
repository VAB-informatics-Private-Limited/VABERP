'use client';

import { Table, Button, Tag, Space, Popconfirm, message, Dropdown, Modal, Badge, Typography } from 'antd';
import dayjs from 'dayjs';
import { EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, FilePdfOutlined, SendOutlined, ShoppingCartOutlined, HistoryOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Quotation, QUOTATION_STATUS_OPTIONS } from '@/types/quotation';
import { deleteQuotation, updateQuotationStatus, acceptQuotation } from '@/lib/api/quotations';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';

interface QuotationTableProps {
  data: Quotation[];
  loading: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function QuotationTable({ data, loading, pagination }: QuotationTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQuotation(id, enterpriseId!),
    onSuccess: () => {
      message.success('Quotation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: () => {
      message.error('Failed to delete quotation');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateQuotationStatus(id, status, enterpriseId!),
    onSuccess: () => {
      message.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: () => {
      message.error('Failed to update status');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => acceptQuotation(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      const soId = result?.data?.sales_order_id;
      Modal.success({
        title: 'Purchase Order Created!',
        content: 'The quotation has been accepted and a Purchase Order has been created.',
        okText: 'Go to Purchase Order',
        cancelText: 'Stay Here',
        onOk: () => soId && router.push(`/purchase-orders/${soId}`),
      });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to accept quotation');
    },
  });

  const getStatusColor = (status: string) => {
    const option = QUOTATION_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const option = QUOTATION_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.label || status;
  };

  const getStatusMenuItems = (id: number, currentStatus: string) => {
    return QUOTATION_STATUS_OPTIONS.filter((s) => s.value !== currentStatus).map((s) => ({
      key: s.value,
      label: s.label,
      onClick: () => statusMutation.mutate({ id, status: s.value }),
    }));
  };

  const columns: ColumnsType<Quotation> = [
    {
      title: 'Quotation #',
      dataIndex: 'quotation_number',
      key: 'quotation_number',
      sorter: (a, b) => a.quotation_number.localeCompare(b.quotation_number),
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-600">{text}</span>
          <Tag
            color={record.current_version > 1 ? 'purple' : 'default'}
            className="text-xs font-semibold"
            icon={record.current_version > 1 ? <HistoryOutlined /> : undefined}
          >
            v{record.current_version}
          </Tag>
          {record.sales_order_id && (
            <Tag color="green" icon={<CheckCircleOutlined />} className="text-xs font-semibold">
              In PO
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      sorter: (a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.customer_name}</div>
          {record.business_name && (
            <div className="text-gray-500 text-sm">{record.business_name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'quotation_date',
      key: 'quotation_date',
      sorter: (a, b) => a.quotation_date.localeCompare(b.quotation_date),
    },
    {
      title: 'Valid Until',
      dataIndex: 'valid_until',
      key: 'valid_until',
      render: (date) => {
        if (!date) return '-';
        const isExpired = new Date(date) < new Date();
        return (
          <span className={isExpired ? 'text-red-600' : ''}>
            {date}
          </span>
        );
      },
    },
    {
      title: 'ETA',
      dataIndex: 'expected_delivery',
      key: 'expected_delivery',
      render: (v: string) => {
        if (!v) return <Typography.Text type="secondary">Not set</Typography.Text>;
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        return <Typography.Text type={isOverdue ? 'danger' : undefined}>{dayjs(v).format('DD MMM YYYY')}{isOverdue ? ' ⚠' : ''}</Typography.Text>;
      },
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      sorter: (a, b) => (a.total_amount || 0) - (b.total_amount || 0),
      render: (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: QUOTATION_STATUS_OPTIONS.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      render: (text) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/quotations/${record.id}`)}
          />
          {!record.is_locked && hasPermission('sales', 'quotations', 'edit') && (
            <Button
              type="text"
              icon={<EditOutlined />}
              title="Revise Quotation"
              onClick={() => router.push(`/quotations/${record.id}/edit`)}
            />
          )}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'pdf',
                  icon: <FilePdfOutlined />,
                  label: 'Download PDF',
                  onClick: () => router.push(`/quotations/${record.id}?print=true`),
                },
                ...(record.status === 'draft' && hasPermission('sales', 'quotations', 'edit') ? [{
                  key: 'send',
                  icon: <SendOutlined />,
                  label: 'Mark as Sent',
                  onClick: () => statusMutation.mutate({ id: record.id, status: 'sent' }),
                }] : []),
                ...(['draft', 'sent'].includes(record.status) && hasPermission('sales', 'quotations', 'edit') ? [{
                  key: 'accept',
                  icon: <ShoppingCartOutlined />,
                  label: 'Transfer to Purchase Order',
                  onClick: () => {
                    Modal.confirm({
                      title: 'Transfer to Purchase Order?',
                      content: 'This will accept the quotation and create a Purchase Order. The quotation will be locked and cannot be edited.',
                      okText: 'Yes, Transfer',
                      cancelText: 'Cancel',
                      okButtonProps: { type: 'primary' },
                      onOk: () => acceptMutation.mutateAsync(record.id),
                    });
                  },
                }] : []),
                ...(hasPermission('sales', 'quotations', 'edit') ? [{ type: 'divider' as const }] : []),
                ...(hasPermission('sales', 'quotations', 'edit') ? getStatusMenuItems(record.id, record.status) : []),
                ...(record.status === 'draft' && hasPermission('sales', 'quotations', 'delete') ? [{ type: 'divider' as const }] : []),
                ...(record.status === 'draft' && hasPermission('sales', 'quotations', 'delete') ? [{
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: (
                    <Popconfirm
                      title="Delete Quotation"
                      description="Are you sure you want to delete this quotation?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        deleteMutation.mutate(record.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="Yes"
                      cancelText="No"
                    >
                      <span onClick={(e) => e.stopPropagation()}>Delete</span>
                    </Popconfirm>
                  ),
                  danger: true,
                }] : []),
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
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
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} quotations`,
            }
          : {
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} quotations`,
            }
      }
      scroll={{ x: 1200 }}
    />
  );
}
