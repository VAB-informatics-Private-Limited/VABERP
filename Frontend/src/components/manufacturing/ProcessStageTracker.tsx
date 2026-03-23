'use client';

import { Steps, Button, Tag, Modal, Form, Select, Input, message, Empty, Spin } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, PauseOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { JobCardProcess, PROCESS_STATUS_OPTIONS } from '@/types/manufacturing';
import { updateJobCardProcess } from '@/lib/api/manufacturing';
import { useAuthStore } from '@/stores/authStore';

interface ProcessStageTrackerProps {
  processes: JobCardProcess[];
  loading: boolean;
  jobCardId: number;
}

export function ProcessStageTracker({ processes, loading, jobCardId }: ProcessStageTrackerProps) {
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [updateModal, setUpdateModal] = useState<{
    open: boolean;
    process: JobCardProcess | null;
  }>({
    open: false,
    process: null,
  });
  const [form] = Form.useForm();

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; status: string; remarks?: string }) =>
      updateJobCardProcess({ ...data, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Process stage updated successfully');
      queryClient.invalidateQueries({ queryKey: ['job-card-processes', jobCardId] });
      queryClient.invalidateQueries({ queryKey: ['job-card', jobCardId] });
      setUpdateModal({ open: false, process: null });
      form.resetFields();
    },
    onError: () => {
      message.error('Failed to update process stage');
    },
  });

  const getStepStatus = (status: string): 'wait' | 'process' | 'finish' | 'error' => {
    switch (status) {
      case 'completed':
        return 'finish';
      case 'in_progress':
        return 'process';
      case 'skipped':
        return 'error';
      default:
        return 'wait';
    }
  };

  const getStatusColor = (status: string) => {
    const option = PROCESS_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.color || 'default';
  };

  const getStatusLabel = (status: string) => {
    const option = PROCESS_STATUS_OPTIONS.find((s) => s.value === status);
    return option?.label || status;
  };

  const handleUpdateClick = (process: JobCardProcess) => {
    setUpdateModal({ open: true, process });
    form.setFieldsValue({
      status: process.status,
      remarks: process.remarks,
    });
  };

  const handleUpdateSubmit = (values: { status: string; remarks?: string }) => {
    if (updateModal.process) {
      updateMutation.mutate({
        id: updateModal.process.id,
        status: values.status,
        remarks: values.remarks,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spin />
      </div>
    );
  }

  if (!processes || processes.length === 0) {
    return <Empty description="No process stages defined" />;
  }

  const sortedProcesses = [...processes].sort((a, b) => a.sequence_order - b.sequence_order);

  const currentStepIndex = sortedProcesses.findIndex(
    (p) => p.status === 'in_progress' || p.status === 'pending'
  );

  const stepsItems = sortedProcesses.map((process, index) => ({
    title: (
      <div className="flex items-center gap-2">
        <span>{process.process_name}</span>
        <Tag color={getStatusColor(process.status)} className="ml-2">
          {getStatusLabel(process.status)}
        </Tag>
      </div>
    ),
    description: (
      <div className="mt-2">
        {process.assigned_to_name && (
          <div className="text-sm text-gray-500">Assigned: {process.assigned_to_name}</div>
        )}
        {process.started_at && (
          <div className="text-sm text-gray-500">Started: {process.started_at}</div>
        )}
        {process.completed_at && (
          <div className="text-sm text-gray-500">Completed: {process.completed_at}</div>
        )}
        {process.remarks && (
          <div className="text-sm text-gray-600 mt-1">{process.remarks}</div>
        )}
        <div className="mt-2">
          {process.status === 'pending' && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() =>
                updateMutation.mutate({ id: process.id, status: 'in_progress' })
              }
            >
              Start
            </Button>
          )}
          {process.status === 'in_progress' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleUpdateClick(process)}
            >
              Complete
            </Button>
          )}
          {(process.status === 'completed' || process.status === 'skipped') && (
            <Button size="small" onClick={() => handleUpdateClick(process)}>
              Update
            </Button>
          )}
        </div>
      </div>
    ),
    status: getStepStatus(process.status),
  }));

  return (
    <>
      <Steps
        direction="vertical"
        current={currentStepIndex >= 0 ? currentStepIndex : sortedProcesses.length}
        items={stepsItems}
      />

      <Modal
        title={`Update Process: ${updateModal.process?.process_name}`}
        open={updateModal.open}
        onCancel={() => {
          setUpdateModal({ open: false, process: null });
          form.resetFields();
        }}
        footer={null}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateSubmit}>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select>
              {PROCESS_STATUS_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea placeholder="Enter remarks" rows={3} />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setUpdateModal({ open: false, process: null });
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Update
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
