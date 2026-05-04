'use client';

import { useState } from 'react';
import { Button, Typography, Modal, message } from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getLeadList, deleteLead } from '@/lib/api/crm';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import { LeadTable } from '@/components/crm/LeadTable';
import { LeadFilters } from '@/components/crm/LeadFilters';
import { LeadKpiBar } from '@/components/crm/LeadKpiBar';
import { AssignLeadModal } from '@/components/crm/AssignLeadModal';
import { CrmLead } from '@/types/crm';

const { Title } = Typography;

export default function CrmPage() {
  const { hasPermission } = usePermissions();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [assignModalLead, setAssignModalLead] = useState<CrmLead | null>(null);

  const canCreate  = hasPermission('crm', 'leads', 'create');
  const canEdit    = hasPermission('crm', 'leads', 'edit');
  const canDelete  = hasPermission('crm', 'leads', 'delete');
  const canAssign  = hasPermission('crm', 'assignments', 'create');

  const { data, isLoading } = useQuery({
    queryKey: ['crm-leads', enterpriseId, page, pageSize, search, status],
    queryFn: () => getLeadList({ page, pageSize, search: search || undefined, status: status || undefined }),
    enabled: !!enterpriseId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLead(id),
    onSuccess: () => {
      message.success('Lead deleted');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to delete'),
  });

  const handleDelete = (lead: CrmLead) => {
    Modal.confirm({
      title: `Delete ${lead.lead_number}?`,
      content: 'This will permanently delete the lead and all its history.',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(lead.id),
    });
  };

  const leads = data?.data || [];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start mb-6 gap-3">
        <div>
          <Title level={4} className="!mb-1 flex items-center gap-2">
            <TeamOutlined style={{ color: 'var(--color-primary)' }} /> CRM Leads
          </Title>
          <p className="text-gray-500 text-sm">Manage your sales leads and follow-ups</p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/crm/add')}>
            Add Lead
          </Button>
        )}
      </div>

      <LeadKpiBar leads={leads} loading={isLoading} />

      <LeadFilters
        search={search}
        status={status}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onStatusChange={v => { setStatus(v); setPage(1); }}
      />

      <LeadTable
        leads={leads}
        loading={isLoading}
        total={data?.totalRecords || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        onAssign={canAssign ? (l) => setAssignModalLead(l) : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        canAssign={canAssign}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <AssignLeadModal
        open={!!assignModalLead}
        lead={assignModalLead}
        onClose={() => setAssignModalLead(null)}
      />
    </div>
  );
}
