'use client';

import { Card, Button, Form, Typography, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getTaskById, updateTask, getTaskEmployees } from '@/lib/api/tasks';
import { TaskForm } from '@/components/tasks/TaskForm';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function EditTaskPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const [form] = Form.useForm();

  const { data: taskRes, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId),
    enabled: !!taskId,
  });

  const { data: employeeOptions = [] } = useQuery({
    queryKey: ['task-employees'],
    queryFn: getTaskEmployees,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => updateTask(taskId, payload),
    onSuccess: () => {
      message.success('Task updated!');
      router.push(`/tasks/${taskId}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update task'),
  });

  const handleSubmit = () => {
    form.validateFields().then(values => {
      mutation.mutate({
        title: values.title,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate ? dayjs(values.dueDate).format('YYYY-MM-DD') : null,
        module: values.module,
      });
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/tasks/${taskId}`)} />
        <Title level={4} className="!mb-0">Edit Task</Title>
      </div>
      <Card className="card-shadow max-w-2xl">
        <TaskForm form={form} initial={taskRes?.data} employeeOptions={employeeOptions} />
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button onClick={() => router.push(`/tasks/${taskId}`)}>Cancel</Button>
          <Button type="primary" loading={mutation.isPending} onClick={handleSubmit}>Save Changes</Button>
        </div>
      </Card>
    </div>
  );
}
