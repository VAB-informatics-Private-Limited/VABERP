'use client';

import { useState } from 'react';
import { Typography, Tag, Spin, Table, Badge, Tabs, Descriptions, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  IdcardOutlined,
  CalendarOutlined,
  HistoryOutlined,
  SafetyOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getEmployeeById } from '@/lib/api/employees';
import { getEmployeePermissions } from '@/lib/api/employees';
import { getAuditLogs } from '@/lib/api/audit-logs';
import { MenuPermissions } from '@/types/auth';

const { Title, Text } = Typography;

const MODULE_LABELS: Record<string, string> = {
  sales: 'Sales',
  enquiry: 'Enquiry',
  orders: 'Orders',
  catalog: 'Catalog',
  inventory: 'Inventory',
  procurement: 'Procurement',
  invoicing: 'Invoicing',
  employees: 'Employees',
  reports: 'Reports',
  configurations: 'Configurations',
  crm: 'CRM',
  tasks: 'Tasks',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  approve: 'Approved',
  send: 'Sent',
  view: 'Viewed',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  approve: 'purple',
  send: 'cyan',
  view: 'default',
};

function formatPermissions(permissions: MenuPermissions) {
  const rows: { module: string; submodule: string; actions: string[] }[] = [];
  for (const [module, submodules] of Object.entries(permissions)) {
    for (const [submodule, actions] of Object.entries(submodules as Record<string, Record<string, number>>)) {
      const granted = Object.entries(actions)
        .filter(([, val]) => val === 1)
        .map(([action]) => action);
      if (granted.length > 0) {
        rows.push({
          module: MODULE_LABELS[module] || module,
          submodule: submodule.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          actions: granted,
        });
      }
    }
  }
  return rows;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = Number(params.id);
  const [activityPage, setActivityPage] = useState(1);

  const { data: empResp, isLoading: empLoading } = useQuery({
    queryKey: ['employee-detail', employeeId],
    queryFn: () => getEmployeeById(employeeId),
    enabled: !!employeeId,
  });

  const { data: permResp, isLoading: permLoading } = useQuery({
    queryKey: ['employee-permissions', employeeId],
    queryFn: () => getEmployeePermissions(employeeId),
    enabled: !!employeeId,
  });

  const { data: logsResp, isLoading: logsLoading } = useQuery({
    queryKey: ['employee-audit-logs', employeeId, activityPage],
    queryFn: () => getAuditLogs({ userId: employeeId, page: activityPage, pageSize: 20 }),
    enabled: !!employeeId,
  });

  const employee = empResp?.data;
  const permData = permResp?.data;
  const permRows = permData?.permissions ? formatPermissions(permData.permissions) : [];
  const logs = logsResp?.data || [];
  const totalLogs = logsResp?.totalRecords || 0;

  if (empLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4"
        >
          <ArrowLeftOutlined /> Back
        </button>
        <Empty description="Employee not found" />
      </div>
    );
  }

  const fullName = `${employee.first_name} ${employee.last_name}`.trim();
  const isActive = employee.status === 'active';

  const permColumns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 150,
      render: (val: string) => <span className="font-medium">{val}</span>,
    },
    {
      title: 'Sub-Module',
      dataIndex: 'submodule',
      key: 'submodule',
      width: 200,
    },
    {
      title: 'Granted Actions',
      dataIndex: 'actions',
      key: 'actions',
      render: (actions: string[]) => (
        <div className="flex flex-wrap gap-1">
          {actions.map((a) => (
            <Tag
              key={a}
              color={
                a === 'view' ? 'blue'
                : a === 'create' ? 'green'
                : a === 'edit' ? 'orange'
                : a === 'delete' ? 'red'
                : a === 'approve' ? 'purple'
                : 'default'
              }
              className="text-xs capitalize"
            >
              {a}
            </Tag>
          ))}
        </div>
      ),
    },
  ];

  const logColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'created_date',
      key: 'created_date',
      width: 160,
      render: (val: string) => (
        <span className="text-xs text-gray-600">
          {dayjs(val).format('DD MMM YYYY, HH:mm')}
        </span>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (val: string) => (
        <Tag color={ACTION_COLORS[val] || 'default'} className="text-xs capitalize">
          {ACTION_LABELS[val] || val}
        </Tag>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 140,
      render: (val: string) => (
        <span className="text-xs capitalize">{val?.replace(/_/g, ' ')}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val: string) => (
        <span className="text-sm text-gray-700">{val || '—'}</span>
      ),
    },
  ];

  const profileTab = (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold shrink-0">
            {employee.first_name?.[0]?.toUpperCase()}{employee.last_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <Title level={4} className="!mb-0">{fullName}</Title>
              <Badge
                status={isActive ? 'success' : 'error'}
                text={isActive ? 'Active' : 'Inactive'}
              />
            </div>
            {employee.designation_name && (
              <Text className="text-gray-500">{employee.designation_name}</Text>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Title level={5} className="!mb-4 text-gray-700">Employee Information</Title>
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small" labelStyle={{ color: '#6b7280', fontWeight: 500 }}>
          <Descriptions.Item label={<><MailOutlined className="mr-1" />Email</>}>
            {employee.email || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<><PhoneOutlined className="mr-1" />Phone</>}>
            {employee.phone_number || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<><TeamOutlined className="mr-1" />Department</>}>
            {employee.department_name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<><IdcardOutlined className="mr-1" />Designation</>}>
            {employee.designation_name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined className="mr-1" />Hire Date</>}>
            {employee.hire_date ? dayjs(employee.hire_date).format('DD MMM YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<><UserOutlined className="mr-1" />Status</>}>
            {isActive ? (
              <span className="text-green-600 flex items-center gap-1"><CheckCircleOutlined /> Active</span>
            ) : (
              <span className="text-red-500 flex items-center gap-1"><CloseCircleOutlined /> Inactive</span>
            )}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </div>
  );

  const permissionsTab = (
    <div className="space-y-4">
      {permLoading ? (
        <div className="flex justify-center py-12"><Spin /></div>
      ) : (
        <>
          {/* Assignment metadata */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <Text className="text-xs text-blue-600 font-medium uppercase tracking-wide">Assigned By</Text>
                <div className="mt-1 text-sm font-medium text-gray-800">
                  {permData?.updatedByName || (permData?.updatedBy ? `Employee #${permData.updatedBy}` : 'Not recorded')}
                </div>
              </div>
              <div>
                <Text className="text-xs text-blue-600 font-medium uppercase tracking-wide">Last Updated</Text>
                <div className="mt-1 text-sm font-medium text-gray-800">
                  {permData?.updatedAt ? dayjs(permData.updatedAt).format('DD MMM YYYY, HH:mm') : 'Not recorded'}
                </div>
              </div>
              <div>
                <Text className="text-xs text-blue-600 font-medium uppercase tracking-wide">Data Access</Text>
                <div className="mt-1 text-sm font-medium text-gray-800">
                  {permData?.ownDataOnly
                    ? 'Own data only'
                    : permData?.dataStartDate
                    ? `From ${dayjs(permData.dataStartDate).format('DD MMM YYYY')}`
                    : 'All data'}
                </div>
              </div>
            </div>
          </div>

          {permRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <Empty description="No permissions assigned" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Table
                dataSource={permRows}
                columns={permColumns}
                rowKey={(r) => `${r.module}-${r.submodule}`}
                pagination={false}
                size="small"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => router.push(`/employees/${employeeId}/permissions`)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <EditOutlined /> Edit Permissions
            </button>
          </div>
        </>
      )}
    </div>
  );

  const activityTab = (
    <div className="space-y-4">
      {logsLoading ? (
        <div className="flex justify-center py-12"><Spin /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <Empty description="No activity recorded for this employee" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table
            dataSource={logs}
            columns={logColumns}
            rowKey="id"
            size="small"
            pagination={{
              current: activityPage,
              pageSize: 20,
              total: totalLogs,
              onChange: (p) => setActivityPage(p),
              showTotal: (total) => `${total} actions recorded`,
            }}
          />
        </div>
      )}
    </div>
  );

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span className="flex items-center gap-2">
          <UserOutlined />
          Profile
        </span>
      ),
      children: profileTab,
    },
    {
      key: 'permissions',
      label: (
        <span className="flex items-center gap-2">
          <SafetyOutlined />
          Permissions
          {permRows.length > 0 && (
            <Tag color="blue" className="text-xs ml-1">{permRows.length}</Tag>
          )}
        </span>
      ),
      children: permissionsTab,
    },
    {
      key: 'activity',
      label: (
        <span className="flex items-center gap-2">
          <HistoryOutlined />
          Activity Log
          {totalLogs > 0 && (
            <Tag color="purple" className="text-xs ml-1">{totalLogs}</Tag>
          )}
        </span>
      ),
      children: activityTab,
    },
  ];

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeftOutlined />
          <span className="text-sm">Back</span>
        </button>
        <span className="text-gray-300">/</span>
        <Text className="text-sm text-gray-500">Employees</Text>
        <span className="text-gray-300">/</span>
        <Text className="text-sm font-medium">{fullName}</Text>
      </div>

      <Tabs
        defaultActiveKey="profile"
        items={tabItems}
        className="employee-detail-tabs"
      />
    </div>
  );
}
