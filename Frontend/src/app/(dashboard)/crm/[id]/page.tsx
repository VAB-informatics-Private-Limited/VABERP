'use client';

import { useState } from 'react';
import {
  Card, Button, Tag, Descriptions, Space, Select, message,
  Typography, Row, Col, Tabs, Spin, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, UserSwitchOutlined,
  PhoneOutlined, PlusOutlined, SwapOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { getLeadById, getLeadFollowups, getLeadActivity, updateLeadStatus } from '@/lib/api/crm';
import { usePermissions } from '@/stores/authStore';
import { LeadStatusBadge } from '@/components/crm/LeadStatusBadge';
import { FollowupTimeline } from '@/components/crm/FollowupTimeline';
import { ActivityLog } from '@/components/crm/ActivityLog';
import { FollowupForm } from '@/components/crm/FollowupForm';
import { AssignLeadModal } from '@/components/crm/AssignLeadModal';
import { CRM_STATUS_OPTIONS } from '@/types/crm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = Number(params.id);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [followupOpen, setFollowupOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const canEdit    = hasPermission('crm', 'leads', 'edit');
  const canAssign  = hasPermission('crm', 'assignments', 'create');

  const { data: leadData, isLoading } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: () => getLeadById(leadId),
    enabled: !!leadId,
  });

  const { data: followupsData, isLoading: followupsLoading } = useQuery({
    queryKey: ['crm-followups', leadId],
    queryFn: () => getLeadFollowups(leadId),
    enabled: !!leadId,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['crm-activity', leadId],
    queryFn: () => getLeadActivity(leadId),
    enabled: !!leadId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateLeadStatus(leadId, status),
    onSuccess: () => {
      message.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-activity', leadId] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update status'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const lead = leadData?.data;
  if (!lead) return <div className="text-center py-20 text-gray-400">Lead not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/crm')} />
          <div>
            <Title level={4} className="!mb-0">{lead.lead_number}</Title>
            <Text type="secondary">{lead.customer_name}</Text>
          </div>
        </div>
        <Space wrap>
          {canEdit && (
            <Select
              value={lead.status}
              onChange={v => statusMutation.mutate(v)}
              loading={statusMutation.isPending}
              style={{ width: 160 }}
              options={CRM_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              suffixIcon={<SwapOutlined />}
            />
          )}
          {canAssign && (
            <Button icon={<UserSwitchOutlined />} onClick={() => setAssignOpen(true)}>Assign</Button>
          )}
          {hasPermission('crm', 'followups', 'create') && (
            <Button icon={<PlusOutlined />} onClick={() => setFollowupOpen(true)}>Log Follow-up</Button>
          )}
          {canEdit && (
            <Button type="primary" icon={<EditOutlined />} onClick={() => router.push(`/crm/${leadId}/edit`)}>Edit</Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Lead Info */}
        <Col xs={24} lg={10}>
          <Card title="Lead Details" className="card-shadow mb-4">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status"><LeadStatusBadge status={lead.status} /></Descriptions.Item>
              <Descriptions.Item label="Mobile">{lead.mobile || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{lead.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Business">{lead.business_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Source">{lead.source || '—'}</Descriptions.Item>
              <Descriptions.Item label="Expected Value">
                {lead.expected_value ? `₹${Number(lead.expected_value).toLocaleString('en-IN')}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Next Follow-up">
                {lead.next_followup_date ? dayjs(lead.next_followup_date).format('DD MMM YYYY') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned To">
                {lead.assigned_to_name ? <Tag icon={<UserSwitchOutlined />}>{lead.assigned_to_name}</Tag> : '—'}
              </Descriptions.Item>
              {lead.manager_name && (
                <Descriptions.Item label="Manager">{lead.manager_name}</Descriptions.Item>
              )}
              <Descriptions.Item label="Created">{dayjs(lead.created_date).format('DD MMM YYYY')}</Descriptions.Item>
            </Descriptions>
            {lead.requirements && (
              <>
                <Divider className="my-3" />
                <div className="text-xs text-gray-500 mb-1">Requirements</div>
                <p className="text-sm">{lead.requirements}</p>
              </>
            )}
            {lead.remarks && (
              <>
                <Divider className="my-3" />
                <div className="text-xs text-gray-500 mb-1">Remarks</div>
                <p className="text-sm">{lead.remarks}</p>
              </>
            )}
          </Card>
        </Col>

        {/* Tabs: Follow-ups + Activity */}
        <Col xs={24} lg={14}>
          <Card className="card-shadow">
            <Tabs
              items={[
                {
                  key: 'followups',
                  label: <span><PhoneOutlined /> Follow-ups ({followupsData?.data?.length || 0})</span>,
                  children: (
                    <FollowupTimeline
                      followups={followupsData?.data || []}
                      loading={followupsLoading}
                    />
                  ),
                },
                {
                  key: 'activity',
                  label: 'Activity Log',
                  children: (
                    <ActivityLog
                      activities={activityData?.data || []}
                      loading={activityLoading}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <FollowupForm
        open={followupOpen}
        leadId={leadId}
        onClose={() => setFollowupOpen(false)}
      />
      <AssignLeadModal
        open={assignOpen}
        lead={lead}
        onClose={() => setAssignOpen(false)}
      />
    </div>
  );
}
