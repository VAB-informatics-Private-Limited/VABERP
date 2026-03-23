'use client';

import { useState, useMemo } from 'react';
import { Typography, Button, Card, Modal, Form, Input, Select, Table, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDesignations,
  getDropdownDepartment,
  addDesignation,
  updateDesignation,
  deleteDesignation,
} from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { Designation, DesignationFormData } from '@/types/employee';
import ExportDropdown from '@/components/common/ExportDropdown';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function DesignationsPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['designations', enterpriseId],
    queryFn: () => getDesignations(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-dropdown', enterpriseId],
    queryFn: () => getDropdownDepartment(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const filteredData = useMemo(() => {
    if (!data?.data || !searchText) return data?.data || [];
    const search = searchText.toLowerCase();
    return data.data.filter(
      (des) =>
        des.designation_name?.toLowerCase().includes(search) ||
        des.department_name?.toLowerCase().includes(search) ||
        des.description?.toLowerCase().includes(search)
    );
  }, [data?.data, searchText]);

  const addMutation = useMutation({
    mutationFn: (formData: DesignationFormData) =>
      addDesignation({ ...formData, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Designation added successfully');
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to add designation');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (formData: DesignationFormData) =>
      updateDesignation({ ...formData, id: editingDesignation!.id, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Designation updated successfully');
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update designation');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDesignation(id, enterpriseId!),
    onSuccess: () => {
      message.success('Designation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: () => {
      message.error('Failed to delete designation');
    },
  });

  const handleOpenModal = (designation?: Designation) => {
    if (designation) {
      setEditingDesignation(designation);
      form.setFieldsValue(designation);
    } else {
      setEditingDesignation(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDesignation(null);
    form.resetFields();
  };

  const handleSubmit = (values: DesignationFormData) => {
    if (editingDesignation) {
      updateMutation.mutate(values);
    } else {
      addMutation.mutate(values);
    }
  };

  const columns: ColumnsType<Designation> = [
    {
      title: 'Designation Name',
      dataIndex: 'designation_name',
      key: 'designation_name',
      sorter: (a, b) => a.designation_name.localeCompare(b.designation_name),
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
      sorter: (a, b) => (a.department_name || '').localeCompare(b.department_name || ''),
      filters: Array.from(new Set((data?.data || []).map(d => d.department_name).filter(Boolean))).map(d => ({ text: d!, value: d! })),
      onFilter: (value, record) => record.department_name === value,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <span className={status === 'active' ? 'text-green-600' : 'text-red-600'}>
          {status?.toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm
            title="Delete Designation"
            description="This will affect all employees with this designation."
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/employees')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            Designations
          </Title>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'designation_name', title: 'Designation' },
              { key: 'department_name', title: 'Department' },
              { key: 'status', title: 'Status' },
            ]}
            filename="designations"
            title="Designations"
            disabled={!data?.data?.length}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Designation
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Input
          placeholder="Search designations..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} designations`,
          }}
        />
      </Card>

      <Modal
        title={editingDesignation ? 'Edit Designation' : 'Add Designation'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 'active' }}
        >
          <Form.Item
            name="department_id"
            label="Department"
            rules={[{ required: true, message: 'Please select a department' }]}
          >
            <Select placeholder="Select department" showSearch optionFilterProp="children">
              {departments?.data?.map((dept) => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.department_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="designation_name"
            label="Designation Name"
            rules={[{ required: true, message: 'Please enter designation name' }]}
          >
            <Input placeholder="Enter designation name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter description" rows={3} />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={addMutation.isPending || updateMutation.isPending}
            >
              {editingDesignation ? 'Update' : 'Add'} Designation
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
