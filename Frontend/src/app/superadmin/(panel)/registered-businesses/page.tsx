'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Input,
  Button,
  Space,
  Popconfirm,
  message,
  Typography,
  Tooltip,
  Segmented,
} from 'antd';
import {
  SearchOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import {
  getAllEnterprises,
  approveEnterprise,
  rejectEnterprise,
} from '@/lib/api/super-admin';

const { Title } = Typography;

interface Enterprise {
  id: number;
  businessName: string;
  email: string;
  mobile: string;
  status: string;
  expiryDate: string | null;
  createdDate: string;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  industry?: string | null;
}

const statusColors: Record<string, string> = {
  pending_email_verification: 'gold',
  pending_review: 'blue',
  approved_pending_completion: 'cyan',
  active: 'green',
  rejected: 'red',
  blocked: 'red',
};

const statusLabels: Record<string, string> = {
  pending_email_verification: 'Email Unverified',
  pending_review: 'Awaiting Review',
  approved_pending_completion: 'Approved · Awaiting Completion',
  active: 'Active Customer',
  rejected: 'Rejected',
  blocked: 'Blocked',
};

type FilterTab = 'all' | 'pending_review' | 'approved_pending_completion' | 'active' | 'rejected';

const TAB_LABEL: Record<FilterTab, string> = {
  all: 'All Signups',
  pending_review: 'Awaiting Review',
  approved_pending_completion: 'Approved',
  active: 'Active Customers',
  rejected: 'Rejected',
};

export default function RegisteredBusinessesPage() {
  const router = useRouter();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('pending_review');

  useEffect(() => {
    loadEnterprises();
  }, []);

  async function loadEnterprises() {
    setLoading(true);
    try {
      const res = await getAllEnterprises();
      // Only show enterprises that came through the new lightweight signup flow
      // (i.e. have any signup-related status). Legacy 'pending' payment-flow rows
      // are already shown on /superadmin/enterprises.
      const signupStatuses = new Set([
        'pending_email_verification',
        'pending_review',
        'approved_pending_completion',
        'active',
        'rejected',
      ]);
      const filtered = (res.data as Enterprise[]).filter((e) => signupStatuses.has(e.status));
      setEnterprises(filtered);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(record: Enterprise) {
    try {
      await approveEnterprise(record.id);
      message.success(`${record.businessName} approved. User notified by email.`);
      setEnterprises((prev) =>
        prev.map((e) => (e.id === record.id ? { ...e, status: 'approved_pending_completion' } : e))
      );
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to approve');
    }
  }

  async function handleReject(record: Enterprise) {
    try {
      await rejectEnterprise(record.id);
      message.success(`${record.businessName} rejected. User notified by email.`);
      setEnterprises((prev) =>
        prev.map((e) => (e.id === record.id ? { ...e, status: 'rejected' } : e))
      );
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to reject');
    }
  }

  const counts = useMemo(() => {
    const c: Record<FilterTab, number> = {
      all: enterprises.length,
      pending_review: 0,
      approved_pending_completion: 0,
      active: 0,
      rejected: 0,
    };
    for (const e of enterprises) {
      if (e.status === 'pending_review') c.pending_review++;
      else if (e.status === 'approved_pending_completion') c.approved_pending_completion++;
      else if (e.status === 'active') c.active++;
      else if (e.status === 'rejected') c.rejected++;
    }
    return c;
  }, [enterprises]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enterprises
      .filter((e) => (tab === 'all' ? true : e.status === tab))
      .filter((e) =>
        !q ||
        e.businessName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.mobile.toLowerCase().includes(q) ||
        (e.industry?.toLowerCase().includes(q) ?? false),
      );
  }, [enterprises, tab, search]);

  const columns = [
    {
      title: 'Business',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (name: string, record: Enterprise) => (
        <div>
          <div className="font-semibold text-gray-900">{name}</div>
          <div className="text-[11px] text-gray-400">
            Joined {new Date(record.createdDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      ),
      sorter: (a: Enterprise, b: Enterprise) => a.businessName.localeCompare(b.businessName),
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      render: (industry: string | null | undefined) => (
        industry
          ? (
            <Tooltip title={industry}>
              <Tag
                color="geekblue"
                style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {industry}
              </Tag>
            </Tooltip>
          )
          : <span className="text-gray-400">—</span>
      ),
      sorter: (a: Enterprise, b: Enterprise) =>
        (a.industry || '').localeCompare(b.industry || ''),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: Enterprise) => (
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-gray-700">{email}</span>
          {record.emailVerified ? (
            <Tooltip title="Email verified via OTP">
              <CheckCircleFilled style={{ color: '#16a34a', fontSize: 14 }} />
            </Tooltip>
          ) : (
            <Tooltip title="Email not yet verified">
              <ClockCircleOutlined style={{ color: '#d97706', fontSize: 13 }} />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
      render: (mobile: string, record: Enterprise) => (
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-gray-700">{mobile}</span>
          {record.mobileVerified && (
            <Tooltip title="Mobile verified">
              <CheckCircleFilled style={{ color: '#16a34a', fontSize: 14 }} />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] ?? 'default'}>{statusLabels[status] ?? status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Enterprise) => {
        const isPendingReview = record.status === 'pending_review';
        return (
          <Space wrap>
            {isPendingReview && (
              <>
                <Popconfirm
                  title={`Approve ${record.businessName}?`}
                  description="They will be emailed and can complete their registration."
                  onConfirm={() => handleApprove(record)}
                  okText="Approve"
                  cancelText="Cancel"
                >
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />}>
                    Approve
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title={`Reject ${record.businessName}?`}
                  description="They will be emailed that registration was not approved."
                  onConfirm={() => handleReject(record)}
                  okText="Reject"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger icon={<CloseCircleOutlined />}>
                    Reject
                  </Button>
                </Popconfirm>
              </>
            )}
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/superadmin/enterprises/${record.id}`)}
            >
              View
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={4} className="!mb-0">Register Business</Title>
          <p className="text-[12px] text-gray-400 m-0 mt-0.5">
            Verified business signups awaiting your review.
          </p>
        </div>
        <Input
          placeholder="Search name, email, or mobile"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className="w-full sm:w-72"
        />
      </div>

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as FilterTab)}
          options={(['pending_review', 'approved_pending_completion', 'active', 'rejected', 'all'] as FilterTab[]).map((k) => ({
            label: (
              <span>
                {TAB_LABEL[k]} <span className="text-gray-400">({counts[k]})</span>
              </span>
            ),
            value: k,
          }))}
        />
      </div>

      <Card bodyStyle={{ padding: 12 }}>
        <Table
          columns={columns}
          dataSource={visible}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, responsive: true }}
        />
      </Card>
    </div>
  );
}
