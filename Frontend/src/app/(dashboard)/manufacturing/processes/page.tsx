'use client';

import { useState, useMemo } from 'react';
import { Typography, Button, Card, Input, Table, Space, Modal, Form, InputNumber, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, ClearOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { getProcessTemplates, addProcessTemplate, updateProcessTemplate, deleteProcessTemplate } from '@/lib/api/manufacturing';
import { useAuthStore } from '@/stores/authStore';
import { ProcessTemplate } from '@/types/manufacturing';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function ProcessTemplatesPage() {
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
  const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['process-templates', enterpriseId],
    queryFn: () => getProcessTemplates(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const addMutation = useMutation({
    mutationFn: (values: { process_name: string; description?: string; estimated_time?: number; sequence_order: number }) =>
      addProcessTemplate({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Process template added successfully');
      queryClient.invalidateQueries({ queryKey: ['process-templates'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to add process template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: { id: number; process_name: string; description?: string; estimated_time?: number; sequence_order: number }) =>
      updateProcessTemplate({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Process template updated successfully');
      queryClient.invalidateQueries({ queryKey: ['process-templates'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update process template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProcessTemplate(id, enterpriseId!),
    onSuccess: () => {
      message.success('Process template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['process-templates'] });
    },
    onError: () => {
      message.error('Failed to delete process template');
    },
  });

  const filteredData = useMemo(() => {
    let result = data?.data || [];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          item.process_name?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
      );
    }

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof ProcessTemplate];
        const bVal = b[sortField as keyof ProcessTemplate];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'ascend' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'ascend' ? aVal - bVal : bVal - aVal;
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
    sorter: SorterResult<ProcessTemplate> | SorterResult<ProcessTemplate>[]
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

  const handleOpenModal = (template?: ProcessTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.setFieldsValue(template);
    } else {
      setEditingTemplate(null);
      const nextOrder = (data?.data?.length || 0) + 1;
      form.setFieldsValue({ sequence_order: nextOrder });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTemplate(null);
    form.resetFields();
  };

  const handleSubmit = (values: { process_name: string; description?: string; estimated_time?: number; sequence_order: number }) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...values });
    } else {
      addMutation.mutate(values);
    }
  };

  const columns: ColumnsType<ProcessTemplate> = [
    {
      title: 'Process Name',
      dataIndex: 'process_name',
      key: 'process_name',
      sorter: true,
      sortOrder: sortField === 'process_name' ? sortOrder : undefined,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      responsive: ['md'],
      render: (text) => text || '-',
    },
    {
      title: 'Est. Time',
      dataIndex: 'estimated_time',
      key: 'estimated_time',
      sorter: true,
      sortOrder: sortField === 'estimated_time' ? sortOrder : undefined,
      render: (time) => (time ? <Tag color="blue">{time} mins</Tag> : '-'),
    },
    {
      title: 'Created',
      dataIndex: 'created_date',
      key: 'created_date',
      sorter: true,
      sortOrder: sortField === 'created_date' ? sortOrder : undefined,
      responsive: ['lg'],
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Delete Process Template"
            description="Are you sure you want to delete this process template?"
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/manufacturing')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            Process Templates
          </Title>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            data={filteredData}
            columns={[
              { key: 'process_name', title: 'Name' },
              { key: 'description', title: 'Description' },
              { key: 'sequence_order', title: 'Order' },
              { key: 'status', title: 'Status' },
            ]}
            filename="process-templates"
            title="Manufacturing Process Templates"
            disabled={!filteredData.length}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Process
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search processes..."
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
        title={editingTemplate ? 'Edit Process Template' : 'Add Process Template'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="process_name"
            label="Process Name"
            rules={[{ required: true, message: 'Please enter process name' }]}
          >
            <Input placeholder="Enter process name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter description" rows={3} />
          </Form.Item>

          <Form.Item name="estimated_time" label="Estimated Time (minutes)">
            <InputNumber min={1} className="w-full" placeholder="Enter estimated time" />
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
              {editingTemplate ? 'Update' : 'Add'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
