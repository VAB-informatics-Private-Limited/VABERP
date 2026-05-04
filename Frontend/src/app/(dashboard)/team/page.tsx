'use client';

import {
  Typography, Card, Tag, Row, Col, Avatar, Button, Empty, Spin,
  Badge, Divider, Tooltip, Modal, Form, Input, Select, Popconfirm, message, List,
} from 'antd';
import {
  TeamOutlined, UserOutlined, CheckSquareOutlined, ToolOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined,
  PlusOutlined, DeleteOutlined, BellOutlined, TagOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getTeamOverview, TeamMember } from '@/lib/api/employees';
import { getMyTeamUpdates, postTeamUpdate, deleteTeamUpdate } from '@/lib/api/team-updates';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const MODULE_LABELS: Record<string, string> = {
  sales: 'Sales', enquiry: 'Enquiries', orders: 'Orders',
  catalog: 'Products', inventory: 'Inventory', procurement: 'Procurement',
  invoicing: 'Invoicing', employees: 'Employees', reports: 'Reports',
  configurations: 'Settings', crm: 'CRM', tasks: 'Tasks',
};
const MODULE_COLORS: Record<string, string> = {
  sales: 'blue', enquiry: 'cyan', orders: 'green', catalog: 'purple',
  inventory: 'orange', procurement: 'gold', invoicing: 'red',
  employees: 'geekblue', reports: 'volcano', configurations: 'default',
  crm: 'magenta', tasks: 'lime',
};

const TASK_STATUS_COLOR: Record<string, string> = {
  pending: 'orange', in_progress: 'blue', completed: 'green', cancelled: 'default',
};
const JC_STATUS_COLOR: Record<string, string> = {
  pending: 'default', in_process: 'blue', partially_completed: 'cyan',
  completed_production: 'gold', ready_for_approval: 'orange',
  approved_for_dispatch: 'purple', dispatched: 'green',
};
const JC_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', in_process: 'In Process', partially_completed: 'Partial',
  completed_production: 'Done', ready_for_approval: 'Ready',
  approved_for_dispatch: 'Approved', dispatched: 'Dispatched',
};
const CATEGORY_COLOR: Record<string, string> = {
  announcement: 'blue', task_update: 'green', reminder: 'orange', general: 'default',
};

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

function MemberCard({ member, router }: { member: TeamMember; router: ReturnType<typeof useRouter> }) {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ');
  const initials = [member.firstName?.[0], member.lastName?.[0]].filter(Boolean).join('').toUpperCase();
  const hasWork = member.activeTaskCount > 0 || member.activeJobCardCount > 0;

  return (
    <Card className="card-shadow h-full" style={{ borderTop: '3px solid var(--color-primary)' }}>
      <div className="flex items-start gap-3 mb-4">
        <Avatar size={48} style={{ backgroundColor: 'var(--color-primary)', flexShrink: 0 }}>
          {initials || <UserOutlined />}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-800 truncate text-base">{fullName}</div>
          {member.designation && <div className="text-gray-500 text-sm truncate">{member.designation}</div>}
          {member.department && <div className="text-gray-400 text-xs truncate">{member.department}</div>}
          <div className="flex items-center gap-2 mt-1">
            <Tag color={member.status === 'active' ? 'green' : 'red'} style={{ fontSize: 11, margin: 0 }}>
              {member.status?.toUpperCase()}
            </Tag>
            {member.activeTaskCount > 0 && (
              <Tooltip title={`${member.activeTaskCount} active task${member.activeTaskCount > 1 ? 's' : ''}`}>
                <Badge count={member.activeTaskCount} color="var(--color-primary)" size="small">
                  <CheckSquareOutlined style={{ color: 'var(--color-primary)', fontSize: 14 }} />
                </Badge>
              </Tooltip>
            )}
            {member.activeJobCardCount > 0 && (
              <Tooltip title={`${member.activeJobCardCount} active job card${member.activeJobCardCount > 1 ? 's' : ''}`}>
                <Badge count={member.activeJobCardCount} color="#7c3aed" size="small">
                  <ToolOutlined style={{ color: '#7c3aed', fontSize: 14 }} />
                </Badge>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {member.activeTasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquareOutlined style={{ color: 'var(--color-primary)', fontSize: 12 }} />
            <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Active Tasks ({member.activeTaskCount})
            </Text>
          </div>
          <div className="space-y-1">
            {member.activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-brand-soft hover:bg-brand-light cursor-pointer"
                onClick={() => router.push(`/tasks/${task.id}`)}
              >
                <div className="flex items-center gap-1 min-w-0">
                  {isOverdue(task.dueDate, task.status) && (
                    <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: 11, flexShrink: 0 }} />
                  )}
                  <span className="text-xs text-gray-700 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {task.dueDate && (
                    <span className={`text-xs ${isOverdue(task.dueDate, task.status) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      <ClockCircleOutlined style={{ fontSize: 10 }} />{' '}
                      {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  <Tag color={TASK_STATUS_COLOR[task.status] || 'default'} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                    {task.status.replace('_', ' ')}
                  </Tag>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {member.activeJobCards.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <ToolOutlined style={{ color: '#7c3aed', fontSize: 12 }} />
            <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Job Cards ({member.activeJobCardCount})
            </Text>
          </div>
          <div className="space-y-1">
            {member.activeJobCards.map((jc) => (
              <div key={jc.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 cursor-pointer"
                onClick={() => router.push(`/manufacturing/po/${jc.id}`)}>
                <div className="min-w-0">
                  <span className="text-xs font-mono text-gray-500">{jc.jobNumber} </span>
                  <span className="text-xs text-gray-700 truncate">{jc.jobName}</span>
                </div>
                <Tag color={JC_STATUS_COLOR[jc.status] || 'default'} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px', flexShrink: 0 }}>
                  {JC_STATUS_LABEL[jc.status] || jc.status}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasWork && (
        <div className="text-center text-gray-400 text-xs py-2 bg-gray-50 rounded mb-3">
          No active tasks or job cards
        </div>
      )}

      <Divider className="my-3" />

      <div className="mb-3">
        <Text className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Module Access</Text>
        {member.accessModules.length === 0 ? (
          <Text className="text-xs text-gray-300">No modules assigned</Text>
        ) : (
          <div className="flex flex-wrap gap-1">
            {member.accessModules.map((mod) => (
              <Tag key={mod} color={MODULE_COLORS[mod] || 'default'} style={{ fontSize: 11, margin: 0 }}>
                {MODULE_LABELS[mod] || mod}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="small" icon={<CheckSquareOutlined />} onClick={() => router.push('/tasks')} style={{ flex: 1, fontSize: 12 }}>
          All Tasks
        </Button>
        <Button size="small" icon={<UserOutlined />} onClick={() => router.push(`/employees/${member.id}/edit`)} style={{ flex: 1, fontSize: 12 }}>
          Profile
        </Button>
      </div>
    </Card>
  );
}

export default function MyTeamPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userType } = useAuthStore();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['my-team-overview'],
    queryFn: getTeamOverview,
    enabled: userType === 'employee',
    refetchInterval: 60000,
  });

  const { data: updatesData } = useQuery({
    queryKey: ['my-team-updates'],
    queryFn: getMyTeamUpdates,
    enabled: userType === 'employee',
  });

  const postMutation = useMutation({
    mutationFn: postTeamUpdate,
    onSuccess: () => {
      message.success('Update posted to your team');
      setPostModalOpen(false);
      postForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['my-team-updates'] });
    },
    onError: () => message.error('Failed to post update'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeamUpdate,
    onSuccess: () => {
      message.success('Update deleted');
      queryClient.invalidateQueries({ queryKey: ['my-team-updates'] });
    },
  });

  const members = data?.data || [];
  const updates = updatesData?.data || [];
  const totalActiveTasks = members.reduce((sum, m) => sum + m.activeTaskCount, 0);
  const totalActiveJobCards = members.reduce((sum, m) => sum + m.activeJobCardCount, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={4} className="!mb-1 flex items-center gap-2">
            <TeamOutlined style={{ color: 'var(--color-primary)' }} /> My Team
          </Title>
          <Text className="text-gray-500 text-sm">
            Manage your direct reports — their work status, module access, and team updates
          </Text>
        </div>
        <div className="flex items-center gap-4">
          {members.length > 0 && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{members.length}</div>
                <div className="text-xs text-gray-500">Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{totalActiveTasks}</div>
                <div className="text-xs text-gray-500">Active Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalActiveJobCards}</div>
                <div className="text-xs text-gray-500">Job Cards</div>
              </div>
            </>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setPostModalOpen(true)}>
            Post Update
          </Button>
        </div>
      </div>

      {/* Team Updates Feed (manager's own posts) */}
      {updates.length > 0 && (
        <Card
          className="card-shadow mb-6"
          title={
            <span className="flex items-center gap-2">
              <BellOutlined style={{ color: 'var(--color-primary)' }} />
              Team Updates You Posted
            </span>
          }
        >
          <List
            dataSource={updates}
            renderItem={(upd) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="del"
                    title="Delete this update?"
                    onConfirm={() => deleteMutation.mutate(upd.id)}
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{upd.title}</span>
                      <Tag color={CATEGORY_COLOR[upd.category] || 'default'} style={{ fontSize: 11 }}>
                        <TagOutlined /> {upd.category}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph className="!mb-1 text-gray-700 text-sm">{upd.content}</Paragraph>
                      <Text className="text-xs text-gray-400">{dayjs(upd.createdDate).fromNow()}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Team Member Cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : members.length === 0 ? (
        <Card className="card-shadow">
          <Empty
            image={<TeamOutlined style={{ fontSize: 48, color: '#d1d5db' }} />}
            description={<span className="text-gray-400">No team members are assigned to report to you yet.</span>}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {members.map((member) => (
            <Col xs={24} sm={12} lg={8} key={member.id}>
              <MemberCard member={member} router={router} />
            </Col>
          ))}
        </Row>
      )}

      {/* Post Update Modal */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <BellOutlined style={{ color: 'var(--color-primary)' }} /> Post Update to Team
          </span>
        }
        open={postModalOpen}
        onCancel={() => { setPostModalOpen(false); postForm.resetFields(); }}
        onOk={() => postForm.submit()}
        okText="Post Update"
        confirmLoading={postMutation.isPending}
        destroyOnClose
      >
        <Form
          form={postForm}
          layout="vertical"
          className="mt-4"
          onFinish={(values) => postMutation.mutate(values)}
        >
          <Form.Item name="category" label="Category" initialValue="general">
            <Select>
              <Select.Option value="general">General</Select.Option>
              <Select.Option value="announcement">Announcement</Select.Option>
              <Select.Option value="task_update">Task Update</Select.Option>
              <Select.Option value="reminder">Reminder</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter a title' }]}>
            <Input placeholder="e.g. Weekly targets, Project update..." />
          </Form.Item>
          <Form.Item name="content" label="Message" rules={[{ required: true, message: 'Enter the message' }]}>
            <TextArea rows={4} placeholder="Write your update for the team..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
