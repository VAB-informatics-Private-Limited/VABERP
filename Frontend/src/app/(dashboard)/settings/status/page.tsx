'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, InputNumber, Switch, message, Popconfirm, Tag, ColorPicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import type { Color } from 'antd/es/color-picker';
import { getInterestStatuses, addInterestStatus, updateInterestStatus, deleteInterestStatus } from '@/lib/api/settings';
import { useAuthStore } from '@/stores/authStore';
import { InterestStatusConfig, DEFAULT_STATUS_COLORS } from '@/types/settings';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function InterestStatusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<InterestStatusConfig | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['interest-statuses', enterpriseId],
    queryFn: () => getInterestStatuses(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const addMutation = useMutation({
    mutationFn: (values: { status_name: string; status_code: string; color: string; sequence_order: number }) =>
      addInterestStatus({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Interest status added successfully');
      queryClient.invalidateQueries({ queryKey: ['interest-statuses'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to add interest status');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: { id: number; status_name?: string; status_code?: string; color?: string; sequence_order?: number; is_active?: boolean }) =>
      updateInterestStatus({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Interest status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['interest-statuses'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update interest status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInterestStatus(id, enterpriseId!),
    onSuccess: () => {
      message.success('Interest status deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['interest-statuses'] });
    },
    onError: () => {
      message.error('Failed to delete interest status');
    },
  });

  const filteredData = useMemo(() => {
    let result = data?.data || [];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          item.status_name?.toLowerCase().includes(search) ||
          item.status_code?.toLowerCase().includes(search)
      );
    }

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof InterestStatusConfig];
        const bVal = b[sortField as keyof InterestStatusConfig];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'ascend' ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'ascend' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    return result;
  }, [data?.data, searchText, sortField, sortOrder]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<InterestStatusConfig> | SorterResult<InterestStatusConfig>[]
  ) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setPageSize(pagination.pageSize);

    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (singleSorter.field) {
      setSortField(singleSorter.field as string);
      setSortOrder(singleSorter.order || undefined);
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setPage(1);
    setSortField(undefined);
    setSortOrder(undefined);
  };

  const handleOpenModal = (status?: InterestStatusConfig) => {
    if (status) {
      setEditingStatus(status);
      form.setFieldsValue({
        ...status,
        color: status.color,
      });
    } else {
      setEditingStatus(null);
      const nextOrder = (data?.data?.length || 0) + 1;
      const defaultColor = DEFAULT_STATUS_COLORS[(nextOrder - 1) % DEFAULT_STATUS_COLORS.length];
      form.setFieldsValue({
        sequence_order: nextOrder,
        color: defaultColor,
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingStatus(null);
    form.resetFields();
  };

  const handleSubmit = (values: { status_name: string; status_code: string; color: string | Color; sequence_order: number }) => {
    const colorValue = typeof values.color === 'string' ? values.color : values.color?.toHexString() || '#1890ff';

    if (editingStatus) {
      updateMutation.mutate({
        id: editingStatus.id,
        status_name: values.status_name,
        status_code: values.status_code,
        color: colorValue,
        sequence_order: values.sequence_order,
      });
    } else {
      addMutation.mutate({
        status_name: values.status_name,
        status_code: values.status_code,
        color: colorValue,
        sequence_order: values.sequence_order,
      });
    }
  };

  const handleToggleActive = (status: InterestStatusConfig) => {
    updateMutation.mutate({
      id: status.id,
      is_active: !status.is_active,
    });
  };

  const columns: ColumnsType<InterestStatusConfig> = [
    {
      title: 'Order',
      dataIndex: 'sequence_order',
      key: 'sequence_order',
      sorter: true,
      sortOrder: sortField === 'sequence_order' ? sortOrder : undefined,
      width: 80,
    },
    {
      title: 'Status Name',
      dataIndex: 'status_name',
      key: 'status_name',
      sorter: true,
      sortOrder: sortField === 'status_name' ? sortOrder : undefined,
      render: (text, record) => <Tag color={record.color}>{text}</Tag>,
    },
    {
      title: 'Code',
      dataIndex: 'status_code',
      key: 'status_code',
      sorter: true,
      sortOrder: sortField === 'status_code' ? sortOrder : undefined,
      responsive: ['md'],
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-gray-500">{color}</span>
        </div>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm
            title="Delete Status"
            description="Are you sure you want to delete this status?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            Interest Status Configuration
          </Title>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            data={filteredData}
            columns={[
              { key: 'status_name', title: 'Name' },
              { key: 'status_code', title: 'Code' },
              { key: 'sequence_order', title: 'Order' },
              { key: 'is_active', title: 'Active' },
            ]}
            filename="interest-statuses"
            title="Interest Statuses"
            disabled={!filteredData.length}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Status
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search statuses..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Button icon={<ClearOutlined />} onClick={handleClear}>
            Clear
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 600 }}
        />
      </Card>

      <Modal
        title={editingStatus ? 'Edit Interest Status' : 'Add Interest Status'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="status_name"
            label="Status Name"
            rules={[{ required: true, message: 'Please enter status name' }]}
          >
            <Input placeholder="Enter status name (e.g., New Enquiry)" />
          </Form.Item>

          <Form.Item
            name="status_code"
            label="Status Code"
            rules={[{ required: true, message: 'Please enter status code' }]}
          >
            <Input placeholder="Enter status code (e.g., NEW)" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Color"
            rules={[{ required: true, message: 'Please select a color' }]}
          >
            <ColorPicker
              showText
              presets={[
                {
                  label: 'Recommended',
                  colors: [...DEFAULT_STATUS_COLORS],
                },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="sequence_order"
            label="Sequence Order"
            rules={[{ required: true, message: 'Please enter sequence order' }]}
          >
            <InputNumber min={1} className="w-full" placeholder="Enter sequence order" />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={addMutation.isPending || updateMutation.isPending}
            >
              {editingStatus ? 'Update' : 'Add'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
