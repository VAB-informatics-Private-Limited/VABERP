'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
  Space,
  Descriptions,
  Divider,
  message,
} from 'antd';
import {
  CustomerServiceOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { getAllTickets, getTicket, replyToTicket, getTicketStats } from '@/lib/api/super-admin';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Ticket {
  id: number;
  enterpriseId: number;
  enterpriseName: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  adminReply: string | null;
  repliedAt: string | null;
  createdDate: string;
  updatedDate: string;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

const categoryColors: Record<string, string> = {
  billing: 'gold',
  technical: 'blue',
  account: 'purple',
  other: 'default',
};

const priorityColors: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const statusColors: Record<string, string> = {
  open: 'red',
  in_progress: 'orange',
  resolved: 'green',
  closed: 'default',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const TAB_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const [ticketRes, statsRes] = await Promise.all([
        getAllTickets(status),
        getTicketStats(),
      ]);
      setTickets(ticketRes.data);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function handleViewTicket(id: number) {
    try {
      const res = await getTicket(id);
      setSelectedTicket(res.data);
      form.setFieldsValue({
        reply: res.data.adminReply || '',
        status: res.data.status,
      });
      setDrawerOpen(true);
    } catch {
      message.error('Failed to load ticket');
    }
  }

  async function handleSubmitReply(values: { reply: string; status: string }) {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      await replyToTicket(selectedTicket.id, values.reply, values.status);
      message.success('Reply submitted');
      setDrawerOpen(false);
      loadTickets();
    } catch {
      message.error('Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      title: '#ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => <span className="text-slate-500">#{id}</span>,
    },
    {
      title: 'Enterprise',
      dataIndex: 'enterpriseName',
      key: 'enterpriseName',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => (
        <Tag color={categoryColors[cat] ?? 'default'}>{cat}</Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => (
        <Tag color={priorityColors[p] ?? 'default'}>{p}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={statusColors[s] ?? 'default'}>{statusLabels[s] ?? s}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString(),
      sorter: (a: Ticket, b: Ticket) =>
        new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Ticket) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewTicket(record.id)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-0">
          Support Tickets
        </Title>
        <p className="text-slate-500 text-sm mt-1">Manage enterprise support requests</p>
      </div>

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tickets"
              value={stats?.total ?? 0}
              prefix={<CustomerServiceOutlined className="text-blue-500" />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Open"
              value={stats?.open ?? 0}
              prefix={<ExclamationCircleOutlined className="text-red-500" />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats?.inProgress ?? 0}
              prefix={<ClockCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: '#f97316' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Resolved"
              value={stats?.resolved ?? 0}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="flex items-center gap-2 mb-4 border-b pb-3">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      <Drawer
        title={selectedTicket ? `Ticket #${selectedTicket.id} — ${selectedTicket.subject}` : 'Ticket Details'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        footer={null}
      >
        {selectedTicket && (
          <div>
            <Descriptions column={1} bordered size="small" className="mb-4">
              <Descriptions.Item label="Enterprise">{selectedTicket.enterpriseName}</Descriptions.Item>
              <Descriptions.Item label="Subject">{selectedTicket.subject}</Descriptions.Item>
              <Descriptions.Item label="Category">
                <Tag color={categoryColors[selectedTicket.category] ?? 'default'}>{selectedTicket.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={priorityColors[selectedTicket.priority] ?? 'default'}>{selectedTicket.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[selectedTicket.status] ?? 'default'}>
                  {statusLabels[selectedTicket.status] ?? selectedTicket.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {new Date(selectedTicket.createdDate).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <Text strong className="text-sm text-slate-600 block mb-2">Message</Text>
              <p className="text-slate-700 whitespace-pre-wrap text-sm">{selectedTicket.message}</p>
            </div>

            {selectedTicket.adminReply && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                <Text strong className="text-sm text-blue-700 block mb-1">Previous Reply</Text>
                <p className="text-slate-700 whitespace-pre-wrap text-sm">{selectedTicket.adminReply}</p>
                {selectedTicket.repliedAt && (
                  <Text type="secondary" className="text-xs mt-2 block">
                    Replied on {new Date(selectedTicket.repliedAt).toLocaleString()}
                  </Text>
                )}
              </div>
            )}

            <Divider />

            <Text strong className="block mb-3">
              {selectedTicket.adminReply ? 'Update Reply' : 'Reply to Ticket'}
            </Text>

            <Form form={form} layout="vertical" onFinish={handleSubmitReply}>
              <Form.Item
                name="reply"
                label="Admin Reply"
                rules={[{ required: true, message: 'Please enter a reply' }]}
              >
                <TextArea rows={4} placeholder="Type your reply..." />
              </Form.Item>

              <Form.Item
                name="status"
                label="Update Status"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="open">Open</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="resolved">Resolved</Option>
                  <Option value="closed">Closed</Option>
                </Select>
              </Form.Item>

              <Space>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Submit Reply
                </Button>
                <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
              </Space>
            </Form>
          </div>
        )}
      </Drawer>
    </div>
  );
}
