import React from 'react';
import { PrintTemplateConfig } from '@/types/print-template';

export function PrintFooter({ config }: { config: PrintTemplateConfig }) {
  if (!config.show_footer || !config.footer_text) return null;
  return (
    <div className="mt-8 pt-4 border-t border-gray-200 text-center">
      <p className="text-xs text-gray-500 whitespace-pre-line">{config.footer_text}</p>
    </div>
  );
}
