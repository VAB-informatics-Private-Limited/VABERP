'use client';

import { Button, Dropdown } from 'antd';
import { DownloadOutlined, FilePdfOutlined, PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';
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
      onClick: () => exportToPDF(data, filename, columns, title),
    },
    {
      key: 'print',
      label: 'Print',
      icon: <PrinterOutlined />,
      onClick: () => printData(data, columns, title),
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
