'use client';

import { Typography, Card, Descriptions, Tag, Spin, Empty, Button } from 'antd';
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  CalendarOutlined,
  TeamOutlined,
  SafetyOutlined,
  EditOutlined,
  CrownOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/authStore';
import { getEmployeeById } from '@/lib/api/employees';
import { getBusinessProfile } from '@/lib/api/settings';
import type { Employee, Enterprise } from '@/types/auth';

const { Title, Text } = Typography;

function formatDate(d?: string | null) {
  if (!d) return '—';
  const dj = dayjs(d);
  return dj.isValid() ? dj.format('DD MMM YYYY') : '—';
}

function statusTag(status?: string) {
  if (!status) return <Tag>—</Tag>;
  const s = status.toLowerCase();
  const color =
    s === 'active' || s === 'approved'
      ? 'green'
      : s === 'pending' || s.startsWith('pending')
      ? 'orange'
      : s === 'inactive' || s === 'expired'
      ? 'default'
      : s === 'rejected' || s === 'blocked'
      ? 'red'
      : 'blue';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return <Tag color={color}>{label}</Tag>;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, userType } = useAuthStore();

  const isEmployee = userType === 'employee';
  const isEnterprise = userType === 'enterprise';

  const employeeId = isEmployee ? (user as Employee | null)?.id : undefined;
  const enterpriseId = isEnterprise ? (user as Enterprise | null)?.enterprise_id : undefined;

  const { data: empResp, isLoading: empLoading } = useQuery({
    queryKey: ['profile-employee', employeeId],
    queryFn: () => getEmployeeById(employeeId!),
    enabled: !!employeeId,
  });

  const { data: bizResp, isLoading: bizLoading } = useQuery({
    queryKey: ['profile-business', enterpriseId],
    queryFn: () => getBusinessProfile(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const loading = empLoading || bizLoading;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Empty description="Not signed in" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const employee = empResp?.data;
  const business = bizResp?.data;
  const ent = isEnterprise ? (user as Enterprise) : null;

  const displayName = isEmployee
    ? `${employee?.first_name ?? (user as Employee).first_name} ${employee?.last_name ?? (user as Employee).last_name}`.trim()
    : business?.business_name || (user as Enterprise).business_name;

  const displayEmail = isEmployee
    ? employee?.email ?? (user as Employee).email
    : business?.email ?? (user as Enterprise).email;

  const initials = (() => {
    const parts = (displayName || 'U').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card
        bodyStyle={{ padding: 24 }}
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-faint) 0%, #ffffff 100%)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background:
                  'linear-gradient(135deg, var(--color-primary-darker) 0%, var(--color-primary) 50%, var(--color-primary-hover) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: '0.02em',
                flexShrink: 0,
                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <Title level={3} className="!mb-1 !text-slate-900">{displayName || 'User'}</Title>
              <div className="flex items-center gap-2 flex-wrap">
                <Text type="secondary" className="!text-[13px]">
                  <MailOutlined /> {displayEmail || '—'}
                </Text>
                <Tag
                  icon={isEmployee ? <TeamOutlined /> : <ShopOutlined />}
                  color={isEmployee ? 'blue' : 'gold'}
                  style={{ marginLeft: 4 }}
                >
                  {isEmployee ? 'Employee' : 'Business Owner'}
                </Tag>
                {statusTag(isEmployee ? employee?.status : ent?.status)}
              </div>
            </div>
          </div>
          {isEnterprise && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => router.push('/settings')}
            >
              Edit Business Details
            </Button>
          )}
        </div>
      </Card>

      {/* Contact / personal info */}
      <Card
        title={
          <span>
            <IdcardOutlined className="mr-2" />
            {isEmployee ? 'Personal Information' : 'Business Information'}
          </span>
        }
      >
        <Descriptions column={{ xs: 1, sm: 2 }} size="middle" labelStyle={{ width: 180, color: '#64748b' }}>
          {isEmployee ? (
            <>
              <Descriptions.Item label={<><IdcardOutlined /> Employee ID</>}>
                {employee?.id ?? (user as Employee).id ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {employee?.email ?? (user as Employee).email ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
                {employee?.phone_number ?? (user as Employee).phone_number ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> Hire Date</>}>
                {formatDate(employee?.hire_date ?? (user as Employee).hire_date)}
              </Descriptions.Item>
            </>
          ) : (
            <>
              <Descriptions.Item label={<><ShopOutlined /> Business Name</>}>
                {business?.business_name ?? ent?.business_name ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {business?.email ?? ent?.email ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> Mobile</>}>
                {business?.mobile ?? ent?.mobile ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><EnvironmentOutlined /> Address</>} span={2}>
                {business?.address || ent?.address || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="City">
                {business?.city ?? ent?.city ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="State">
                {business?.state ?? ent?.state ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Pincode">
                {business?.pincode ?? ent?.pincode ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="GSTIN">
                {business?.gst_number ?? ent?.gst_number ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="CIN">
                {business?.cin_number ?? ent?.cin_number ?? '—'}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      {/* Employment / Subscription block */}
      {isEmployee ? (
        <Card
          title={
            <span>
              <TeamOutlined className="mr-2" />
              Employment Details
            </span>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} size="middle" labelStyle={{ width: 180, color: '#64748b' }}>
            <Descriptions.Item label="Department">
              {employee?.department_name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Designation">
              {employee?.designation_name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Reporting Head">
              {employee?.is_reporting_head ? <Tag color="purple">Yes</Tag> : <Tag>No</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {statusTag(employee?.status)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        <Card
          title={
            <span>
              <CrownOutlined className="mr-2" />
              Subscription
            </span>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} size="middle" labelStyle={{ width: 180, color: '#64748b' }}>
            <Descriptions.Item label="Plan ID">
              {ent?.plan_id ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Subscription Status">
              {statusTag(ent?.subscription_status)}
            </Descriptions.Item>
            <Descriptions.Item label="Started">
              {formatDate(ent?.subscription_start_date)}
            </Descriptions.Item>
            <Descriptions.Item label="Expires">
              {formatDate(ent?.expiry_date ?? business?.expiry_date)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Verification (enterprise only) */}
      {isEnterprise && (
        <Card
          title={
            <span>
              <SafetyOutlined className="mr-2" />
              Verification
            </span>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} size="middle" labelStyle={{ width: 180, color: '#64748b' }}>
            <Descriptions.Item label="Email Verified">
              {ent?.email_status === 1 ? <Tag color="green">Verified</Tag> : <Tag color="orange">Unverified</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Mobile Verified">
              {ent?.mobile_status === 1 ? <Tag color="green">Verified</Tag> : <Tag color="orange">Unverified</Tag>}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
}
