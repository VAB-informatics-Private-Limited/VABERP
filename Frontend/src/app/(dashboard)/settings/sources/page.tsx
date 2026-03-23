'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, InputNumber, Switch, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { getSources, addSource, updateSource, deleteSource } from '@/lib/api/sources';
import { useAuthStore } from '@/stores/authStore';
import { Source } from '@/types/source';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function SourcesPage() {
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
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['sources', enterpriseId],
    queryFn: () => getSources(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const addMutation = useMutation({
    mutationFn: (values: { source_name: string; source_code: string; sequence_order: number }) =>
      addSource({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Source added successfully');
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      message.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to add source');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: { id: number; source_name?: string; source_code?: string; sequence_order?: number; is_active?: boolean }) =>
      updateSource({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Source updated successfully');
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      message.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to update source');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSource(id, enterpriseId!),
    onSuccess: () => {
      message.success('Source deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      message.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to delete source');
    },
  });

  const filteredData = useMemo(() => {
    let result = data?.data || [];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          item.source_name?.toLowerCase().includes(search) ||
          item.source_code?.toLowerCase().includes(search)
      );
    }

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof Source];
        const bVal = b[sortField as keyof Source];
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

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<Source> | SorterResult<Source>[]
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

  const handleOpenModal = (source?: Source) => {
    if (source) {
      setEditingSource(source);
      form.setFieldsValue(source);
    } else {
      setEditingSource(null);
      const nextOrder = (data?.data?.length || 0) + 1;
      form.setFieldsValue({ sequence_order: nextOrder });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingSource(null);
    form.resetFields();
  };

  const handleSubmit = (values: { source_name: string; source_code: string; sequence_order: number }) => {
    if (editingSource) {
      updateMutation.mutate({
        id: editingSource.id,
        source_name: values.source_name,
        source_code: values.source_code,
        sequence_order: values.sequence_order,
      });
    } else {
      addMutation.mutate(values);
    }
  };

  const handleToggleActive = (source: Source) => {
    updateMutation.mutate({
      id: source.id,
      is_active: !source.is_active,
    });
  };

  const columns: ColumnsType<Source> = [
    {
      title: 'Order',
      dataIndex: 'sequence_order',
      key: 'sequence_order',
      sorter: true,
      sortOrder: sortField === 'sequence_order' ? sortOrder : undefined,
      width: 80,
    },
    {
      title: 'Source Name',
      dataIndex: 'source_name',
      key: 'source_name',
      sorter: true,
      sortOrder: sortField === 'source_name' ? sortOrder : undefined,
    },
    {
      title: 'Code',
      dataIndex: 'source_code',
      key: 'source_code',
      sorter: true,
      sortOrder: sortField === 'source_code' ? sortOrder : undefined,
      responsive: ['md'],
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
            title="Delete Source"
            description="Are you sure you want to delete this source?"
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
            Lead Sources
          </Title>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            data={filteredData}
            columns={[
              { key: 'source_name', title: 'Source Name' },
              { key: 'source_code', title: 'Code' },
              { key: 'is_active', title: 'Status' },
            ]}
            filename="lead-sources"
            title="Lead Sources"
            disabled={!filteredData.length}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Source
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search sources..."
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
          dataSource={paginatedData}
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
        title={editingSource ? 'Edit Source' : 'Add Source'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="source_name"
            label="Source Name"
            rules={[{ required: true, message: 'Please enter source name' }]}
          >
            <Input placeholder="Enter source name (e.g., Website)" />
          </Form.Item>

          <Form.Item
            name="source_code"
            label="Source Code"
            rules={[{ required: true, message: 'Please enter source code' }]}
          >
            <Input placeholder="Enter source code (e.g., website)" />
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
              {editingSource ? 'Update' : 'Add'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
