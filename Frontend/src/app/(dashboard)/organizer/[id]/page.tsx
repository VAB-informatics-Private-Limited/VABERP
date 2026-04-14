'use client';

import React, { useState } from 'react';
import {
  Card, Tag, Button, Descriptions, Timeline, Modal, DatePicker,
  Space, Tabs, Row, Col, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, ClockCircleOutlined,
  LinkOutlined, HistoryOutlined, EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  getOrganizerItem, completeOrganizerItem, snoozeOrganizerItem, OrganizerItem,
} from '@/lib/api/organizer';
import { message } from 'antd';

const TYPE_COLORS: Record<string, string> = { task: 'blue', reminder: 'purple', follow_up: 'orange', recurring: 'cyan' };
const PRIORITY_COLORS: Record<string, string> = { low: 'default', medium: 'blue', high: 'orange', critical: 'red' };
const STATUS_COLORS: Record<string, string> = { open: 'blue', in_progress: 'processing', done: 'success', snoozed: 'warning', cancelled: 'default' };
const ACTION_COLORS: Record<string, string> = { created: 'green', status_changed: 'blue', snoozed: 'orange', completed: 'green', edited: 'default', comment_added: 'purple' };

const ENTITY_PATHS: Record<string, string> = {
  enquiry: '/enquiries',
  customer: '/customers',
  machine: '/machinery',
  vendor: '/maintenance-vendors',
  work_order: '/maintenance-work-orders',
};

export default function OrganizerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const itemId = parseInt(id);
  const [snoozeModal, setSnoozeModal] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState<dayjs.Dayjs | null>(dayjs().add(1, 'day'));

  const { data: item, isLoading } = useQuery({
    queryKey: ['organizer-item', itemId],
    queryFn: () => getOrganizerItem(itemId),
    enabled: !!itemId,
  });

  const completeMut = useMutation({
    mutationFn: completeOrganizerItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizer-item', itemId] }); message.success('Marked as done'); },
    onError: () => message.error('Failed'),
  });

  const snoozeMut = useMutation({
    mutationFn: ({ id, snoozeUntil }: { id: number; snoozeUntil: string }) => snoozeOrganizerItem(id, snoozeUntil),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizer-item', itemId] }); setSnoozeModal(false); message.success('Snoozed'); },
    onError: () => message.error('Failed to snooze'),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!item) return <div className="p-6">Item not found.</div>;

  const isDone = ['done', 'cancelled'].includes(item.status);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/organizer')}>Back</Button>
        <span className="font-mono text-sm text-gray-500">{item.item_number}</span>
        <h1 className="text-xl font-bold flex-1">{item.title}</h1>
        <Space>
          <Tag color={TYPE_COLORS[item.type]}>{item.type?.replace('_', ' ').toUpperCase()}</Tag>
          <Tag color={PRIORITY_COLORS[item.priority]}>{item.priority?.toUpperCase()}</Tag>
          <Tag color={STATUS_COLORS[item.status]}>{item.status?.replace('_', ' ').toUpperCase()}</Tag>
          {!isDone && (
            <>
              <Button type="primary" icon={<CheckOutlined />}
                onClick={() => Modal.confirm({ title: 'Mark as done?', onOk: () => completeMut.mutate(item.id) })}
                loading={completeMut.isPending}>
                Complete
              </Button>
              <Button icon={<ClockCircleOutlined />} onClick={() => setSnoozeModal(true)}>Snooze</Button>
            </>
          )}
          <Button icon={<EditOutlined />} onClick={() => router.push('/organizer')}>Edit</Button>
        </Space>
      </div>

      <Row gutter={16}>
        {/* Left — Details */}
        <Col xs={24} md={16}>
          <Tabs
            items={[
              {
                key: 'details',
                label: 'Details',
                children: (
                  <Card>
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Type" span={1}>
                        <Tag color={TYPE_COLORS[item.type]}>{item.type?.replace('_', ' ').toUpperCase()}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Priority" span={1}>
                        <Tag color={PRIORITY_COLORS[item.priority]}>{item.priority?.toUpperCase()}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status" span={1}>
                        <Tag color={STATUS_COLORS[item.status]}>{item.status?.replace('_', ' ').toUpperCase()}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Due Date" span={1}>
                        {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY HH:mm') : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Remind At" span={1}>
                        {item.remind_at ? dayjs(item.remind_at).format('DD MMM YYYY HH:mm') : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Completed At" span={1}>
                        {item.completed_at ? dayjs(item.completed_at).format('DD MMM YYYY HH:mm') : '—'}
                      </Descriptions.Item>
                      {item.tags?.length > 0 && (
                        <Descriptions.Item label="Tags" span={2}>
                          {item.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                        </Descriptions.Item>
                      )}
                      {item.description && (
                        <Descriptions.Item label="Description" span={2}>{item.description}</Descriptions.Item>
                      )}
                      {item.notes && (
                        <Descriptions.Item label="Notes" span={2}>{item.notes}</Descriptions.Item>
                      )}
                    </Descriptions>

                    {/* Recurrence info */}
                    {item.recurrence_rule && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-600 mb-2">Recurrence</div>
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="Frequency">{item.recurrence_rule.frequency?.toUpperCase()}</Descriptions.Item>
                          {item.recurrence_rule.interval_days && (
                            <Descriptions.Item label="Interval">Every {item.recurrence_rule.interval_days} days</Descriptions.Item>
                          )}
                          <Descriptions.Item label="Next Run">
                            {item.recurrence_rule.next_run_date ? dayjs(item.recurrence_rule.next_run_date).format('DD MMM YYYY') : '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Generated">{item.recurrence_rule.occurrences_generated}</Descriptions.Item>
                          {item.recurrence_rule.end_date && (
                            <Descriptions.Item label="End Date">{dayjs(item.recurrence_rule.end_date).format('DD MMM YYYY')}</Descriptions.Item>
                          )}
                        </Descriptions>
                      </div>
                    )}
                  </Card>
                ),
              },
              {
                key: 'activity',
                label: <span><HistoryOutlined /> Activity ({item.activity_log?.length ?? 0})</span>,
                children: (
                  <Card>
                    {item.activity_log?.length ? (
                      <Timeline
                        items={item.activity_log.map((log) => ({
                          color: ACTION_COLORS[log.action] ?? 'gray',
                          children: (
                            <div>
                              <span className="font-medium capitalize">{log.action.replace('_', ' ')}</span>
                              {log.old_value && log.new_value && (
                                <span className="text-gray-500 text-sm"> · {log.old_value} → {log.new_value}</span>
                              )}
                              {log.comment && <div className="text-gray-600 text-sm mt-1">{log.comment}</div>}
                              <div className="text-gray-400 text-xs mt-0.5">{dayjs(log.created_at).format('DD MMM YYYY HH:mm')}</div>
                            </div>
                          ),
                        }))}
                      />
                    ) : (
                      <div className="text-gray-400 text-center py-4">No activity yet</div>
                    )}
                  </Card>
                ),
              },
            ]}
          />
        </Col>

        {/* Right — Context Links */}
        <Col xs={24} md={8}>
          <Card title={<span><LinkOutlined /> Linked To ({item.context_links?.length ?? 0})</span>}>
            {item.context_links?.length ? (
              <div className="flex flex-col gap-2">
                {item.context_links.map((link) => {
                  const basePath = ENTITY_PATHS[link.entity_type] ?? `/${link.entity_type}s`;
                  return (
                    <div key={link.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div>
                        <Tag color="geekblue" className="text-xs">{link.entity_type.replace('_', ' ').toUpperCase()}</Tag>
                        <span className="text-sm ml-1">{link.label || `#${link.entity_id}`}</span>
                      </div>
                      <Button size="small" type="link" onClick={() => router.push(`${basePath}/${link.entity_id}`)}>
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 text-sm text-center py-4">No context links</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Snooze Modal */}
      <Modal
        title="Snooze until..."
        open={snoozeModal}
        onCancel={() => setSnoozeModal(false)}
        onOk={() => { if (snoozeDate) snoozeMut.mutate({ id: item.id, snoozeUntil: snoozeDate.toISOString() }); }}
        confirmLoading={snoozeMut.isPending}
      >
        <DatePicker
          showTime
          value={snoozeDate}
          onChange={(v) => setSnoozeDate(v)}
          style={{ width: '100%' }}
          disabledDate={(d) => d.isBefore(dayjs(), 'day')}
        />
      </Modal>
    </div>
  );
}
