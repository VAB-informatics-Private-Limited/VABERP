'use client';

import { Form, Input, Select, DatePicker, FormInstance } from 'antd';
import { TASK_PRIORITY_OPTIONS } from '@/types/tasks';
import { Task } from '@/types/tasks';
import dayjs from 'dayjs';

const MODULE_OPTIONS = [
  { value: 'crm', label: 'CRM' },
  { value: 'sales', label: 'Sales' },
  { value: 'orders', label: 'Orders' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'invoicing', label: 'Invoicing' },
  { value: 'general', label: 'General' },
];

interface Props {
  form: FormInstance;
  initial?: Partial<Task>;
  employeeOptions?: { value: number; label: string }[];
}

export function TaskForm({ form, initial, employeeOptions = [] }: Props) {
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        priority: initial?.priority ?? 'medium',
        title: initial?.title,
        description: initial?.description,
        dueDate: initial?.due_date ? dayjs(initial.due_date) : undefined,
        assignedTo: initial?.assigned_to ?? undefined,
        module: initial?.module ?? undefined,
      }}
    >
      <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
        <Input placeholder="Task title" />
      </Form.Item>

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={3} placeholder="Describe the task..." />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="priority" label="Priority">
          <Select options={TASK_PRIORITY_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
        </Form.Item>

        <Form.Item name="dueDate" label="Due Date">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="assignedTo" label="Assign To">
          <Select
            placeholder="Select employee"
            showSearch
            optionFilterProp="label"
            allowClear
            options={employeeOptions}
          />
        </Form.Item>

        <Form.Item name="module" label="Module (optional)">
          <Select placeholder="Tag a module" allowClear options={MODULE_OPTIONS} />
        </Form.Item>
      </div>
    </Form>
  );
}
