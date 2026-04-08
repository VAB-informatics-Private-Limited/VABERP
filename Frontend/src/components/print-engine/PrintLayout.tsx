'use client';

import React, { forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PrintHeader } from './PrintHeader';
import { PrintFooter } from './PrintFooter';
import { getPrintTemplateConfig } from '@/lib/api/print-templates';
import { PrintTemplateConfig, DEFAULT_PRINT_TEMPLATE } from '@/types/print-template';

interface PrintLayoutProps {
  children: React.ReactNode;
  /** Pass a draft config for live preview — bypasses the API query */
  configOverride?: PrintTemplateConfig;
  className?: string;
}

export const PrintLayout = forwardRef<HTMLDivElement, PrintLayoutProps>(
  ({ children, configOverride, className }, ref) => {
    const { data: fetchedConfig } = useQuery({
      queryKey: ['print-template-config'],
      queryFn: getPrintTemplateConfig,
      staleTime: 5 * 60 * 1000,
      enabled: !configOverride,
    });

    const config = configOverride ?? fetchedConfig ?? DEFAULT_PRINT_TEMPLATE;

    return (
      <div
        ref={ref}
        className={`bg-white p-8 print:p-0 ${className ?? ''}`}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <PrintHeader config={config} />
        <div className="print-body">{children}</div>
        <PrintFooter config={config} />
      </div>
    );
  },
);

PrintLayout.displayName = 'PrintLayout';
