'use client';

import { Card, Button, Form, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createTask, getTaskEmployees } from '@/lib/api/tasks';
import { TaskForm } from '@/components/tasks/TaskForm';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function AddTaskPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const { data: employeeOptions = [] } = useQuery({
    queryKey: ['task-employees'],
    queryFn: getTaskEmployees,
  });

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: (res) => {
      message.success('Task created!');
      router.push(`/tasks/${res.data?.id ?? ''}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create task'),
  });

  const handleSubmit = () => {
    form.validateFields().then(values => {
      mutation.mutate({
        title: values.title,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate ? dayjs(values.dueDate).format('YYYY-MM-DD') : undefined,
        assignedTo: values.assignedTo,
        module: values.module,
      });
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/tasks')} />
        <Title level={4} className="!mb-0">New Task</Title>
      </div>
      <Card className="card-shadow max-w-2xl">
        <TaskForm form={form} employeeOptions={employeeOptions} />
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button onClick={() => router.push('/tasks')}>Cancel</Button>
          <Button type="primary" loading={mutation.isPending} onClick={handleSubmit}>Create Task</Button>
        </div>
      </Card>
    </div>
  );
}
