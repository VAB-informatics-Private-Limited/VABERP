import dayjs from 'dayjs';

export type ExportColumn<T> = { key: keyof T; title: string };

export interface ExportTemplateConfig {
  primary_color?: string;
  company_name?: string;
  logo_url?: string | null;
  show_logo?: boolean;
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
  const primary = config?.primary_color || '#f97316';
  const dateStr = dayjs().format('DD MMM YYYY, hh:mm A');
  const headerCells = columns.map((col) => `<th>${col.title}</th>`).join('');
  const bodyRows = data
    .map((item, idx) => {
      const cells = columns
        .map((col) => {
          const val = item[col.key];
          return `<td>${val !== null && val !== undefined ? String(val) : '-'}</td>`;
        })
        .join('');
      return `<tr class="${idx % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
    })
    .join('');

  const logoHtml = config?.show_logo && config?.logo_url
    ? `<img src="${config.logo_url}" style="max-height:48px;max-width:120px;object-fit:contain;display:block;margin-bottom:6px;" />`
    : '';
  const companyHtml = config?.company_name
    ? `<div style="font-size:15px;font-weight:700;color:#111;margin-bottom:2px;">${config.company_name}</div>`
    : '';

  return `
    <div class="pdf-container">
      <div class="pdf-header">
        ${logoHtml}
        ${companyHtml}
        <h2 style="color:${primary}">${title}</h2>
        <p class="date">Generated on ${dateStr} &bull; Total Records: ${data.length}</p>
      </div>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function buildPdfStyles(primary = '#f97316'): string {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
  .pdf-container { padding: 20px; }
  .pdf-header { margin-bottom: 16px; border-bottom: 2px solid ${primary}; padding-bottom: 10px; }
  .pdf-header h2 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .pdf-header .date { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background-color: ${primary}; color: #fff; font-weight: 600; text-align: left; padding: 7px 8px; white-space: nowrap; }
  td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; word-break: break-word; }
  tr.odd td { background-color: #fafafa; }
  tr.even td { background-color: #fff; }
  @media print {
    .pdf-container { padding: 0; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
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

  const container = document.createElement('div');
  container.innerHTML = `<style>${buildPdfStyles(primary)}</style>${buildTableHTML(data, columns, title, config)}`;
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
  const orientation = columns.length > 6 ? 'landscape' : 'portrait';
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4 ${orientation}; margin: 12mm; }
        ${buildPdfStyles(primary)}
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
