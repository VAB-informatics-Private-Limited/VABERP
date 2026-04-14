'use client';

import React, { useState } from 'react';
import { Card, Tag, Button, Modal, Form, Input, Select, DatePicker, Empty, Spin } from 'antd';
import { PlusOutlined, CheckOutlined, CalendarOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  getOrganizerForEntity, createOrganizerItem, OrganizerItem,
} from '@/lib/api/organizer';
import { message } from 'antd';

const { Option } = Select;

const TYPE_COLORS: Record<string, string> = { task: 'blue', reminder: 'purple', follow_up: 'orange', recurring: 'cyan' };
const STATUS_COLORS: Record<string, string> = { open: 'blue', in_progress: 'processing', done: 'success', snoozed: 'warning', cancelled: 'default' };

interface Props {
  entityType: string;
  entityId: number;
  entityLabel?: string;
}

export function OrganizerContextWidget({ entityType, entityId, entityLabel }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['organizer-context', entityType, entityId],
    queryFn: () => getOrganizerForEntity(entityType, entityId),
    enabled: !!entityId,
  });

  const createMut = useMutation({
    mutationFn: createOrganizerItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizer-context', entityType, entityId] });
      setModal(false);
      form.resetFields();
      message.success('Item created');
    },
    onError: () => message.error('Failed to create item'),
  });

  const onSubmit = (values: any) => {
    createMut.mutate({
      type: values.type,
      title: values.title,
      priority: values.priority ?? 'medium',
      dueDate: values.due_date ? values.due_date.toISOString() : undefined,
      remindAt: values.remind_at ? values.remind_at.toISOString() : undefined,
      notes: values.notes,
      contextLinks: [{
        entityType,
        entityId,
        label: entityLabel ?? `${entityType} #${entityId}`,
      }],
    });
  };

  const active = items.filter((i) => !['done', 'cancelled'].includes(i.status));
  const done = items.filter((i) => i.status === 'done');

  return (
    <Card
      size="small"
      title={<span className="flex items-center gap-2"><CalendarOutlined /> Organizer ({items.length})</span>}
      extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setModal(true)}>Add</Button>}
    >
      {isLoading ? (
        <div className="flex justify-center py-3"><Spin size="small" /></div>
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No linked items" style={{ margin: '8px 0' }} />
      ) : (
        <div className="flex flex-col gap-1.5">
          {active.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm hover:bg-blue-50 cursor-pointer"
              onClick={() => router.push(`/organizer/${item.id}`)}>
              <div className="flex items-center gap-2 min-w-0">
                <Tag color={TYPE_COLORS[item.type]} className="text-xs shrink-0">{item.type?.replace('_', ' ').toUpperCase()}</Tag>
                <span className="truncate font-medium">{item.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {item.due_date && (
                  <span className={`text-xs ${dayjs(item.due_date).isBefore(dayjs()) ? 'text-red-500' : 'text-gray-400'}`}>
                    {dayjs(item.due_date).format('DD MMM')}
                  </span>
                )}
                <Tag color={STATUS_COLORS[item.status]} className="text-xs">{item.status?.replace('_', ' ')}</Tag>
              </div>
            </div>
          ))}
          {done.length > 0 && (
            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <CheckOutlined /> {done.length} completed
            </div>
          )}
        </div>
      )}

      <Modal
        title={`Add Organizer Item — ${entityLabel ?? `${entityType} #${entityId}`}`}
        open={modal}
        onCancel={() => { setModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="type" label="Type" rules={[{ required: true }]} initialValue="task">
            <Select>
              <Option value="task">Task</Option>
              <Option value="reminder">Reminder</Option>
              <Option value="follow_up">Follow-up</Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="What needs to be done?" />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
              <Option value="critical">Critical</Option>
            </Select>
          </Form.Item>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remind_at" label="Remind At">
            <DatePicker showTime style={{ width: '100%' }} placeholder="Optional" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
