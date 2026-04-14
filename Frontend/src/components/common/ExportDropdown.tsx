'use client';

import { Button, Dropdown } from 'antd';
import { DownloadOutlined, FilePdfOutlined, PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPrintTemplateConfig } from '@/lib/api/print-templates';
import { exportToCSV, exportToPDF, printData, ExportColumn } from '@/lib/utils/export';

interface ExportDropdownProps<T extends object> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title: string;
  disabled?: boolean;
}

export default function ExportDropdown<T extends object>({
  data,
  columns,
  filename,
  title,
  disabled = false,
}: ExportDropdownProps<T>) {
  const { data: templateConfig } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
    staleTime: 5 * 60 * 1000,
  });

  const config = templateConfig
    ? {
        primary_color: templateConfig.primary_color,
        company_name:  templateConfig.company_name ?? undefined,
        logo_url:      templateConfig.logo_url ?? null,
        show_logo:     templateConfig.show_logo,
      }
    : undefined;

  const items = [
    {
      key: 'csv',
      label: 'Download CSV',
      icon: <FileExcelOutlined />,
      onClick: () => exportToCSV(data, filename, columns),
    },
    {
      key: 'pdf',
      label: 'Download PDF',
      icon: <FilePdfOutlined />,
      onClick: () => exportToPDF(data, filename, columns, title, config),
    },
    {
      key: 'print',
      label: 'Print',
      icon: <PrinterOutlined />,
      onClick: () => printData(data, columns, title, config),
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} disabled={disabled}>
      <Button icon={<DownloadOutlined />}>
        Export / Print
      </Button>
    </Dropdown>
  );
}
