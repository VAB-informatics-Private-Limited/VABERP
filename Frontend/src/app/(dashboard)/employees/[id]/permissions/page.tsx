'use client';

import { Typography, Button, message, Spin, Tag, Modal } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  MailOutlined,
  TeamOutlined,
  IdcardOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  CalendarOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getEmployees, getEmployeePermissions, updateEmployeePermissions } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { PermissionsTable } from '@/components/employees/PermissionsTable';
import { MenuPermissions } from '@/types/auth';

const { Title, Text } = Typography;

type DataAccessChoice = 'all' | 'from_today';

export default function EmployeePermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [permissions, setPermissions] = useState<MenuPermissions>({});
  const [currentDataStartDate, setCurrentDataStartDate] = useState<string | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [dataAccessChoice, setDataAccessChoice] = useState<DataAccessChoice>('all');

  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const response = await getEmployees(enterpriseId!);
      return response.data?.find((e) => e.id === employeeId);
    },
    enabled: !!enterpriseId && !!employeeId,
  });

  const { data: permData, isLoading } = useQuery({
    queryKey: ['employee-permissions', employeeId],
    queryFn: () => getEmployeePermissions(employeeId),
    enabled: !!employeeId,
  });

  useEffect(() => {
    if (permData?.data) {
      setPermissions(permData.data.permissions as MenuPermissions);
      setCurrentDataStartDate(permData.data.dataStartDate ?? null);
      setDataAccessChoice(permData.data.dataStartDate ? 'from_today' : 'all');
    }
  }, [permData]);

  const mutation = useMutation({
    mutationFn: (dataStartDate: string | null) =>
      updateEmployeePermissions({
        employee_id: employeeId,
        enterprise_id: enterpriseId!,
        permissions,
        dataStartDate,
      }),
    onSuccess: (_, dataStartDate) => {
      setCurrentDataStartDate(dataStartDate);
      message.success('Permissions saved successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-permissions', employeeId] });
      setShowDataModal(false);
    },
    onError: () => {
      message.error('Failed to update permissions');
    },
  });

  const handleSaveClick = () => {
    setShowDataModal(true);
  };

  const handleDataModalConfirm = () => {
    const dataStartDate = dataAccessChoice === 'from_today' ? new Date().toISOString() : null;
    mutation.mutate(dataStartDate);
  };

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const options: { key: DataAccessChoice; icon: React.ReactNode; title: string; description: string; accent: string; bg: string; border: string }[] = [
    {
      key: 'all',
      icon: <HistoryOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
      title: 'Full Historical Access',
      description: 'Employee can view all existing records — including data created before today.',
      accent: '#1677ff',
      bg: '#e6f4ff',
      border: '#91caff',
    },
    {
      key: 'from_today',
      icon: <CalendarOutlined style={{ fontSize: 28, color: '#f59e0b' }} />,
      title: `Start Fresh from ${today}`,
      description: 'Employee will only see records created from today onwards. Past data stays hidden.',
      accent: '#f59e0b',
      bg: '#fffbeb',
      border: '#fcd34d',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/employees')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            Manage Permissions
          </Title>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSaveClick}
          loading={mutation.isPending}
          size="large"
        >
          Save Permissions
        </Button>
      </div>

      {/* Employee card */}
      {employee && (
        <div className="mb-5 p-4 bg-white rounded-xl border border-gray-100 card-shadow">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-500 text-xl">
              <UserOutlined />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base text-gray-800">
                {employee.first_name} {employee.last_name}
              </div>
              <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1"><MailOutlined /> {employee.email}</span>
                {employee.department_name && (
                  <span className="flex items-center gap-1"><TeamOutlined /> {employee.department_name}</span>
                )}
                {employee.designation_name && (
                  <span className="flex items-center gap-1"><IdcardOutlined /> {employee.designation_name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentDataStartDate ? (
                <Tag color="orange" icon={<CalendarOutlined />} className="!text-xs !py-0.5 !px-2">
                  Data from {new Date(currentDataStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Tag>
              ) : (
                <Tag color="blue" icon={<HistoryOutlined />} className="!text-xs !py-0.5 !px-2">
                  Full Data Access
                </Tag>
              )}
              <Tag color={employee.status === 'active' ? 'green' : 'red'} className="!text-xs !py-0.5 !px-2">
                {employee.status?.toUpperCase()}
              </Tag>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <Text type="secondary" className="text-sm">
          Configure granular permissions per sub-module. Each module controls access to its specific sub-modules and features.
        </Text>
      </div>

      <PermissionsTable permissions={permissions} onChange={setPermissions} />

      {/* Data Access Modal */}
      <Modal
        open={showDataModal}
        onCancel={() => setShowDataModal(false)}
        footer={null}
        width={520}
        centered
        closable
      >
        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-500">
            <DatabaseOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-base">Data Access Settings</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Choose what historical data{employee ? ` ${employee.first_name}` : ' this employee'} can see
            </div>
          </div>
        </div>

        {/* Option Cards */}
        <div className="flex flex-col gap-3 mb-5">
          {options.map((opt) => {
            const selected = dataAccessChoice === opt.key;
            return (
              <div
                key={opt.key}
                onClick={() => setDataAccessChoice(opt.key)}
                className="relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none"
                style={{
                  borderColor: selected ? opt.border : '#e5e7eb',
                  backgroundColor: selected ? opt.bg : '#fff',
                }}
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: selected ? '#fff' : '#f9fafb' }}
                >
                  {opt.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="font-semibold text-gray-800 text-sm">{opt.title}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.description}</div>
                </div>

                {/* Check badge */}
                {selected && (
                  <CheckCircleFilled
                    className="absolute top-3 right-3"
                    style={{ color: opt.accent, fontSize: 18 }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current setting note */}
        {currentDataStartDate && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100 mb-5">
            <CalendarOutlined className="text-amber-500 flex-shrink-0" />
            <span className="text-xs text-amber-700">
              Currently set to show data from{' '}
              <strong>
                {new Date(currentDataStartDate).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </strong>{' '}
              onwards. Changing this takes effect immediately.
            </span>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-1">
          <Button onClick={() => setShowDataModal(false)} size="large">
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={handleDataModalConfirm}
            loading={mutation.isPending}
          >
            Save Permissions
          </Button>
        </div>
      </Modal>
    </div>
  );
}
