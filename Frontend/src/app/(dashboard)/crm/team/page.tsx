'use client';

import { useState } from 'react';
import { Typography, Card, Button, Tag, Modal, Select, message, Popconfirm, Empty, Avatar } from 'antd';
import {
  TeamOutlined, PlusOutlined, UserOutlined, DeleteOutlined,
  ShoppingCartOutlined, AppstoreOutlined, InboxOutlined,
  FileTextOutlined, DollarOutlined, FileDoneOutlined,
  ToolOutlined, ShoppingOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCrmTeam, updateReportingTo, getModuleLeaders, setModuleLeader } from '@/lib/api/crm';
import { useAuthStore } from '@/stores/authStore';
import { CrmTeamMember, ModuleTeamLeader } from '@/types/crm';

const { Title } = Typography;

const MODULE_LIST = [
  { key: 'sales',         label: 'Sales',           icon: <ShoppingCartOutlined /> },
  { key: 'crm',           label: 'CRM',             icon: <TeamOutlined /> },
  { key: 'orders',        label: 'Orders',          icon: <FileDoneOutlined /> },
  { key: 'manufacturing', label: 'Manufacturing',   icon: <ToolOutlined /> },
  { key: 'inventory',     label: 'Inventory',       icon: <InboxOutlined /> },
  { key: 'procurement',   label: 'Procurement',     icon: <ShoppingOutlined /> },
  { key: 'invoicing',     label: 'Invoicing',       icon: <DollarOutlined /> },
  { key: 'catalog',       label: 'Products',        icon: <AppstoreOutlined /> },
  { key: 'reports',       label: 'Reports',         icon: <BarChartOutlined /> },
  { key: 'employees',     label: 'HR & Employees',  icon: <UserOutlined /> },
];

export default function CrmTeamPage() {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null | undefined>(undefined);

  // ── Team hierarchy data ──────────────────────────────────────
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['crm-team-all', enterpriseId],
    queryFn: getCrmTeam,
    enabled: !!enterpriseId,
  });

  const hierarchyMutation = useMutation({
    mutationFn: ({ id, reportingTo }: { id: number; reportingTo: number | null }) =>
      updateReportingTo(id, reportingTo),
    onSuccess: () => {
      message.success('Team updated');
      queryClient.invalidateQueries({ queryKey: ['crm-team-all'] });
      queryClient.invalidateQueries({ queryKey: ['crm-team'] });
      queryClient.invalidateQueries({ queryKey: ['crm-team-assignable'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update'),
  });

  // ── Module leaders data ──────────────────────────────────────
  const { data: leadersData } = useQuery({
    queryKey: ['module-leaders', enterpriseId],
    queryFn: getModuleLeaders,
    enabled: !!enterpriseId,
  });

  const leaderMutation = useMutation({
    mutationFn: ({ moduleName, employeeId }: { moduleName: string; employeeId: number | null }) =>
      setModuleLeader(moduleName, employeeId),
    onSuccess: () => {
      message.success('Team leader updated');
      queryClient.invalidateQueries({ queryKey: ['module-leaders'] });
      setEditingModule(null);
      setEditingEmployeeId(undefined);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update'),
  });

  const team: CrmTeamMember[] = teamData?.data || [];
  const moduleLeaders: ModuleTeamLeader[] = leadersData?.data || [];

  const getLeaderForModule = (moduleKey: string) =>
    moduleLeaders.find(l => l.module_name === moduleKey) ?? null;

  // Grouping for team hierarchy cards
  const managerIds = new Set(team.filter(e => e.reporting_to).map(e => e.reporting_to as number));
  const managers = team.filter(e => managerIds.has(e.id));
  const unassigned = team.filter(e => !e.reporting_to);

  const managerOptions = team.map(e => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name}`,
  }));

  const memberOptions = team
    .filter(e => e.id !== selectedManager && e.reporting_to !== selectedManager)
    .map(e => ({
      value: e.id,
      label: `${e.first_name} ${e.last_name}${e.reporting_to ? ' (in another team)' : ''}`,
    }));

  const getMemberName = (id: number) => {
    const e = team.find(m => m.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `#${id}`;
  };

  const handleAddMember = () => {
    if (!selectedManager || !selectedMember) {
      message.warning('Please select both a manager and a member');
      return;
    }
    hierarchyMutation.mutate(
      { id: selectedMember, reportingTo: selectedManager },
      {
        onSuccess: () => {
          setAddModalOpen(false);
          setSelectedManager(null);
          setSelectedMember(null);
        },
      },
    );
  };

  const handleSaveModuleLeader = (moduleKey: string) => {
    if (editingEmployeeId === undefined) return;
    leaderMutation.mutate({ moduleName: moduleKey, employeeId: editingEmployeeId ?? null });
  };

  const handleStartEditModule = (moduleKey: string) => {
    const current = getLeaderForModule(moduleKey);
    setEditingModule(moduleKey);
    setEditingEmployeeId(current?.employee_id ?? null);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Title level={4} className="!mb-1 flex items-center gap-2">
            <TeamOutlined style={{ color: 'var(--color-primary)' }} /> Team Management
          </Title>
          <p className="text-gray-500 text-sm">Manage teams, hierarchy, and module leaders</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
          Add Member to Team
        </Button>
      </div>

      <div className="flex gap-5 items-start">
        {/* ── Left: Team Hierarchy ─────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Team Hierarchy</h3>

          {teamLoading ? (
            <div className="text-gray-400 text-center py-12">Loading...</div>
          ) : managers.length === 0 && unassigned.length === 0 ? (
            <Empty description="No employees found." />
          ) : (
            <>
              {managers.map(manager => {
                const members = team.filter(e => e.reporting_to === manager.id);
                return (
                  <Card
                    key={manager.id}
                    className="card-shadow"
                    title={
                      <div className="flex items-center gap-2">
                        <UserOutlined className="text-brand" />
                        <span className="font-semibold">{manager.first_name} {manager.last_name}</span>
                        <Tag color="blue">Manager</Tag>
                        <Tag color="default">{members.length} member{members.length !== 1 ? 's' : ''}</Tag>
                      </div>
                    }
                  >
                    {members.length === 0 ? (
                      <p className="text-gray-400 text-sm">No members assigned yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {members.map(member => (
                          <div
                            key={member.id}
                            className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                          >
                            <UserOutlined className="text-gray-400 text-xs" />
                            <span className="text-sm font-medium">{member.first_name} {member.last_name}</span>
                            <span className="text-xs text-gray-400 ml-1">{member.email}</span>
                            <Popconfirm
                              title="Remove from team?"
                              description={`Remove ${member.first_name} from ${manager.first_name}'s team?`}
                              onConfirm={() => hierarchyMutation.mutate({ id: member.id, reportingTo: null })}
                              okText="Remove"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                            >
                              <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                className="!text-red-400 hover:!text-red-600 ml-1"
                              />
                            </Popconfirm>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}

              {unassigned.length > 0 && (
                <Card
                  className="card-shadow border-dashed"
                  title={
                    <div className="flex items-center gap-2">
                      <UserOutlined className="text-gray-400" />
                      <span className="font-semibold text-gray-500">Unassigned</span>
                      <Tag>{unassigned.length} employee{unassigned.length !== 1 ? 's' : ''}</Tag>
                    </div>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    {unassigned.map(emp => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
                      >
                        <UserOutlined className="text-gray-300 text-xs" />
                        <span className="text-sm text-gray-600">{emp.first_name} {emp.last_name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Use &quot;Add Member to Team&quot; to assign these employees to a manager.
                  </p>
                </Card>
              )}
            </>
          )}
        </div>

        {/* ── Right: Module Team Leaders Sidebar ───────────────── */}
        <div className="w-72 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Module Team Leaders
          </h3>
          <Card className="card-shadow">
            <div className="space-y-1">
              {MODULE_LIST.map((mod, idx) => {
                const leader = getLeaderForModule(mod.key);
                const isEditing = editingModule === mod.key;

                return (
                  <div key={mod.key}>
                    {idx > 0 && <div className="border-t border-slate-100 my-1" />}
                    <div className="py-2">
                      {/* Module label */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-gray-400 text-xs">{mod.icon}</span>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {mod.label}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Select
                            size="small"
                            style={{ flex: 1 }}
                            value={editingEmployeeId ?? undefined}
                            onChange={v => setEditingEmployeeId(v ?? null)}
                            allowClear
                            placeholder="Select leader"
                            showSearch
                            optionFilterProp="label"
                            options={team.map(e => ({
                              value: e.id,
                              label: `${e.first_name} ${e.last_name}`,
                            }))}
                          />
                          <Button
                            size="small"
                            type="primary"
                            loading={leaderMutation.isPending}
                            onClick={() => handleSaveModuleLeader(mod.key)}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            onClick={() => { setEditingModule(null); setEditingEmployeeId(undefined); }}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : leader ? (
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 group"
                          onClick={() => handleStartEditModule(mod.key)}
                        >
                          <Avatar size={20} style={{ backgroundColor: 'var(--color-primary)', fontSize: 10 }}>
                            {leader.employee_name.charAt(0).toUpperCase()}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                              {leader.employee_name}
                            </p>
                          </div>
                          <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100">Edit</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditModule(mod.key)}
                          className="text-xs text-brand hover:text-brand-dark flex items-center gap-1"
                        >
                          <PlusOutlined /> Assign leader
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        title="Add Member to Team"
        open={addModalOpen}
        onOk={handleAddMember}
        onCancel={() => { setAddModalOpen(false); setSelectedManager(null); setSelectedMember(null); }}
        confirmLoading={hierarchyMutation.isPending}
        okText="Add to Team"
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manager (Team Leader)</label>
            <Select
              placeholder="Select a manager"
              style={{ width: '100%' }}
              value={selectedManager ?? undefined}
              onChange={v => { setSelectedManager(v); setSelectedMember(null); }}
              showSearch
              optionFilterProp="label"
              options={managerOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee to Add</label>
            <Select
              placeholder={selectedManager ? 'Select an employee' : 'Select a manager first'}
              style={{ width: '100%' }}
              value={selectedMember ?? undefined}
              onChange={v => setSelectedMember(v)}
              showSearch
              optionFilterProp="label"
              disabled={!selectedManager}
              options={memberOptions}
            />
          </div>
          {selectedManager && selectedMember && (
            <p className="text-sm text-brand bg-brand-soft rounded-lg px-3 py-2">
              <strong>{getMemberName(selectedMember)}</strong> will report to <strong>{getMemberName(selectedManager)}</strong>
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
