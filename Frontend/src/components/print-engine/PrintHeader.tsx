import React from 'react';
import { PrintTemplateConfig } from '@/types/print-template';

interface PrintHeaderProps {
  config: PrintTemplateConfig;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://64.235.43.187:2261';

export function PrintHeader({ config }: PrintHeaderProps) {
  const isCompact = config.header_style === 'compact';
  const align = config.header_alignment ?? 'left';

  const textAlignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const flexJustify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const isCenter = align === 'center';
  const isRight = align === 'right';

  const logoUrl = config.logo_url
    ? config.logo_url.startsWith('http')
      ? config.logo_url
      : `${API_URL}${config.logo_url}`
    : null;

  return (
    <div
      className={`flex ${isCenter ? 'flex-col items-center' : isRight ? 'flex-row-reverse' : 'flex-row'} gap-4 pb-4 border-b border-gray-300 mb-6`}
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* Logo */}
      {config.show_logo && logoUrl && (
        <div className="flex-shrink-0">
          <img
            src={logoUrl}
            alt="Company Logo"
            style={{ width: config.logo_width ?? 120, maxHeight: 80, objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Company Info */}
      <div className={`flex flex-col ${isCenter ? 'items-center' : isRight ? 'items-end' : 'items-start'} flex-1`}>
        <h1 className={`font-bold text-gray-900 ${isCompact ? 'text-base' : 'text-xl'} ${textAlignClass}`}>
          {config.company_name || 'Company Name'}
        </h1>

        {config.show_tagline && config.tagline && (
          <p className={`text-xs text-gray-500 italic mt-0.5 ${textAlignClass}`}>{config.tagline}</p>
        )}

        {!isCompact && config.address && (
          <p className={`text-xs text-gray-600 mt-1 whitespace-pre-line max-w-xs ${textAlignClass}`}>
            {config.address}
          </p>
        )}

        <div className={`flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 ${flexJustify}`}>
          {config.show_phone && config.phone && (
            <span className="text-xs text-gray-600">Ph: {config.phone}</span>
          )}
          {config.show_email && config.email && (
            <span className="text-xs text-gray-600">Email: {config.email}</span>
          )}
          {config.show_gst && config.gst_number && (
            <span className="text-xs text-gray-700 font-medium">GSTIN: {config.gst_number}</span>
          )}
          {config.cin_number && (
            <span className="text-xs text-gray-600">CIN: {config.cin_number}</span>
          )}
        </div>
      </div>
    </div>
  );
}
