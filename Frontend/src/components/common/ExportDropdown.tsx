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
        primary_color:    templateConfig.primary_color,
        secondary_color:  templateConfig.secondary_color,
        font_family:      templateConfig.font_family,
        company_name:     templateConfig.company_name ?? undefined,
        tagline:          templateConfig.tagline ?? undefined,
        logo_url:         templateConfig.logo_url ?? null,
        logo_width:       templateConfig.logo_width,
        address:          templateConfig.address ?? undefined,
        phone:            templateConfig.phone ?? undefined,
        email:            templateConfig.email ?? undefined,
        gst_number:       templateConfig.gst_number ?? undefined,
        cin_number:       templateConfig.cin_number ?? undefined,
        header_alignment: templateConfig.header_alignment,
        show_logo:        templateConfig.show_logo,
        show_tagline:     templateConfig.show_tagline,
        show_phone:       templateConfig.show_phone,
        show_email:       templateConfig.show_email,
        show_gst:         templateConfig.show_gst,
        show_footer:      templateConfig.show_footer,
        footer_text:      templateConfig.footer_text ?? undefined,
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
