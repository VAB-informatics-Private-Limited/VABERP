'use client';

import { DatePicker, Select, Button, Space } from 'antd';
import { ClearOutlined, DownloadOutlined, PrinterOutlined, MailOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getEmployees } from '@/lib/api/employees';
import { getSources } from '@/lib/api/sources';
import { useAuthStore } from '@/stores/authStore';
import { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface ReportFiltersProps {
  dateRange: [Dayjs | null, Dayjs | null] | null;
  onDateRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  employeeId?: number;
  onEmployeeChange?: (id: number | undefined) => void;
  source?: string;
  onSourceChange?: (source: string | undefined) => void;
  onClear: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  showEmployeeFilter?: boolean;
  showSourceFilter?: boolean;
  showExport?: boolean;
  showPrint?: boolean;
}

export function ReportFilters({
  dateRange,
  onDateRangeChange,
  employeeId,
  onEmployeeChange,
  source,
  onSourceChange,
  onClear,
  onExport,
  onPrint,
  showEmployeeFilter = true,
  showSourceFilter = false,
  showExport = true,
  showPrint = true,
}: ReportFiltersProps) {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data: employees } = useQuery({
    queryKey: ['employees', enterpriseId],
    queryFn: () => getEmployees(enterpriseId!),
    enabled: !!enterpriseId && showEmployeeFilter,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['sources'],
    queryFn: () => getSources(),
    enabled: showSourceFilter,
  });
  const sourceOptions = (sourcesData?.data || [])
    .filter((s) => s.is_active)
    .map((s) => ({ value: s.source_name, label: s.source_name }));

  return (
    <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
      <Space wrap>
        <RangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          format="DD-MM-YYYY"
          placeholder={['Start Date', 'End Date']}
        />

        {showEmployeeFilter && onEmployeeChange && (
          <Select
            placeholder="All Employees"
            value={employeeId}
            onChange={onEmployeeChange}
            style={{ width: 180 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {employees?.data?.map((emp) => (
              <Select.Option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </Select.Option>
            ))}
          </Select>
        )}

        {showSourceFilter && onSourceChange && (
          <Select
            placeholder="All Sources"
            value={source}
            onChange={onSourceChange}
            style={{ width: 150 }}
            allowClear
          >
            {sourceOptions.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        )}

        <Button icon={<ClearOutlined />} onClick={onClear}>
          Clear
        </Button>

        {showExport && onExport && (
          <Button icon={<DownloadOutlined />} onClick={onExport}>
            Export
          </Button>
        )}

        {showPrint && (
          <Button
            icon={<PrinterOutlined />}
            onClick={onPrint || (() => window.print())}
            className="print:hidden"
          >
            Print
          </Button>
        )}
      </Space>
    </div>
  );
}
