'use client';

import { useState, useMemo } from 'react';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, Select, Switch, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, SearchOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { getEmailTemplates, addEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '@/lib/api/settings';
import { useAuthStore } from '@/stores/authStore';
import { EmailTemplate, TEMPLATE_TYPE_OPTIONS } from '@/types/settings';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function EmailTemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ open: boolean; template: EmailTemplate | null }>({
    open: false,
    template: null,
  });
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['email-templates', enterpriseId],
    queryFn: () => getEmailTemplates(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const addMutation = useMutation({
    mutationFn: (values: { template_name: string; template_type: string; subject: string; body: string }) =>
      addEmailTemplate({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Email template added successfully');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to add email template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: { id: number; template_name?: string; template_type?: string; subject?: string; body?: string; is_active?: boolean }) =>
      updateEmailTemplate({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Email template updated successfully');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update email template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmailTemplate(id, enterpriseId!),
    onSuccess: () => {
      message.success('Email template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: () => {
      message.error('Failed to delete email template');
    },
  });

  const filteredData = useMemo(() => {
    let result = data?.data || [];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          item.template_name?.toLowerCase().includes(search) ||
          item.subject?.toLowerCase().includes(search)
      );
    }

    if (typeFilter) {
      result = result.filter((item) => item.template_type === typeFilter);
    }

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof EmailTemplate];
        const bVal = b[sortField as keyof EmailTemplate];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'ascend' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    return result;
  }, [data?.data, searchText, typeFilter, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<EmailTemplate> | SorterResult<EmailTemplate>[]
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
    setTypeFilter(undefined);
    setPage(1);
    setSortField(undefined);
    setSortOrder(undefined);
  };

  const handleOpenModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.setFieldsValue(template);
    } else {
      setEditingTemplate(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTemplate(null);
    form.resetFields();
  };

  const handleSubmit = (values: { template_name: string; template_type: string; subject: string; body: string }) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...values });
    } else {
      addMutation.mutate(values);
    }
  };

  const handleToggleActive = (template: EmailTemplate) => {
    updateMutation.mutate({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  const getTypeTag = (type: string) => {
    const option = TEMPLATE_TYPE_OPTIONS.find((t) => t.value === type);
    return <Tag color={option?.color || 'default'}>{option?.label || type}</Tag>;
  };

  const columns: ColumnsType<EmailTemplate> = [
    {
      title: 'Template Name',
      dataIndex: 'template_name',
      key: 'template_name',
      sorter: true,
      sortOrder: sortField === 'template_name' ? sortOrder : undefined,
    },
    {
      title: 'Type',
      dataIndex: 'template_type',
      key: 'template_type',
      render: (type) => getTypeTag(type),
      responsive: ['md'],
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      sorter: true,
      sortOrder: sortField === 'subject' ? sortOrder : undefined,
      ellipsis: true,
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
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setPreviewModal({ open: true, template: record })}
          />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm
            title="Delete Template"
            description="Are you sure you want to delete this template?"
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
            Email Templates
          </Title>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            data={filteredData}
            columns={[
              { key: 'template_name', title: 'Name' },
              { key: 'subject', title: 'Subject' },
              { key: 'template_type', title: 'Type' },
              { key: 'is_active', title: 'Active' },
            ]}
            filename="email-templates"
            title="Email Templates"
            disabled={!filteredData.length}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Template
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search templates..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            placeholder="All Types"
            value={typeFilter}
            onChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
            style={{ width: 150 }}
            allowClear
          >
            {TEMPLATE_TYPE_OPTIONS.map((t) => (
              <Select.Option key={t.value} value={t.value}>
                {t.label}
              </Select.Option>
            ))}
          </Select>
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
        title={editingTemplate ? 'Edit Email Template' : 'Add Email Template'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="template_name"
            label="Template Name"
            rules={[{ required: true, message: 'Please enter template name' }]}
          >
            <Input placeholder="Enter template name" />
          </Form.Item>

          <Form.Item
            name="template_type"
            label="Template Type"
            rules={[{ required: true, message: 'Please select template type' }]}
          >
            <Select placeholder="Select template type">
              {TEMPLATE_TYPE_OPTIONS.map((t) => (
                <Select.Option key={t.value} value={t.value}>
                  {t.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Email Subject"
            rules={[{ required: true, message: 'Please enter email subject' }]}
          >
            <Input placeholder="Enter email subject" />
          </Form.Item>

          <Form.Item
            name="body"
            label="Email Body"
            rules={[{ required: true, message: 'Please enter email body' }]}
            extra="You can use placeholders like {{customer_name}}, {{company_name}}, {{date}}"
          >
            <Input.TextArea rows={10} placeholder="Enter email body content" />
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

      <Modal
        title="Preview Email Template"
        open={previewModal.open}
        onCancel={() => setPreviewModal({ open: false, template: null })}
        footer={[
          <Button key="close" onClick={() => setPreviewModal({ open: false, template: null })}>
            Close
          </Button>,
        ]}
        maskClosable={false}
        width={700}
      >
        {previewModal.template && (
          <div>
            <div className="mb-4">
              <div className="text-gray-500 text-sm">Template Name</div>
              <div className="font-medium">{previewModal.template.template_name}</div>
            </div>
            <div className="mb-4">
              <div className="text-gray-500 text-sm">Type</div>
              <div>{getTypeTag(previewModal.template.template_type)}</div>
            </div>
            <div className="mb-4">
              <div className="text-gray-500 text-sm">Subject</div>
              <div className="font-medium">{previewModal.template.subject}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-2">Body</div>
              <div className="bg-gray-50 p-4 rounded border whitespace-pre-wrap">
                {previewModal.template.body}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
