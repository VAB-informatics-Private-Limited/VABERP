import dayjs from 'dayjs';

export type ExportColumn<T> = { key: keyof T; title: string };

export interface ExportTemplateConfig {
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  company_name?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  logo_width?: number;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gst_number?: string | null;
  cin_number?: string | null;
  header_alignment?: 'left' | 'center' | 'right';
  show_logo?: boolean;
  show_tagline?: boolean;
  show_phone?: boolean;
  show_email?: boolean;
  show_gst?: boolean;
  show_footer?: boolean;
  footer_text?: string | null;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (typeof window === 'undefined') return url;
  if (url.startsWith('/')) return window.location.origin + url;
  return window.location.origin + '/' + url;
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[]
) {
  if (data.length === 0) {
    return;
  }

  // Create header row
  const headers = columns.map((col) => col.title).join(',');

  // Create data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Handle strings with commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',')
  );

  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function buildTableHTML<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  title: string,
  config?: ExportTemplateConfig,
): string {
  const primary   = config?.primary_color   || '#f97316';
  const alignment = config?.header_alignment || 'left';
  const dateStr   = dayjs().format('DD MMM YYYY, hh:mm A');

  const headerCells = columns.map((col) => `<th>${escHtml(col.title)}</th>`).join('');
  const bodyRows = data
    .map((item, idx) => {
      const cells = columns
        .map((col) => {
          const val = item[col.key];
          const txt = val !== null && val !== undefined ? String(val) : '-';
          return `<td>${escHtml(txt)}</td>`;
        })
        .join('');
      return `<tr class="${idx % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
    })
    .join('');

  // ── Left block: logo + company + tagline ───────────────────────────────────
  const logoHtml = config?.show_logo && config?.logo_url
    ? `<img src="${escHtml(absoluteUrl(config.logo_url))}" style="max-height:64px;max-width:${config.logo_width ?? 140}px;object-fit:contain;display:block;" />`
    : '';
  const companyHtml = config?.company_name
    ? `<div class="pdf-company">${escHtml(config.company_name)}</div>`
    : '';
  const taglineHtml = config?.show_tagline && config?.tagline
    ? `<div class="pdf-tagline">${escHtml(config.tagline)}</div>`
    : '';

  // ── Right block: address + phone + email + GST + CIN ───────────────────────
  const addressHtml = config?.address
    ? `<div class="pdf-addr">${escHtml(config.address)}</div>`
    : '';
  const contactRows: string[] = [];
  if (config?.show_phone && config?.phone) contactRows.push(`Ph: ${escHtml(config.phone)}`);
  if (config?.show_email && config?.email) contactRows.push(`Email: ${escHtml(config.email)}`);
  const contactHtml = contactRows.length
    ? `<div class="pdf-contact">${contactRows.join(' &nbsp;|&nbsp; ')}</div>`
    : '';
  const gstHtml = config?.show_gst && config?.gst_number
    ? `<div class="pdf-ident"><strong>GSTIN:</strong> ${escHtml(config.gst_number)}</div>`
    : '';
  const cinHtml = config?.cin_number
    ? `<div class="pdf-ident"><strong>CIN:</strong> ${escHtml(config.cin_number)}</div>`
    : '';

  const footerHtml = config?.show_footer && config?.footer_text
    ? `<div class="pdf-footer">${escHtml(config.footer_text)}</div>`
    : '';

  // Header layout: two-column (left identity / right contact) when there's content on both sides,
  // otherwise single column aligned per header_alignment.
  const hasRight = addressHtml || contactHtml || gstHtml || cinHtml;
  const leftHtml = `${logoHtml}${companyHtml}${taglineHtml}`;
  const rightHtml = `${addressHtml}${contactHtml}${gstHtml}${cinHtml}`;

  const headerBlock = hasRight
    ? `
      <div class="pdf-header-grid">
        <div class="pdf-header-left">${leftHtml}</div>
        <div class="pdf-header-right">${rightHtml}</div>
      </div>
    `
    : `
      <div class="pdf-header-single align-${alignment}">${leftHtml}</div>
    `;

  return `
    <div class="pdf-container">
      <div class="pdf-header">
        ${headerBlock}
        <div class="pdf-title-row">
          <h2 style="color:${primary}">${escHtml(title)}</h2>
          <p class="date">Generated on ${dateStr} &bull; Total Records: ${data.length}</p>
        </div>
      </div>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      ${footerHtml}
    </div>
  `;
}

function buildPdfStyles(primary = '#f97316', fontFamily = 'Arial, Helvetica, sans-serif'): string {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${fontFamily}; color: #1a1a1a; }
  .pdf-container { padding: 20px; }
  .pdf-header { margin-bottom: 14px; border-bottom: 2px solid ${primary}; padding-bottom: 10px; }
  .pdf-header-grid {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 10px;
  }
  .pdf-header-left  { flex: 1; min-width: 0; }
  .pdf-header-right { flex: 1; min-width: 0; text-align: right; }
  .pdf-header-single { margin-bottom: 10px; }
  .pdf-header-single.align-center { text-align: center; }
  .pdf-header-single.align-right  { text-align: right; }
  .pdf-company { font-size: 16px; font-weight: 700; color: #111; margin-top: 4px; }
  .pdf-tagline { font-size: 11px; color: #555; margin-top: 2px; font-style: italic; }
  .pdf-addr    { font-size: 11px; color: #444; white-space: pre-line; margin-bottom: 3px; }
  .pdf-contact { font-size: 11px; color: #444; margin-bottom: 3px; }
  .pdf-ident   { font-size: 11px; color: #333; }
  .pdf-title-row { padding-top: 4px; }
  .pdf-title-row h2 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .pdf-title-row .date { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background-color: ${primary}; color: #fff; font-weight: 600; text-align: left; padding: 7px 8px; white-space: nowrap; }
  td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; word-break: break-word; }
  tr.odd td { background-color: #fafafa; }
  tr.even td { background-color: #fff; }
  .pdf-footer {
    margin-top: 14px; padding-top: 8px;
    border-top: 1px solid #d1d5db;
    text-align: center; font-size: 11px; color: #6b7280;
    white-space: pre-line; line-height: 1.5;
  }
  @media print {
    .pdf-container { padding: 0; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
`;
}

/**
 * Export data to PDF file using html2pdf.js
 */
export async function exportToPDF<T extends object>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[],
  title: string,
  config?: ExportTemplateConfig,
) {
  if (data.length === 0) return;

  const html2pdf = (await import('html2pdf.js')).default;
  const primary = config?.primary_color || '#f97316';
  const font    = config?.font_family   || 'Arial, Helvetica, sans-serif';

  const container = document.createElement('div');
  container.innerHTML = `<style>${buildPdfStyles(primary, font)}</style>${buildTableHTML(data, columns, title, config)}`;
  document.body.appendChild(container);

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: `${filename}_${dayjs().format('YYYY-MM-DD')}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: columns.length > 6 ? 'landscape' as const : 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(opt as any).from(container).save();
  document.body.removeChild(container);
}

/**
 * Print data - opens browser print dialog with formatted table
 */
export function printData<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  title: string,
  config?: ExportTemplateConfig,
) {
  if (data.length === 0) return;

  const primary = config?.primary_color || '#f97316';
  const font    = config?.font_family   || 'Arial, Helvetica, sans-serif';
  const orientation = columns.length > 6 ? 'landscape' : 'portrait';
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escHtml(title)}</title>
      <style>
        @page { size: A4 ${orientation}; margin: 12mm; }
        ${buildPdfStyles(primary, font)}
      </style>
    </head>
    <body>
      ${buildTableHTML(data, columns, title, config)}
      <script>
        window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
